-- ════════════════════════════════════════════════════════════════════════
--  ClaudIA — 0001_claudia.sql · ciphertext-only schema  (master spec §6)
--
--  §0 INVARIANT: with the service_role key + a full dump + every backup, an
--  attacker recovers ZERO bytes of any message, task, or care content. Every
--  content column below is bytea ciphertext written under a key the server
--  never holds. RLS is owner-only DEFENSE-IN-DEPTH — NOT the confidentiality
--  boundary (service_role bypasses RLS; confidentiality is cryptographic).
--
--  All FK to public.flowbond_users(id) = the FBID root = auth.uid() (§1).
--  Apply to a Supabase DEV BRANCH off fgsrcxxccdjqyrpkitmk; validate §10; merge.
--  NEVER touch the stale eoajujwpdkfuicnoxetk.
-- ════════════════════════════════════════════════════════════════════════

-- ── threads + messages ────────────────────────────────────────────────────
create table if not exists claudia_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references flowbond_users(id) on delete cascade,
  app         text not null default 'flowme',
  title_ct    bytea,                                   -- encrypted iff present
  title_nonce bytea,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists claudia_threads_user_idx on claudia_threads(user_id, updated_at desc);

create table if not exists claudia_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references claudia_threads(id) on delete cascade,
  user_id    uuid not null references flowbond_users(id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  ciphertext bytea not null,
  nonce      bytea not null,
  dek_id     uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists claudia_messages_thread_idx on claudia_messages(thread_id, created_at);

-- ── wrapped per-conversation DEKs (opaque to server) ──────────────────────
create table if not exists claudia_wrapped_deks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references flowbond_users(id) on delete cascade,
  conversation_id uuid not null,                       -- = thread id
  wrapped_dek     bytea not null,                      -- DEK sealed under KEK
  created_at      timestamptz not null default now(),
  unique (user_id, conversation_id)
);

-- ── factor-sealed key material (server CANNOT open) ───────────────────────
create table if not exists claudia_key_shares (
  user_id      uuid not null references flowbond_users(id) on delete cascade,
  factor       text not null,                          -- passkey|hwkey|wallet|recovery|enclave2
  sealed_share bytea not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, factor)
);

-- ── consent receipts (append-only · FACTS ONLY, no content) ───────────────
create table if not exists claudia_consent_receipts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references flowbond_users(id) on delete cascade,
  scope      text not null,
  purpose    text not null,
  signature  bytea not null,
  factor_set text[] not null,
  created_at timestamptz not null default now()
);

-- ── tasks she readies (content encrypted; venture is plaintext metadata) ──
create table if not exists claudia_tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references flowbond_users(id) on delete cascade,
  venture    text not null default 'FlowBond',
  ciphertext bytea not null,                           -- {title, ready} JSON, encrypted
  nonce      bytea not null,
  dek_id     uuid not null,
  status     text not null default 'open' check (status in ('open','done','archived')),
  due_at     timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists claudia_tasks_user_idx on claudia_tasks(user_id, status, due_at);

-- ── care log (kind + timing ONLY · never free text) ───────────────────────
create table if not exists claudia_care_log (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references flowbond_users(id) on delete cascade,
  kind      text not null check (kind in ('meal','water','rest','move','breath')),
  logged_at timestamptz not null default now()
);
create index if not exists claudia_care_log_user_idx on claudia_care_log(user_id, kind, logged_at desc);

create table if not exists claudia_care_prefs (
  user_id     uuid primary key references flowbond_users(id) on delete cascade,
  enabled     boolean not null default true,
  meal_hours  numeric not null default 4,
  water_hours numeric not null default 1.5,
  rest_hours  numeric not null default 2.5,
  quiet_start int not null default 22,
  quiet_end   int not null default 8,
  tz          text not null default 'America/Mexico_City'
);

-- ── nudge outbox (kind + timing ONLY · copy rendered client-side) ─────────
create table if not exists claudia_nudges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references flowbond_users(id) on delete cascade,
  kind       text not null,
  delivered  boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists claudia_nudges_user_idx on claudia_nudges(user_id, delivered, created_at);

-- ════════════════════════════════════════════════════════════════════════
--  RLS — owner-only on every table (defense-in-depth, not the ZK boundary)
-- ════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'claudia_threads','claudia_messages','claudia_wrapped_deks','claudia_key_shares',
    'claudia_consent_receipts','claudia_tasks','claudia_care_log','claudia_care_prefs','claudia_nudges'
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
--  All speak base64 text so the client never handles bytea wire-format;
--  bytea stays at rest. Every write/read is scoped to auth.uid().
-- ════════════════════════════════════════════════════════════════════════

