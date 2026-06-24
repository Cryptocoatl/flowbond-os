-- ════════════════════════════════════════════════════════════════════════
--  ClaudIA — 0005_claudia_room_content.sql · shared recap content  (§0 groups)
--
--  The content that lives inside a group-ZK room. For now: the shared meeting
--  recap (the digest), encrypted under the room key (RK) from 0004. The server
--  stores only ciphertext; only members (who can unwrap RK) can read it.
--
--  RLS is owner/member defense-in-depth; confidentiality stays cryptographic.
--  Apply to a Supabase DEV BRANCH off fgsrcxxccdjqyrpkitmk; validate; merge.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists claudia_room_recap (
  room_id    uuid primary key references claudia_rooms(id) on delete cascade,
  ciphertext bytea not null,                       -- digest JSON, encrypted under RK
  nonce      bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table claudia_room_recap enable row level security;
drop policy if exists claudia_room_recap_access on claudia_room_recap;
create policy claudia_room_recap_access on claudia_room_recap
  using (
    exists (select 1 from claudia_rooms r where r.id = room_id and r.owner_id = auth.uid())
    or exists (select 1 from claudia_room_keys k where k.room_id = room_id and k.member_id = auth.uid())
  )
  with check (
    exists (select 1 from claudia_rooms r where r.id = room_id and r.owner_id = auth.uid())
  );

-- ── RPCs ────────────────────────────────────────────────────────────────────

-- owner writes the encrypted recap into the room (upsert)
create or replace function claudia_save_room_recap(p_room_id uuid, p_ciphertext text, p_nonce text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from claudia_rooms where id = p_room_id and owner_id = auth.uid()) then
    raise exception 'not-room-owner';
  end if;
  insert into claudia_room_recap(room_id, ciphertext, nonce)
  values (p_room_id, decode(p_ciphertext,'base64'), decode(p_nonce,'base64'))
  on conflict (room_id) do update set
    ciphertext = excluded.ciphertext, nonce = excluded.nonce, updated_at = now();
end $$;

-- owner OR member reads it (still encrypted; they decrypt with RK client-side)
create or replace function claudia_get_room_recap(p_room_id uuid)
returns table(ciphertext text, nonce text)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from claudia_rooms r where r.id = p_room_id and r.owner_id = auth.uid())
     and not exists (select 1 from claudia_room_keys k where k.room_id = p_room_id and k.member_id = auth.uid())
  then
    raise exception 'not-room-member';
  end if;
  return query
    select encode(rr.ciphertext,'base64'), encode(rr.nonce,'base64')
    from claudia_room_recap rr where rr.room_id = p_room_id;
end $$;

-- list member FBIDs of a room (owner or member may see who's in)
create or replace function claudia_room_members(p_room_id uuid)
returns table(member_id uuid)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from claudia_rooms r where r.id = p_room_id and r.owner_id = auth.uid())
     and not exists (select 1 from claudia_room_keys k where k.room_id = p_room_id and k.member_id = auth.uid())
  then
    raise exception 'not-room-member';
  end if;
  return query
    select k.member_id from claudia_room_keys k where k.room_id = p_room_id;
end $$;

-- ── Grants ────────────────────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'claudia_save_room_recap(uuid,text,text)',
    'claudia_get_room_recap(uuid)',
    'claudia_room_members(uuid)'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
