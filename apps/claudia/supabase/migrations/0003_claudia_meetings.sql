-- ════════════════════════════════════════════════════════════════════════
--  ClaudIA — 0003_claudia_meetings.sql · meeting notes (ciphertext-only)  §6
--
--  §0 INVARIANT holds exactly as in 0001: with the service_role key + a full
--  dump + every backup, an attacker recovers ZERO bytes of any transcript or
--  note. Every content column here is bytea ciphertext written under a per-
--  meeting DEK the server never holds. RLS is owner-only defense-in-depth, NOT
--  the confidentiality boundary (service_role bypasses RLS).
--
--  Privacy posture of the feature this backs:
--    • TRANSCRIPTION is on-device (Whisper WASM in the browser). Raw audio and
--      raw transcript never leave the device. Only the encrypted transcript
--      segments land here.
--    • SYNTHESIS (turning transcript → notes) uses the same blind no-log relay
--      ClaudIA's chat uses (private cloud · Anthropic ZDR). The decrypted
--      transcript is sent for that one call and nothing is stored upstream.
--      The resulting digest is re-encrypted client-side before it lands here.
--
--  Each meeting reuses the existing per-conversation DEK machinery from 0001:
--  claudia_wrapped_deks keyed by conversation_id = meeting id. No new key path.
--
--  All FK to public.flowbond_users(id) = the FBID root = auth.uid() (§1).
--  Apply to a Supabase DEV BRANCH off fgsrcxxccdjqyrpkitmk; validate; merge.
--  NEVER touch the stale eoajujwpdkfuicnoxetk.
-- ════════════════════════════════════════════════════════════════════════

-- ── meetings (title encrypted iff present; source/status are plaintext meta) ─
create table if not exists claudia_meetings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references flowbond_users(id) on delete cascade,
  app         text not null default 'flowme',
  source      text not null default 'mic' check (source in ('mic','tab','both')),
  status      text not null default 'recording' check (status in ('recording','ended')),
  title_ct    bytea,                                   -- encrypted iff present
  title_nonce bytea,
  dek_id      uuid not null,                           -- = claudia_wrapped_deks.id for this meeting
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists claudia_meetings_user_idx on claudia_meetings(user_id, started_at desc);