-- threads -------------------------------------------------------------------
create or replace function claudia_get_or_create_thread(p_app text default 'flowme')
returns uuid language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  select id into tid from claudia_threads
   where user_id = auth.uid() and app = p_app
   order by updated_at desc limit 1;
  if tid is null then
    insert into claudia_threads(user_id, app) values (auth.uid(), p_app) returning id into tid;
  end if;
  return tid;
end $$;

-- wrapped DEK (one per conversation) ----------------------------------------
create or replace function claudia_ensure_wrapped_dek(p_conversation_id uuid, p_wrapped_dek text)
returns uuid language plpgsql security definer set search_path = public as $$
declare did uuid;
begin
  select id into did from claudia_wrapped_deks
   where user_id = auth.uid() and conversation_id = p_conversation_id;
  if did is null then
    insert into claudia_wrapped_deks(user_id, conversation_id, wrapped_dek)
    values (auth.uid(), p_conversation_id, decode(p_wrapped_dek,'base64'))
    returning id into did;
  end if;
  return did;
end $$;

create or replace function claudia_get_wrapped_dek(p_conversation_id uuid)
returns table(dek_id uuid, wrapped_dek text)
language sql security definer set search_path = public as $$
  select id, encode(wrapped_dek,'base64')
  from claudia_wrapped_deks
  where user_id = auth.uid() and conversation_id = p_conversation_id;
$$;

