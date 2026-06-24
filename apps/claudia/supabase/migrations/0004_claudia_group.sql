-- ════════════════════════════════════════════════════════════════════════
--  ClaudIA — 0004_claudia_group.sql · Group-ZK primitive  (§0 extended to groups)
--
--  Lets a recap or community room be SHARED across many FBIDs while the server
--  stays blind. The model (see lib/claudia/group-crypto.ts):
--    • Each FBID has an identity keypair. The PUBLIC key is published (not
--      secret); the PRIVATE key is sealed in the owner's vault under their KEK
--      and stored only as ciphertext here.
--    • Each room has a random room key (RK). Shared content is encrypted under
--      RK. RK is wrapped per-member via ECDH(ephemeral, member_pub) — the server
--      stores {ephemeral_pub, wrapped_rk} blobs it cannot open.
--
--  So: even shared data is recoverable ONLY by its members, never by the server.
--  RLS is owner/member defense-in-depth; confidentiality remains cryptographic.
--
--  Apply to a Supabase DEV BRANCH off fgsrcxxccdjqyrpkitmk; validate; merge.
--  NEVER touch the stale eoajujwpdkfuicnoxetk.
-- ════════════════════════════════════════════════════════════════════════

-- ── identity keypairs (public published; private sealed, owner-only) ────────
create table if not exists claudia_identity_keys (
  user_id        uuid primary key references flowbond_users(id) on delete cascade,
  public_jwk     jsonb not null,                 -- published; used to wrap RK to this FBID
  sealed_private bytea not null,                  -- private key, sealed under owner's KEK
  sealed_nonce   bytea not null,
  created_at     timestamptz not null default now()
);

-- ── rooms (a shared surface: a meeting recap or a community thread) ─────────
create table if not exists claudia_rooms (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references flowbond_users(id) on delete cascade,
  kind        text not null check (kind in ('meeting','community')),
  ref_id      uuid,                               -- e.g. the meeting this room shares
  title_ct    bytea,                              -- encrypted under RK iff present
  title_nonce bytea,
  created_at  timestamptz not null default now()
);
create index if not exists claudia_rooms_owner_idx on claudia_rooms(owner_id, created_at desc);

-- ── per-member wrapped room keys (server-blind key distribution) ────────────
create table if not exists claudia_room_keys (
  room_id      uuid not null references claudia_rooms(id) on delete cascade,
  member_id    uuid not null references flowbond_users(id) on delete cascade,
  ephemeral_pub jsonb not null,                   -- ephemeral sender public key
  wrapped_rk   bytea not null,                     -- RK sealed under ECDH-derived key
  added_by     uuid not null references flowbond_users(id),
  created_at   timestamptz not null default now(),
  primary key (room_id, member_id)
);
create index if not exists claudia_room_keys_member_idx on claudia_room_keys(member_id);

-- ════════════════════════════════════════════════════════════════════════
--  RLS — owner/member scoped (defense-in-depth, not the ZK boundary)
-- ════════════════════════════════════════════════════════════════════════
alter table claudia_identity_keys enable row level security;
drop policy if exists claudia_identity_keys_owner on claudia_identity_keys;
create policy claudia_identity_keys_owner on claudia_identity_keys
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table claudia_rooms enable row level security;
drop policy if exists claudia_rooms_access on claudia_rooms;
create policy claudia_rooms_access on claudia_rooms
  using (
    owner_id = auth.uid()
    or exists (select 1 from claudia_room_keys k where k.room_id = id and k.member_id = auth.uid())
  )
  with check (owner_id = auth.uid());

alter table claudia_room_keys enable row level security;
drop policy if exists claudia_room_keys_access on claudia_room_keys;
create policy claudia_room_keys_access on claudia_room_keys
  using (
    member_id = auth.uid()
    or exists (select 1 from claudia_rooms r where r.id = room_id and r.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from claudia_rooms r where r.id = room_id and r.owner_id = auth.uid())
  );

-- ════════════════════════════════════════════════════════════════════════
--  RPCs (SECURITY DEFINER · set search_path = public · base64 for bytea)
-- ════════════════════════════════════════════════════════════════════════

