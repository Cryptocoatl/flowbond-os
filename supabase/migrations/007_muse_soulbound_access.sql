-- =============================================================================
-- 007 · MUSE — soulbound access-pass NFTs on FlowBond Layer-0
-- =============================================================================
-- A MUSE is a non-transferable (soulbound) access credential minted to a
-- specific FBID (public.flowbond_users.id = auth.uid()). Each MUSE carries a
-- DUAL CONTRACT:
--
--   • IMMUTABLE contract  — `immutable_terms` (jsonb) + every grant with
--     locked = true. Written once at mint, SHA-256 anchored in
--     `immutable_hash`. Can NEVER be altered. A trigger refuses any change.
--
--   • MUTABLE contract    — `mutable_terms` (jsonb) + every grant with
--     locked = false. Governance may amend these via RPC; each amendment
--     bumps `mutable_version`, snapshots into muse.amendments, and is logged
--     in the tamper-evident muse.events hash chain.
--
-- SOULBOUND: owner_fbid is fixed at mint. There is no transfer path; the
-- muse.transfer() RPC exists only to record and reject any attempt.
--
-- Pattern: RPC-only + RLS deny-by-default (mirrors the `sani` schema).
-- Project: fgsrcxxccdjqyrpkitmk (canonical "new building").
-- Governance: public.is_superadmin(fbid) OR membership in muse.governors.
-- =============================================================================

create schema if not exists muse;