-- messages ------------------------------------------------------------------
create or replace function claudia_save_message(
  p_thread_id uuid, p_role text, p_ciphertext text, p_nonce text, p_dek_id uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  insert into claudia_messages(thread_id, user_id, role, ciphertext, nonce, dek_id)
  values (p_thread_id, auth.uid(), p_role, decode(p_ciphertext,'base64'), decode(p_nonce,'base64'), p_dek_id)
  returning id into mid;
  update claudia_threads set updated_at = now() where id = p_thread_id and user_id = auth.uid();
  return mid;
end $$;

create or replace function claudia_thread_messages(p_thread_id uuid)
returns table(id uuid, role text, ciphertext text, nonce text, dek_id uuid, created_at timestamptz)
language sql security definer set search_path = public as $$
  select id, role, encode(ciphertext,'base64'), encode(nonce,'base64'), dek_id, created_at
  from claudia_messages
  where user_id = auth.uid() and thread_id = p_thread_id
  order by created_at asc;
$$;

-- tasks ---------------------------------------------------------------------
create or replace function claudia_capture_task(
  p_ciphertext text, p_nonce text, p_dek_id uuid, p_venture text, p_due timestamptz default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  insert into claudia_tasks(user_id, venture, ciphertext, nonce, dek_id, due_at)
  values (auth.uid(), coalesce(p_venture,'FlowBond'), decode(p_ciphertext,'base64'), decode(p_nonce,'base64'), p_dek_id, p_due)
  returning id into r;
  return r;
end $$;

create or replace function claudia_my_tasks()
returns table(id uuid, venture text, ciphertext text, nonce text, dek_id uuid, status text, due_at timestamptz, created_at timestamptz)
language sql security definer set search_path = public as $$
  select id, venture, encode(ciphertext,'base64'), encode(nonce,'base64'), dek_id, status, due_at, created_at
  from claudia_tasks
  where user_id = auth.uid() and status <> 'archived'
  order by created_at desc;
$$;

create or replace function claudia_set_task_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update claudia_tasks set status = p_status where id = p_id and user_id = auth.uid();
end $$;

-- key shares (factor-sealed MS) ---------------------------------------------
create or replace function claudia_save_key_shares(p_shares jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare s jsonb;
begin
  for s in select * from jsonb_array_elements(p_shares) loop
    insert into claudia_key_shares(user_id, factor, sealed_share)
    values (auth.uid(), s->>'factor', decode(s->>'sealed_share','base64'))
    on conflict (user_id, factor) do update set sealed_share = excluded.sealed_share;
  end loop;
end $$;

create or replace function claudia_my_key_shares()
returns table(factor text, sealed_share text)
language sql security definer set search_path = public as $$
  select factor, encode(sealed_share,'base64')
  from claudia_key_shares where user_id = auth.uid();
$$;

-- care ----------------------------------------------------------------------
create or replace function claudia_log_care(p_kind text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into claudia_care_log(user_id, kind) values (auth.uid(), p_kind);
  -- logging care clears the matching pending nudge, in one shot
  update claudia_nudges set delivered = true
   where user_id = auth.uid() and kind = p_kind and not delivered;
end $$;

create or replace function claudia_care_state()
returns table(kind text, last_logged timestamptz)
language sql security definer set search_path = public as $$
  select kind, max(logged_at) from claudia_care_log
  where user_id = auth.uid() group by kind;
$$;

create or replace function claudia_get_care_prefs()
returns claudia_care_prefs language plpgsql security definer set search_path = public as $$
declare p claudia_care_prefs;
begin
  select * into p from claudia_care_prefs where user_id = auth.uid();
  if not found then
    insert into claudia_care_prefs(user_id) values (auth.uid()) returning * into p;
  end if;
  return p;
end $$;

create or replace function claudia_set_care_prefs(
  p_enabled boolean, p_meal numeric, p_water numeric, p_rest numeric,
  p_quiet_start int, p_quiet_end int, p_tz text
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into claudia_care_prefs(user_id, enabled, meal_hours, water_hours, rest_hours, quiet_start, quiet_end, tz)
  values (auth.uid(), p_enabled, p_meal, p_water, p_rest, p_quiet_start, p_quiet_end, p_tz)
  on conflict (user_id) do update set
    enabled = excluded.enabled, meal_hours = excluded.meal_hours, water_hours = excluded.water_hours,
    rest_hours = excluded.rest_hours, quiet_start = excluded.quiet_start, quiet_end = excluded.quiet_end, tz = excluded.tz;
end $$;

create or replace function claudia_my_nudges()
returns setof claudia_nudges language sql security definer set search_path = public as $$
  select * from claudia_nudges where user_id = auth.uid() and not delivered order by created_at desc;
$$;

-- ════════════════════════════════════════════════════════════════════════
--  Care engine core: evaluate thresholds, respect quiet hours, dedupe, emit.
--  Called by the claudia-watch edge function (service_role) on pg_cron.
--  Emits ONLY (kind + timing) — never any text. Copy is rendered client-side.
-- ════════════════════════════════════════════════════════════════════════
create or replace function claudia_due_nudges()
returns setof claudia_nudges language plpgsql security definer set search_path = public as $$
declare
  p          claudia_care_prefs;
  k          text;
  kinds      text[] := array['meal','water','rest'];
  thresh_h   numeric;
  last_at    timestamptz;
  local_hour int;
  quiet      boolean;
  newrow     claudia_nudges;
begin
  for p in select * from claudia_care_prefs where enabled loop
    local_hour := extract(hour from (now() at time zone p.tz))::int;
    -- quiet hours, handling midnight wraparound (e.g. 22 → 8)
    quiet := case
      when p.quiet_start <= p.quiet_end
        then local_hour >= p.quiet_start and local_hour < p.quiet_end
      else local_hour >= p.quiet_start or local_hour < p.quiet_end
    end;
    if quiet then continue; end if;

    foreach k in array kinds loop
      thresh_h := case k when 'meal' then p.meal_hours when 'water' then p.water_hours else p.rest_hours end;
      select max(logged_at) into last_at from claudia_care_log where user_id = p.user_id and kind = k;
      if last_at is null or last_at < now() - make_interval(mins => (thresh_h * 60)::int) then
        -- dedupe: at most one undelivered nudge per kind
        if not exists (
          select 1 from claudia_nudges where user_id = p.user_id and kind = k and not delivered
        ) then
          insert into claudia_nudges(user_id, kind) values (p.user_id, k) returning * into newrow;
          return next newrow;
        end if;
      end if;
    end loop;
  end loop;
  return;
end $$;

-- ════════════════════════════════════════════════════════════════════════
--  Grants — user RPCs to authenticated; the scheduler fn to service_role only.
-- ════════════════════════════════════════════════════════════════════════
do $$
declare fn text;
begin
  foreach fn in array array[
    'claudia_get_or_create_thread(text)',
    'claudia_ensure_wrapped_dek(uuid,text)',
    'claudia_get_wrapped_dek(uuid)',
    'claudia_save_message(uuid,text,text,text,uuid)',
    'claudia_thread_messages(uuid)',
    'claudia_capture_task(text,text,uuid,text,timestamptz)',
    'claudia_my_tasks()',
    'claudia_set_task_status(uuid,text)',
    'claudia_save_key_shares(jsonb)',
    'claudia_my_key_shares()',
    'claudia_log_care(text)',
    'claudia_care_state()',
    'claudia_get_care_prefs()',
    'claudia_set_care_prefs(boolean,numeric,numeric,numeric,int,int,text)',
    'claudia_my_nudges()'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

revoke all on function claudia_due_nudges() from public, anon, authenticated;
grant execute on function claudia_due_nudges() to service_role;