-- identity ------------------------------------------------------------------
create or replace function claudia_upsert_identity_key(
  p_public_jwk jsonb, p_sealed_private text, p_sealed_nonce text
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into claudia_identity_keys(user_id, public_jwk, sealed_private, sealed_nonce)
  values (auth.uid(), p_public_jwk, decode(p_sealed_private,'base64'), decode(p_sealed_nonce,'base64'))
  on conflict (user_id) do update set
    public_jwk = excluded.public_jwk,
    sealed_private = excluded.sealed_private,
    sealed_nonce = excluded.sealed_nonce;
end $$;

create or replace function claudia_my_identity_key()
returns table(public_jwk jsonb, sealed_private text, sealed_nonce text)
language sql security definer set search_path = public as $$
  select public_jwk, encode(sealed_private,'base64'), encode(sealed_nonce,'base64')
  from claudia_identity_keys where user_id = auth.uid();
$$;

-- ANY authenticated user can fetch ANOTHER FBID's PUBLIC key (to wrap RK to
-- them). Returns only the public half — never the sealed private key. --
create or replace function claudia_identity_public(p_user_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select public_jwk from claudia_identity_keys where user_id = p_user_id;
$$;

-- rooms ---------------------------------------------------------------------
create or replace function claudia_create_room(
  p_kind text, p_ref_id uuid default null, p_title_ct text default null, p_title_nonce text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  insert into claudia_rooms(owner_id, kind, ref_id, title_ct, title_nonce)
  values (
    auth.uid(), p_kind, p_ref_id,
    case when p_title_ct is null then null else decode(p_title_ct,'base64') end,
    case when p_title_nonce is null then null else decode(p_title_nonce,'base64') end
  )
  returning id into rid;
  -- owner is implicitly a member; their wrapped key is added via claudia_add_room_member
  return rid;
end $$;

create or replace function claudia_add_room_member(
  p_room_id uuid, p_member_id uuid, p_ephemeral_pub jsonb, p_wrapped_rk text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from claudia_rooms where id = p_room_id and owner_id = auth.uid()) then
    raise exception 'not-room-owner';
  end if;
  insert into claudia_room_keys(room_id, member_id, ephemeral_pub, wrapped_rk, added_by)
  values (p_room_id, p_member_id, p_ephemeral_pub, decode(p_wrapped_rk,'base64'), auth.uid())
  on conflict (room_id, member_id) do update set
    ephemeral_pub = excluded.ephemeral_pub, wrapped_rk = excluded.wrapped_rk, added_by = excluded.added_by;
end $$;

create or replace function claudia_my_room_key(p_room_id uuid)
returns table(ephemeral_pub jsonb, wrapped_rk text)
language sql security definer set search_path = public as $$
  select ephemeral_pub, encode(wrapped_rk,'base64')
  from claudia_room_keys
  where room_id = p_room_id and member_id = auth.uid();
$$;

create or replace function claudia_my_rooms()
returns table(id uuid, kind text, ref_id uuid, owner_id uuid, title_ct text, title_nonce text, created_at timestamptz)
language sql security definer set search_path = public as $$
  select r.id, r.kind, r.ref_id, r.owner_id,
         encode(r.title_ct,'base64'), encode(r.title_nonce,'base64'), r.created_at
  from claudia_rooms r
  where r.owner_id = auth.uid()
     or exists (select 1 from claudia_room_keys k where k.room_id = r.id and k.member_id = auth.uid())
  order by r.created_at desc;
$$;

-- ════════════════════════════════════════════════════════════════════════
--  Grants — user RPCs to authenticated only.
-- ════════════════════════════════════════════════════════════════════════
do $$
declare fn text;
begin
  foreach fn in array array[
    'claudia_upsert_identity_key(jsonb,text,text)',
    'claudia_my_identity_key()',
    'claudia_identity_public(uuid)',
    'claudia_create_room(text,uuid,text,text)',
    'claudia_add_room_member(uuid,uuid,jsonb,text)',
    'claudia_my_room_key(uuid)',
    'claudia_my_rooms()'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