-- ── transcript segments (content encrypted; idx + t_offset are timing only) ──
create table if not exists claudia_meeting_segments (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references claudia_meetings(id) on delete cascade,
  user_id    uuid not null references flowbond_users(id) on delete cascade,
  idx        int not null,                             -- ordering within the meeting
  t_offset   numeric not null default 0,               -- seconds from start (timing only)
  ciphertext bytea not null,                           -- {text, speaker?} JSON, encrypted
  nonce      bytea not null,
  dek_id     uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists claudia_meeting_segments_idx
  on claudia_meeting_segments(meeting_id, idx);

-- ── synthesized notes digest (one per meeting · encrypted JSON) ────────────
create table if not exists claudia_meeting_notes (
  meeting_id uuid primary key references claudia_meetings(id) on delete cascade,
  user_id    uuid not null references flowbond_users(id) on delete cascade,
  ciphertext bytea not null,                           -- digest JSON, encrypted
  nonce      bytea not null,
  dek_id     uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════
--  RLS — owner-only on every new table (defense-in-depth, not the ZK boundary)
-- ════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'claudia_meetings','claudia_meeting_segments','claudia_meeting_notes'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format(
      'create policy %I on %I using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_owner', t
    );
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════════════
--  Atomic RPCs (SECURITY DEFINER · set search_path = public)
--  base64 text in/out so the client never handles bytea wire-format; bytea
--  stays at rest. Every write/read is scoped to auth.uid().
-- ════════════════════════════════════════════════════════════════════════

-- create a meeting. The client generates the meeting id first, wraps a fresh DEK
-- under it via claudia_ensure_wrapped_dek (conversation_id = p_id), then calls
-- this with that same id + the returned dek_id — so the meeting's content key
-- exists before any segment is written. --
create or replace function claudia_create_meeting(p_id uuid, p_source text, p_dek_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  insert into claudia_meetings(id, user_id, source, dek_id)
  values (coalesce(p_id, gen_random_uuid()), auth.uid(), coalesce(nullif(p_source,''),'mic'), p_dek_id)
  returning id into mid;
  return mid;
end $$;

-- append a transcript segment ------------------------------------------------
create or replace function claudia_save_meeting_segment(
  p_meeting_id uuid, p_idx int, p_t_offset numeric,
  p_ciphertext text, p_nonce text, p_dek_id uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  -- guard: only append to a meeting the caller owns
  if not exists (select 1 from claudia_meetings where id = p_meeting_id and user_id = auth.uid()) then
    raise exception 'not-owner';
  end if;
  insert into claudia_meeting_segments(meeting_id, user_id, idx, t_offset, ciphertext, nonce, dek_id)
  values (p_meeting_id, auth.uid(), p_idx, coalesce(p_t_offset,0),
          decode(p_ciphertext,'base64'), decode(p_nonce,'base64'), p_dek_id)
  returning id into sid;
  return sid;
end $$;

create or replace function claudia_meeting_segments(p_meeting_id uuid)
returns table(idx int, t_offset numeric, ciphertext text, nonce text)
language sql security definer set search_path = public as $$
  select idx, t_offset, encode(ciphertext,'base64'), encode(nonce,'base64')
  from claudia_meeting_segments
  where user_id = auth.uid() and meeting_id = p_meeting_id
  order by idx asc;
$$;

-- end a meeting, optionally sealing an encrypted title -----------------------
create or replace function claudia_end_meeting(
  p_meeting_id uuid, p_title_ct text default null, p_title_nonce text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  update claudia_meetings
     set status = 'ended',
         ended_at = now(),
         title_ct = case when p_title_ct is null then title_ct else decode(p_title_ct,'base64') end,
         title_nonce = case when p_title_nonce is null then title_nonce else decode(p_title_nonce,'base64') end
   where id = p_meeting_id and user_id = auth.uid();
end $$;

-- upsert the synthesized notes digest (one row per meeting) ------------------
create or replace function claudia_save_meeting_notes(
  p_meeting_id uuid, p_ciphertext text, p_nonce text, p_dek_id uuid
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from claudia_meetings where id = p_meeting_id and user_id = auth.uid()) then
    raise exception 'not-owner';
  end if;
  insert into claudia_meeting_notes(meeting_id, user_id, ciphertext, nonce, dek_id)
  values (p_meeting_id, auth.uid(), decode(p_ciphertext,'base64'), decode(p_nonce,'base64'), p_dek_id)
  on conflict (meeting_id) do update set
    ciphertext = excluded.ciphertext, nonce = excluded.nonce,
    dek_id = excluded.dek_id, updated_at = now();
end $$;

create or replace function claudia_get_meeting_notes(p_meeting_id uuid)
returns table(ciphertext text, nonce text)
language sql security definer set search_path = public as $$
  select encode(ciphertext,'base64'), encode(nonce,'base64')
  from claudia_meeting_notes
  where user_id = auth.uid() and meeting_id = p_meeting_id;
$$;

-- list meetings (encrypted title returned so the client can decrypt it) ------
create or replace function claudia_list_meetings()
returns table(
  id uuid, source text, status text, title_ct text, title_nonce text,
  started_at timestamptz, ended_at timestamptz, has_notes boolean
)
language sql security definer set search_path = public as $$
  select m.id, m.source, m.status,
         encode(m.title_ct,'base64'), encode(m.title_nonce,'base64'),
         m.started_at, m.ended_at,
         exists(select 1 from claudia_meeting_notes n where n.meeting_id = m.id) as has_notes
  from claudia_meetings m
  where m.user_id = auth.uid()
  order by m.started_at desc;
$$;

create or replace function claudia_delete_meeting(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from claudia_meetings where id = p_id and user_id = auth.uid();
end $$;

-- ════════════════════════════════════════════════════════════════════════
--  Grants — user RPCs to authenticated only.
-- ════════════════════════════════════════════════════════════════════════
do $$
declare fn text;
begin
  foreach fn in array array[
    'claudia_create_meeting(uuid,text,uuid)',
    'claudia_save_meeting_segment(uuid,int,numeric,text,text,uuid)',
    'claudia_meeting_segments(uuid)',
    'claudia_end_meeting(uuid,text,text)',
    'claudia_save_meeting_notes(uuid,text,text,uuid)',
    'claudia_get_meeting_notes(uuid)',
    'claudia_list_meetings()',
    'claudia_delete_meeting(uuid)'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
