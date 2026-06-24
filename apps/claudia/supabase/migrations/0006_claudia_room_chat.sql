-- ════════════════════════════════════════════════════════════════════════
--  ClaudIA — 0006_claudia_room_chat.sql · room chat + invite links  (§0 groups)
--
--  Two additions to the group-ZK rooms from 0004/0005:
--
--   1. claudia_room_messages — the wired private chat. Each message is
--      encrypted under the room key (RK); only members (who can unwrap RK) read
--      it. sender_id is plaintext metadata (WHO, never WHAT).
--
--   2. claudia_room_invites — share-by-link. The invite row stores RK sealed
--      under a random LINK KEY. The link key lives ONLY in the URL fragment
--      (after '#'), which browsers never transmit — so the server stores a blob
--      it cannot open. Redeeming presents the token; the browser unwraps RK with
--      the fragment key and then self-adds a normal per-member room_keys row.
--      Bearer semantics by design (anyone with the full link can join), bounded
--      by expiry / max_uses / revoke.
--
--  RLS is owner/member defense-in-depth; confidentiality stays cryptographic.
--  Apply to a Supabase DEV BRANCH off fgsrcxxccdjqyrpkitmk; validate; merge.
--  Depends on 0004 (claudia_rooms, claudia_room_keys).
-- ════════════════════════════════════════════════════════════════════════

create table if not exists claudia_room_messages (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references claudia_rooms(id) on delete cascade,
  sender_id  uuid not null references flowbond_users(id) on delete cascade,
  ciphertext bytea not null,                       -- message text, encrypted under RK
  nonce      bytea not null,
  created_at timestamptz not null default now()
);
create index if not exists claudia_room_messages_idx on claudia_room_messages(room_id, created_at);