-- ─────────────────────────────────────────────────────────────────────────────
-- Governance roster (who may mint / amend / suspend)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists muse.governors (
  fbid       uuid primary key references public.flowbond_users(id) on delete cascade,
  added_by   uuid references public.flowbond_users(id) on delete set null,
  note       text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- The MUSE token (one row = one soulbound NFT)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists muse.muses (
  id              uuid primary key default gen_random_uuid(),
  serial          bigint generated always as identity,        -- human token number
  slug            text not null unique,                       -- e.g. 'muse-of-flow'
  name            text not null,
  owner_fbid      uuid not null references public.flowbond_users(id) on delete restrict,

  -- immutable contract (write-once)
  immutable_terms jsonb not null default '{}'::jsonb,
  immutable_hash  text  not null,                             -- sha256(immutable_terms canonical)

  -- mutable contract (governance-amendable)
  mutable_terms   jsonb not null default '{}'::jsonb,
  mutable_version int   not null default 1,

  status          text not null default 'active'
                    check (status in ('active','suspended','burned')),
  minted_by       uuid references public.flowbond_users(id) on delete set null,
  minted_at       timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists muses_owner_idx  on muse.muses(owner_fbid) where status = 'active';
create index if not exists muses_status_idx on muse.muses(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants attached to a MUSE — the machine-readable rights.
--   kind  'access'  → unlocks an app/page/feature scope
--   kind  'power'   → permits a capability (e.g. 'mission:create', 'vote')
--   locked = true   → part of the IMMUTABLE contract; can never be revoked
--   locked = false  → part of the MUTABLE contract; governance may revoke
-- scope '*' is a wildcard meaning "all access" / "all powers" for that kind.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists muse.grants (
  id         uuid primary key default gen_random_uuid(),
  muse_id    uuid not null references muse.muses(id) on delete cascade,
  kind       text not null check (kind in ('access','power')),
  scope      text not null,
  detail     jsonb not null default '{}'::jsonb,
  locked     boolean not null default false,
  status     text not null default 'active' check (status in ('active','revoked')),
  granted_by uuid references public.flowbond_users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (muse_id, kind, scope)
);

create index if not exists grants_muse_idx on muse.grants(muse_id) where status = 'active';
create index if not exists grants_lookup_idx on muse.grants(kind, scope) where status = 'active';

-- ─────────────────────────────────────────────────────────────────────────────
-- Amendment ledger — full snapshot of the mutable contract at each version.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists muse.amendments (
  id            uuid primary key default gen_random_uuid(),
  muse_id       uuid not null references muse.muses(id) on delete cascade,
  version       int  not null,
  mutable_terms jsonb not null,
  patch         jsonb not null default '{}'::jsonb,
  amended_by    uuid references public.flowbond_users(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (muse_id, version)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tamper-evident event log (append-only hash chain per MUSE).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists muse.events (
  id          uuid primary key default gen_random_uuid(),
  muse_id     uuid not null references muse.muses(id) on delete cascade,
  event_type  text not null,                 -- mint|amend|grant_add|grant_revoke|suspend|reactivate|burn|transfer_blocked
  actor_fbid  uuid references public.flowbond_users(id) on delete set null,
  payload     jsonb not null default '{}'::jsonb,
  prev_hash   text,
  entry_hash  text not null,
  created_at  timestamptz not null default now()
);

create index if not exists events_muse_idx on muse.events(muse_id, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: deny-by-default. No policies → all access flows through the RPCs below.
-- ─────────────────────────────────────────────────────────────────────────────
alter table muse.governors  enable row level security;
alter table muse.muses      enable row level security;
alter table muse.grants     enable row level security;
alter table muse.amendments enable row level security;
alter table muse.events     enable row level security;

-- =============================================================================
-- IMMUTABILITY ENFORCEMENT
-- =============================================================================
-- Hard guarantee at the storage layer (independent of the RPC path): the
-- soulbound owner and the immutable contract can never change once minted.
create or replace function muse._protect_immutable()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if new.owner_fbid     is distinct from old.owner_fbid     then
    raise exception 'MUSE % is soulbound: owner_fbid is immutable', old.id using errcode = '42501';
  end if;
  if new.immutable_terms is distinct from old.immutable_terms then
    raise exception 'MUSE % immutable_terms cannot be amended', old.id using errcode = '42501';
  end if;
  if new.immutable_hash  is distinct from old.immutable_hash  then
    raise exception 'MUSE % immutable_hash is locked', old.id using errcode = '42501';
  end if;
  if new.slug   is distinct from old.slug   then
    raise exception 'MUSE % slug is immutable', old.id using errcode = '42501';
  end if;
  if new.serial is distinct from old.serial then
    raise exception 'MUSE % serial is immutable', old.id using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_protect_immutable on muse.muses;
create trigger trg_protect_immutable
  before update on muse.muses
  for each row execute function muse._protect_immutable();

-- A locked grant may never be revoked or mutated (only status->status is checked;
-- inserts and the genesis lock are allowed).
create or replace function muse._protect_locked_grant()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if old.locked then
    if new.status is distinct from old.status
       or new.scope is distinct from old.scope
       or new.kind  is distinct from old.kind
       or new.locked is distinct from old.locked then
      raise exception 'grant % belongs to the immutable contract and cannot be changed', old.id using errcode = '42501';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_protect_locked_grant on muse.grants;
create trigger trg_protect_locked_grant
  before update on muse.grants
  for each row execute function muse._protect_locked_grant();

-- =============================================================================
-- INTERNAL HELPERS (private — never granted to clients)
-- =============================================================================

-- Canonical SHA-256 of a jsonb value. jsonb::text is key-sorted & whitespace-
-- normalized by Postgres, giving a deterministic hash.
create or replace function muse._hash(p jsonb)
returns text language sql immutable
set search_path = extensions, public as $$
  select encode(extensions.digest(convert_to(p::text, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function muse._is_governor(p_fbid uuid)
returns boolean language sql stable security definer
set search_path = muse, public as $$
  select coalesce(public.is_superadmin(p_fbid), false)
      or exists (select 1 from muse.governors g where g.fbid = p_fbid);
$$;

create or replace function muse._require_governor()
returns uuid language plpgsql stable security definer
set search_path = muse, public as $$
declare v uuid := auth.uid();
begin
  if v is null or not muse._is_governor(v) then
    raise exception 'not authorized: MUSE governance required' using errcode = '42501';
  end if;
  return v;
end; $$;

-- Append an event to the per-MUSE hash chain.
create or replace function muse._log(p_muse uuid, p_type text, p_actor uuid, p_payload jsonb)
returns void language plpgsql security definer
set search_path = muse, public as $$
declare v_prev text; v_entry text;
begin
  select entry_hash into v_prev
    from muse.events where muse_id = p_muse
    order by created_at desc, id desc limit 1;

  v_entry := muse._hash(jsonb_build_object(
    'prev', coalesce(v_prev,''),
    'muse', p_muse,
    'type', p_type,
    'actor', p_actor,
    'payload', coalesce(p_payload,'{}'::jsonb),
    'at', now()
  ));

  insert into muse.events (muse_id, event_type, actor_fbid, payload, prev_hash, entry_hash)
  values (p_muse, p_type, p_actor, coalesce(p_payload,'{}'::jsonb), v_prev, v_entry);
end; $$;

-- =============================================================================
-- GOVERNANCE: manage the governor roster
-- =============================================================================
create or replace function muse.add_governor(p_fbid uuid, p_note text default null)
returns void language plpgsql security definer
set search_path = muse, public as $$
declare v uuid := muse._require_governor();
begin
  insert into muse.governors (fbid, added_by, note)
  values (p_fbid, v, p_note)
  on conflict (fbid) do nothing;
end; $$;

-- =============================================================================
-- MINT — issue a soulbound MUSE to a specific FBID with its dual contract.
-- p_grants: jsonb array of {kind, scope, detail?, locked?}
-- =============================================================================
create or replace function muse.mint(
  p_owner_fbid uuid,
  p_slug       text,
  p_name       text,
  p_immutable  jsonb default '{}'::jsonb,
  p_mutable    jsonb default '{}'::jsonb,
  p_grants     jsonb default '[]'::jsonb
) returns muse.muses
language plpgsql security definer set search_path = muse, public as $$
declare
  v_actor uuid := muse._require_governor();
  v_muse  muse.muses;
  v_imm   jsonb;
  g       jsonb;
begin
  if not exists (select 1 from public.flowbond_users where id = p_owner_fbid) then
    raise exception 'owner FBID % does not exist', p_owner_fbid using errcode = '23503';
  end if;

  -- stamp the soulbound covenant into the immutable terms, then freeze the hash
  v_imm := coalesce(p_immutable,'{}'::jsonb)
           || jsonb_build_object('soulbound', true, 'issued_to', p_owner_fbid);

  insert into muse.muses (slug, name, owner_fbid, immutable_terms, immutable_hash,
                          mutable_terms, minted_by)
  values (p_slug, p_name, p_owner_fbid, v_imm, muse._hash(v_imm),
          coalesce(p_mutable,'{}'::jsonb), v_actor)
  returning * into v_muse;

  -- materialize grants
  for g in select * from jsonb_array_elements(coalesce(p_grants,'[]'::jsonb)) loop
    insert into muse.grants (muse_id, kind, scope, detail, locked, granted_by)
    values (
      v_muse.id,
      g->>'kind',
      g->>'scope',
      coalesce(g->'detail','{}'::jsonb),
      coalesce((g->>'locked')::boolean, false),
      v_actor
    );
  end loop;

  -- genesis amendment snapshot (version 1) + chain genesis event
  insert into muse.amendments (muse_id, version, mutable_terms, patch, amended_by)
  values (v_muse.id, 1, v_muse.mutable_terms, '{}'::jsonb, v_actor);

  perform muse._log(v_muse.id, 'mint', v_actor, jsonb_build_object(
    'owner', p_owner_fbid, 'slug', p_slug, 'immutable_hash', v_muse.immutable_hash,
    'grants', p_grants));

  return v_muse;
end; $$;

-- Convenience: mint by owner email (looked up in flowbond_users).
create or replace function muse.mint_by_email(
  p_email     text,
  p_slug      text,
  p_name      text,
  p_immutable jsonb default '{}'::jsonb,
  p_mutable   jsonb default '{}'::jsonb,
  p_grants    jsonb default '[]'::jsonb
) returns muse.muses
language plpgsql security definer set search_path = muse, public as $$
declare v_fbid uuid;
begin
  select id into v_fbid from public.flowbond_users where lower(email) = lower(p_email) limit 1;
  if v_fbid is null then
    raise exception 'no FBID found for email %', p_email using errcode = 'no_data_found';
  end if;
  return muse.mint(v_fbid, p_slug, p_name, p_immutable, p_mutable, p_grants);
end; $$;

-- =============================================================================
-- AMEND — update the MUTABLE contract only. Immutable terms are untouchable.
-- =============================================================================
create or replace function muse.amend(p_muse_id uuid, p_patch jsonb)
returns muse.muses
language plpgsql security definer set search_path = muse, public as $$
declare v_actor uuid := muse._require_governor(); v_muse muse.muses;
begin
  update muse.muses
     set mutable_terms = mutable_terms || coalesce(p_patch,'{}'::jsonb),
         mutable_version = mutable_version + 1
   where id = p_muse_id and status <> 'burned'
   returning * into v_muse;

  if v_muse.id is null then
    raise exception 'MUSE % not found or burned', p_muse_id using errcode = 'no_data_found';
  end if;

  insert into muse.amendments (muse_id, version, mutable_terms, patch, amended_by)
  values (v_muse.id, v_muse.mutable_version, v_muse.mutable_terms, p_patch, v_actor);

  perform muse._log(v_muse.id, 'amend', v_actor,
    jsonb_build_object('version', v_muse.mutable_version, 'patch', p_patch));

  return v_muse;
end; $$;

-- =============================================================================
-- GRANTS — add (mutable) or revoke (mutable only). Locked grants are immutable.
-- =============================================================================
create or replace function muse.add_grant(
  p_muse_id uuid, p_kind text, p_scope text,
  p_detail jsonb default '{}'::jsonb, p_locked boolean default false
) returns muse.grants
language plpgsql security definer set search_path = muse, public as $$
declare v_actor uuid := muse._require_governor(); v_grant muse.grants;
begin
  insert into muse.grants (muse_id, kind, scope, detail, locked, granted_by)
  values (p_muse_id, p_kind, p_scope, coalesce(p_detail,'{}'::jsonb), p_locked, v_actor)
  on conflict (muse_id, kind, scope) do update
     set status = 'active', revoked_at = null, detail = excluded.detail
  returning * into v_grant;

  perform muse._log(p_muse_id, 'grant_add', v_actor,
    jsonb_build_object('kind', p_kind, 'scope', p_scope, 'locked', p_locked));
  return v_grant;
end; $$;

create or replace function muse.revoke_grant(p_grant_id uuid)
returns void language plpgsql security definer set search_path = muse, public as $$
declare v_actor uuid := muse._require_governor(); v_grant muse.grants;
begin
  select * into v_grant from muse.grants where id = p_grant_id;
  if v_grant.id is null then
    raise exception 'grant % not found', p_grant_id using errcode = 'no_data_found';
  end if;
  if v_grant.locked then
    raise exception 'grant % is part of the immutable contract and cannot be revoked', p_grant_id using errcode = '42501';
  end if;

  update muse.grants set status = 'revoked', revoked_at = now() where id = p_grant_id;
  perform muse._log(v_grant.muse_id, 'grant_revoke', v_actor,
    jsonb_build_object('grant', p_grant_id, 'kind', v_grant.kind, 'scope', v_grant.scope));
end; $$;

-- =============================================================================
-- STATUS — suspend / reactivate / burn (governance). Honors immutable
-- governance flag immutable_terms.governance.revocable = false.
-- =============================================================================
create or replace function muse.set_status(p_muse_id uuid, p_status text)
returns muse.muses
language plpgsql security definer set search_path = muse, public as $$
declare v_actor uuid := muse._require_governor(); v_muse muse.muses; v_evt text;
begin
  select * into v_muse from muse.muses where id = p_muse_id;
  if v_muse.id is null then
    raise exception 'MUSE % not found', p_muse_id using errcode = 'no_data_found';
  end if;
  if p_status not in ('active','suspended','burned') then
    raise exception 'invalid status %', p_status using errcode = '22023';
  end if;

  if p_status in ('suspended','burned')
     and coalesce((v_muse.immutable_terms #>> '{governance,revocable}'), 'true') = 'false' then
    raise exception 'MUSE % immutable contract forbids revocation (governance.revocable=false)', p_muse_id using errcode = '42501';
  end if;

  update muse.muses set status = p_status where id = p_muse_id returning * into v_muse;

  v_evt := case p_status when 'active' then 'reactivate' when 'burned' then 'burn' else 'suspend' end;
  perform muse._log(p_muse_id, v_evt, v_actor, jsonb_build_object('status', p_status));
  return v_muse;
end; $$;

-- =============================================================================
-- TRANSFER — soulbound: there is no transfer. This records & rejects attempts.
-- =============================================================================
create or replace function muse.transfer(p_muse_id uuid, p_to_fbid uuid)
returns void language plpgsql security definer set search_path = muse, public as $$
begin
  perform muse._log(p_muse_id, 'transfer_blocked', auth.uid(),
    jsonb_build_object('attempted_to', p_to_fbid));
  raise exception 'MUSE % is soulbound and non-transferable', p_muse_id using errcode = '42501';
end; $$;

-- =============================================================================
-- READ / GATE
-- =============================================================================

-- The gate check apps call: does this FBID hold an active, unexpired MUSE that
-- grants this access scope? '*' grant satisfies any scope.
create or replace function muse.has_access(p_scope text, p_fbid uuid default auth.uid())
returns boolean language sql stable security definer
set search_path = muse, public as $$
  select exists (
    select 1
      from muse.muses m
      join muse.grants g on g.muse_id = m.id
     where m.owner_fbid = p_fbid
       and m.status = 'active'
       and g.status = 'active'
       and g.kind = 'access'
       and (g.scope = p_scope or g.scope = '*')
       and ( (m.mutable_terms ->> 'expiry') is null
             or (m.mutable_terms ->> 'expiry')::timestamptz > now() )
  );
$$;

-- Power check (capabilities).
create or replace function muse.has_power(p_power text, p_fbid uuid default auth.uid())
returns boolean language sql stable security definer
set search_path = muse, public as $$
  select exists (
    select 1 from muse.muses m join muse.grants g on g.muse_id = m.id
     where m.owner_fbid = p_fbid and m.status = 'active' and g.status = 'active'
       and g.kind = 'power' and (g.scope = p_power or g.scope = '*')
  );
$$;

-- The caller's own MUSEs with full contract + active grants.
create or replace function muse.me()
returns jsonb language sql stable security definer
set search_path = muse, public as $$
  select coalesce(jsonb_agg(row), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', m.id, 'serial', m.serial, 'slug', m.slug, 'name', m.name,
      'status', m.status, 'minted_at', m.minted_at,
      'immutable_terms', m.immutable_terms, 'immutable_hash', m.immutable_hash,
      'mutable_terms', m.mutable_terms, 'mutable_version', m.mutable_version,
      'grants', (select coalesce(jsonb_agg(jsonb_build_object(
                   'kind', g.kind, 'scope', g.scope, 'locked', g.locked, 'detail', g.detail))
                 , '[]'::jsonb) from muse.grants g
                 where g.muse_id = m.id and g.status = 'active')
    ) as row
    from muse.muses m
    where m.owner_fbid = auth.uid()
    order by m.serial
  ) s;
$$;

-- Governance/owner detail view of one MUSE (terms, grants, recent events).
create or replace function muse.get(p_muse_id uuid)
returns jsonb language plpgsql stable security definer
set search_path = muse, public as $$
declare v_muse muse.muses; v uuid := auth.uid();
begin
  select * into v_muse from muse.muses where id = p_muse_id;
  if v_muse.id is null then return null; end if;
  if v_muse.owner_fbid <> v and not muse._is_governor(v) then
    raise exception 'not authorized to view MUSE %', p_muse_id using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', v_muse.id, 'serial', v_muse.serial, 'slug', v_muse.slug, 'name', v_muse.name,
    'owner_fbid', v_muse.owner_fbid, 'status', v_muse.status, 'minted_at', v_muse.minted_at,
    'immutable_terms', v_muse.immutable_terms, 'immutable_hash', v_muse.immutable_hash,
    'mutable_terms', v_muse.mutable_terms, 'mutable_version', v_muse.mutable_version,
    'grants', (select coalesce(jsonb_agg(jsonb_build_object(
                 'id', g.id, 'kind', g.kind, 'scope', g.scope, 'locked', g.locked,
                 'status', g.status, 'detail', g.detail)), '[]'::jsonb)
               from muse.grants g where g.muse_id = p_muse_id),
    'events', (select coalesce(jsonb_agg(jsonb_build_object(
                 'type', e.event_type, 'actor', e.actor_fbid, 'payload', e.payload,
                 'entry_hash', e.entry_hash, 'at', e.created_at) order by e.created_at desc), '[]'::jsonb)
               from muse.events e where e.muse_id = p_muse_id)
  );
end; $$;

-- Public provenance check: recompute the immutable hash and confirm integrity.
create or replace function muse.verify(p_slug text)
returns jsonb language sql stable security definer
set search_path = muse, public as $$
  select case when m.id is null then jsonb_build_object('found', false)
    else jsonb_build_object(
      'found', true,
      'slug', m.slug, 'serial', m.serial, 'name', m.name,
      'owner_fbid', m.owner_fbid, 'status', m.status, 'minted_at', m.minted_at,
      'soulbound', true,
      'immutable_hash', m.immutable_hash,
      'integrity_ok', (m.immutable_hash = muse._hash(m.immutable_terms))
    ) end
  from (select * from muse.muses where slug = p_slug) m
  right join (select 1) _ on true;
$$;

-- =============================================================================
-- PRIVILEGE HARDENING
-- =============================================================================
revoke execute on all functions in schema muse from public;
grant usage on schema muse to anon, authenticated, service_role;

-- governance + lifecycle (authorization enforced inside each fn)
grant execute on function muse.add_governor(uuid, text)                                    to authenticated, service_role;
grant execute on function muse.mint(uuid, text, text, jsonb, jsonb, jsonb)                 to authenticated, service_role;
grant execute on function muse.mint_by_email(text, text, text, jsonb, jsonb, jsonb)        to authenticated, service_role;
grant execute on function muse.amend(uuid, jsonb)                                          to authenticated, service_role;
grant execute on function muse.add_grant(uuid, text, text, jsonb, boolean)                 to authenticated, service_role;
grant execute on function muse.revoke_grant(uuid)                                          to authenticated, service_role;
grant execute on function muse.set_status(uuid, text)                                       to authenticated, service_role;
grant execute on function muse.transfer(uuid, uuid)                                         to authenticated, service_role;

-- read / gate
grant execute on function muse.has_access(text, uuid)                                       to authenticated, service_role;
grant execute on function muse.has_power(text, uuid)                                        to authenticated, service_role;
grant execute on function muse.me()                                                         to authenticated, service_role;
grant execute on function muse.get(uuid)                                                    to authenticated, service_role;
grant execute on function muse.verify(text)                                                 to anon, authenticated, service_role;

-- =============================================================================
-- SEED — genesis governor (Steph / cryptocoatl101@gmail.com)
-- =============================================================================
insert into muse.governors (fbid, note)
select id, 'genesis governor' from public.flowbond_users
where email = 'cryptocoatl101@gmail.com'
on conflict (fbid) do nothing;
