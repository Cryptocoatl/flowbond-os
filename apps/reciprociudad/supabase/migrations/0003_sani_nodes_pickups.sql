-- ============================================================================
-- Sani Templo — fixed nodes ("nodos fijos") + cubeta (full-bucket) pickups
-- routed through RefiRides. Extends 0002 (same RLS deny-by-default + SECURITY
-- DEFINER RPC pattern; EXECUTE revoked from PUBLIC, re-granted explicitly).
--
-- New feature key: 'logistics' (nodes + pickups). Admins/super hold it by role;
-- members get it via an explicit grant.
-- ============================================================================

-- widen the grantable feature set
alter table sani.grants drop constraint if exists grants_feature_check;
alter table sani.grants add constraint grants_feature_check
  check (feature in ('bookings','audit','logistics'));

-- ── Fixed nodes: permanent Sani Templo installations ─────────────────────────
create table if not exists sani.nodes (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  address          text,
  lat              double precision,
  lng              double precision,
  units            int not null default 1,           -- toilets at this node
  buckets_capacity int not null default 0,            -- total cubetas in service
  status           text not null default 'active' check (status in ('active','paused','retired')),
  notes            text,
  created_by       uuid references sani.team_members(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists nodes_status_idx on sani.nodes (status);

-- ── Cubeta pickups: full-bucket collection jobs dispatched via RefiRides ──────
create table if not exists sani.pickups (
  id                   uuid primary key default gen_random_uuid(),
  node_id              uuid not null references sani.nodes(id) on delete cascade,
  buckets              int not null default 1 check (buckets >= 1),
  status               text not null default 'requested'
                         check (status in ('requested','scheduled','picked_up','dropped_off','done','canceled')),
  dropoff_label        text,                          -- composting site name
  dropoff_address      text,
  refirides_job_id     text,                          -- RefiRides delivery id
  refirides_external_id text,
  quote                jsonb,
  requested_by         uuid references sani.team_members(id) on delete set null,
  assigned_to          uuid references sani.team_members(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists pickups_status_idx on sani.pickups (status);
create index if not exists pickups_node_idx   on sani.pickups (node_id);

alter table sani.nodes   enable row level security;
alter table sani.pickups enable row level security;

-- ── me(): admins/super also hold 'logistics' by role ─────────────────────────
create or replace function sani.me()
returns jsonb
language plpgsql stable security definer set search_path = sani, public as $$
declare m sani.team_members; v_features text[];
begin
  select * into m from sani.team_members where user_id = auth.uid() limit 1;
  if m.id is null then return jsonb_build_object('member', null); end if;
  if m.role in ('admin','super_admin') then
    v_features := array['bookings','audit','logistics'];
  else
    select coalesce(array_agg(feature order by feature), '{}') into v_features
    from sani.grants where member_id = m.id;
  end if;
  return jsonb_build_object(
    'member', jsonb_build_object(
      'id', m.id, 'email', m.email, 'name', m.name,
      'role', m.role, 'status', m.status, 'activated_at', m.activated_at),
    'features', to_jsonb(v_features),
    'can_manage_team', m.role in ('admin','super_admin'),
    'is_super', m.role = 'super_admin'
  );
end; $$;

-- ── Nodes RPCs (feature: logistics) ──────────────────────────────────────────
create or replace function sani.list_nodes()
returns jsonb
language plpgsql stable security definer set search_path = sani, public as $$
declare caller sani.team_members;
begin
  caller := sani._require_active();
  if not sani._has_feature(caller, 'logistics') then raise exception 'no logistics access' using errcode = '42501'; end if;
  return (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
    from (
      select n.id, n.name, n.address, n.lat, n.lng, n.units, n.buckets_capacity,
             n.status, n.notes, n.created_at,
             (select count(*) from sani.pickups p
               where p.node_id = n.id and p.status in ('requested','scheduled','picked_up')) as open_pickups
      from sani.nodes n
    ) t
  );
end; $$;

create or replace function sani.create_node(p jsonb)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members; v_id uuid;
begin
  caller := sani._require_active();
  if not sani._has_feature(caller, 'logistics') then raise exception 'no logistics access' using errcode = '42501'; end if;
  if coalesce(p->>'name','') = '' then raise exception 'name required'; end if;
  insert into sani.nodes (name, address, lat, lng, units, buckets_capacity, status, notes, created_by)
  values (
    p->>'name', nullif(p->>'address',''),
    nullif(p->>'lat','')::double precision, nullif(p->>'lng','')::double precision,
    coalesce(nullif(p->>'units','')::int, 1), coalesce(nullif(p->>'buckets_capacity','')::int, 0),
    coalesce(nullif(p->>'status',''), 'active'), nullif(p->>'notes',''), caller.id
  ) returning id into v_id;
  perform sani._audit(caller, 'create_node', v_id::text, jsonb_build_object('name', p->>'name'));
  return sani.list_nodes();
end; $$;

create or replace function sani.update_node(p_id uuid, p jsonb)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members;
begin
  caller := sani._require_active();
  if not sani._has_feature(caller, 'logistics') then raise exception 'no logistics access' using errcode = '42501'; end if;
  update sani.nodes set
    name             = coalesce(nullif(p->>'name',''), name),
    address          = coalesce(p->>'address', address),
    lat              = coalesce(nullif(p->>'lat','')::double precision, lat),
    lng              = coalesce(nullif(p->>'lng','')::double precision, lng),
    units            = coalesce(nullif(p->>'units','')::int, units),
    buckets_capacity = coalesce(nullif(p->>'buckets_capacity','')::int, buckets_capacity),
    status           = coalesce(nullif(p->>'status',''), status),
    notes            = coalesce(p->>'notes', notes),
    updated_at       = now()
  where id = p_id;
  if not found then raise exception 'node not found'; end if;
  perform sani._audit(caller, 'update_node', p_id::text, '{}'::jsonb);
  return sani.list_nodes();
end; $$;

-- ── Pickups RPCs (feature: logistics) ────────────────────────────────────────
create or replace function sani.list_pickups()
returns jsonb
language plpgsql stable security definer set search_path = sani, public as $$
declare caller sani.team_members;
begin
  caller := sani._require_active();
  if not sani._has_feature(caller, 'logistics') then raise exception 'no logistics access' using errcode = '42501'; end if;
  return (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
    from (
      select p.id, p.node_id, n.name as node_name, n.address as node_address,
             p.buckets, p.status, p.dropoff_label, p.dropoff_address,
             p.refirides_job_id, p.created_at, p.updated_at,
             am.name as assigned_name
      from sani.pickups p
      join sani.nodes n on n.id = p.node_id
      left join sani.team_members am on am.id = p.assigned_to
    ) t
  );
end; $$;

-- Creates the pickup row and returns the node coordinates the API route needs
-- to call RefiRides (quote + create). The HTTP dispatch happens server-side.
create or replace function sani.create_pickup(p_node_id uuid, p_buckets int,
  p_dropoff_label text default null, p_dropoff_address text default null)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members; n sani.nodes; v_id uuid;
begin
  caller := sani._require_active();
  if not sani._has_feature(caller, 'logistics') then raise exception 'no logistics access' using errcode = '42501'; end if;
  select * into n from sani.nodes where id = p_node_id;
  if n.id is null then raise exception 'node not found'; end if;
  insert into sani.pickups (node_id, buckets, dropoff_label, dropoff_address, requested_by, status)
  values (p_node_id, greatest(coalesce(p_buckets, 1), 1), nullif(p_dropoff_label,''),
          nullif(p_dropoff_address,''), caller.id, 'requested')
  returning id into v_id;
  perform sani._audit(caller, 'create_pickup', v_id::text,
                      jsonb_build_object('node', n.name, 'buckets', greatest(coalesce(p_buckets,1),1)));
  return jsonb_build_object(
    'pickup_id', v_id, 'node_name', n.name, 'node_address', n.address,
    'node_lat', n.lat, 'node_lng', n.lng,
    'buckets', greatest(coalesce(p_buckets,1),1),
    'dropoff_label', nullif(p_dropoff_label,''), 'dropoff_address', nullif(p_dropoff_address,'')
  );
end; $$;

-- Attaches the RefiRides job to a pickup (called by the API route after dispatch).
create or replace function sani.set_pickup_refirides(p_id uuid, p_job_id text,
  p_external_id text default null, p_quote jsonb default null, p_status text default 'scheduled')
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members;
begin
  caller := sani._require_active();
  if not sani._has_feature(caller, 'logistics') then raise exception 'no logistics access' using errcode = '42501'; end if;
  update sani.pickups set
    refirides_job_id = p_job_id,
    refirides_external_id = nullif(p_external_id,''),
    quote = coalesce(p_quote, quote),
    status = coalesce(nullif(p_status,''), status),
    updated_at = now()
  where id = p_id;
  if not found then raise exception 'pickup not found'; end if;
  perform sani._audit(caller, 'pickup_dispatched', p_id::text, jsonb_build_object('job', p_job_id));
  return sani.list_pickups();
end; $$;

create or replace function sani.update_pickup_status(p_id uuid, p_status text)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members;
begin
  caller := sani._require_active();
  if not sani._has_feature(caller, 'logistics') then raise exception 'no logistics access' using errcode = '42501'; end if;
  if p_status not in ('requested','scheduled','picked_up','dropped_off','done','canceled') then
    raise exception 'invalid status';
  end if;
  update sani.pickups set status = p_status, updated_at = now() where id = p_id;
  if not found then raise exception 'pickup not found'; end if;
  perform sani._audit(caller, 'pickup_status', p_id::text, jsonb_build_object('status', p_status));
  return sani.list_pickups();
end; $$;

-- ── Privilege hardening: re-revoke PUBLIC, grant the new RPCs explicitly ──────
revoke execute on all functions in schema sani from public;

grant execute on function sani.me()                                              to authenticated, service_role;
grant execute on function sani.list_nodes()                                      to authenticated, service_role;
grant execute on function sani.create_node(jsonb)                                to authenticated, service_role;
grant execute on function sani.update_node(uuid, jsonb)                          to authenticated, service_role;
grant execute on function sani.list_pickups()                                    to authenticated, service_role;
grant execute on function sani.create_pickup(uuid, int, text, text)              to authenticated, service_role;
grant execute on function sani.set_pickup_refirides(uuid, text, text, jsonb, text) to authenticated, service_role;
grant execute on function sani.update_pickup_status(uuid, text)                  to authenticated, service_role;

-- re-grant the 0002 RPCs that `revoke ... from public` above also stripped of
-- nothing (they were never public) — explicit so nothing depends on order.
grant execute on function sani.claim()                                           to authenticated, service_role;
grant execute on function sani.list_members()                                    to authenticated, service_role;
grant execute on function sani.invite_member(text, text, text)                   to authenticated, service_role;
grant execute on function sani.set_role(uuid, text)                              to authenticated, service_role;
grant execute on function sani.set_grant(uuid, text, boolean)                    to authenticated, service_role;
grant execute on function sani.set_status(uuid, text)                            to authenticated, service_role;
grant execute on function sani.list_bookings()                                   to authenticated, service_role;
grant execute on function sani.create_booking(jsonb)                             to authenticated, service_role;
grant execute on function sani.update_booking(uuid, jsonb)                       to authenticated, service_role;
grant execute on function sani.list_audit(int)                                   to authenticated, service_role;
grant execute on function sani.request_quote(text, text, text, text, date, text, int, text)
                                                                                 to anon, authenticated, service_role;