create table if not exists claudia_room_invites (
  token         uuid primary key default gen_random_uuid(),
  room_id       uuid not null references claudia_rooms(id) on delete cascade,
  wrapped_ct    bytea not null,                    -- RK sealed under the link key (server-blind)
  wrapped_nonce bytea not null,
  created_by    uuid not null references flowbond_users(id) on delete cascade,
  expires_at    timestamptz,
  max_uses      int,                                -- null = unlimited
  uses          int not null default 0,
  revoked       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists claudia_room_invites_room_idx on claudia_room_invites(room_id);

-- ── RLS (defense-in-depth; redeem goes through SECURITY DEFINER RPCs) ───────
alter table claudia_room_messages enable row level security;
drop policy if exists claudia_room_messages_access on claudia_room_messages;
create policy claudia_room_messages_access on claudia_room_messages
  using (
    exists (select 1 from claudia_rooms r where r.id = room_id and r.owner_id = auth.uid())
    or exists (select 1 from claudia_room_keys k where k.room_id = room_id and k.member_id = auth.uid())
  )
  with check (sender_id = auth.uid());

alter table claudia_room_invites enable row level security;
drop policy if exists claudia_room_invites_owner on claudia_room_invites;
create policy claudia_room_invites_owner on claudia_room_invites
  using (
    created_by = auth.uid()
    or exists (select 1 from claudia_rooms r where r.id = room_id and r.owner_id = auth.uid())
  )
  with check (created_by = auth.uid());

-- ── membership guard (reused by the RPCs) ──────────────────────────────────
create or replace function claudia_is_room_member(p_room_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from claudia_rooms r where r.id = p_room_id and r.owner_id = auth.uid())
      or exists (select 1 from claudia_room_keys k where k.room_id = p_room_id and k.member_id = auth.uid());
$$;

-- ── chat RPCs ───────────────────────────────────────────────────────────────
create or replace function claudia_post_room_message(p_room_id uuid, p_ciphertext text, p_nonce text)
returns uuid language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  if not claudia_is_room_member(p_room_id) then raise exception 'not-room-member'; end if;
  insert into claudia_room_messages(room_id, sender_id, ciphertext, nonce)
  values (p_room_id, auth.uid(), decode(p_ciphertext,'base64'), decode(p_nonce,'base64'))
  returning id into mid;
  return mid;
end $$;

create or replace function claudia_room_messages(p_room_id uuid, p_since timestamptz default null)
returns table(id uuid, sender_id uuid, ciphertext text, nonce text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not claudia_is_room_member(p_room_id) then raise exception 'not-room-member'; end if;
  return query
    select m.id, m.sender_id, encode(m.ciphertext,'base64'), encode(m.nonce,'base64'), m.created_at
    from claudia_room_messages m
    where m.room_id = p_room_id and (p_since is null or m.created_at > p_since)
    order by m.created_at asc;
end $$;

-- ── invite RPCs ───────────────────────────────────────────────────────────
create or replace function claudia_create_invite(
  p_room_id uuid, p_wrapped_ct text, p_wrapped_nonce text,
  p_expires_at timestamptz default null, p_max_uses int default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare tok uuid;
begin
  if not exists (select 1 from claudia_rooms where id = p_room_id and owner_id = auth.uid()) then
    raise exception 'not-room-owner';
  end if;
  insert into claudia_room_invites(room_id, wrapped_ct, wrapped_nonce, created_by, expires_at, max_uses)
  values (p_room_id, decode(p_wrapped_ct,'base64'), decode(p_wrapped_nonce,'base64'), auth.uid(), p_expires_at, p_max_uses)
  returning token into tok;
  return tok;
end $$;

-- redeem: return the room + the link-sealed RK blob if the token is still valid.
-- ANY authenticated user may call this (the link is the capability); the server
-- still cannot open the blob (the link key is only in the caller's URL fragment).
create or replace function claudia_get_invite(p_token uuid)
returns table(room_id uuid, wrapped_ct text, wrapped_nonce text)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select i.room_id, encode(i.wrapped_ct,'base64'), encode(i.wrapped_nonce,'base64')
    from claudia_room_invites i
    where i.token = p_token
      and not i.revoked
      and (i.expires_at is null or i.expires_at > now())
      and (i.max_uses is null or i.uses < i.max_uses);
end $$;

-- join via invite: the caller has already recovered RK from the link fragment
-- and wrapped it to their OWN identity key; this records their member row and
-- counts the use. Token validity is re-checked atomically.
create or replace function claudia_join_room_via_invite(
  p_token uuid, p_ephemeral_pub jsonb, p_wrapped_rk text
) returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  select room_id into rid from claudia_room_invites
   where token = p_token and not revoked
     and (expires_at is null or expires_at > now())
     and (max_uses is null or uses < max_uses)
   for update;
  if rid is null then raise exception 'invite-invalid'; end if;

  insert into claudia_room_keys(room_id, member_id, ephemeral_pub, wrapped_rk, added_by)
  values (rid, auth.uid(), p_ephemeral_pub, decode(p_wrapped_rk,'base64'), auth.uid())
  on conflict (room_id, member_id) do update set
    ephemeral_pub = excluded.ephemeral_pub, wrapped_rk = excluded.wrapped_rk;

  update claudia_room_invites set uses = uses + 1 where token = p_token;
  return rid;
end $$;

create or replace function claudia_revoke_invite(p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update claudia_room_invites set revoked = true
   where token = p_token
     and (created_by = auth.uid()
          or exists (select 1 from claudia_rooms r where r.id = room_id and r.owner_id = auth.uid()));
end $$;

-- ── Grants ────────────────────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'claudia_is_room_member(uuid)',
    'claudia_post_room_message(uuid,text,text)',
    'claudia_room_messages(uuid,timestamptz)',
    'claudia_create_invite(uuid,text,text,timestamptz,int)',
    'claudia_get_invite(uuid)',
    'claudia_join_room_via_invite(uuid,jsonb,text)',
    'claudia_revoke_invite(uuid)'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
