-- ============================================================================
-- Sani Templo — ops team console schema (Pattern A: own schema, RLS
-- deny-by-default, every access path a SECURITY DEFINER RPC that enforces
-- role/grants via auth.uid()).  Canonical project: fgsrcxxccdjqyrpkitmk.
--
-- Identity: a team member binds to auth.users(id) on first login (claim()).
-- Authorization model:
--   role super_admin > admin > member.
--   • super_admin / admin: implicitly hold every feature + team management.
--   • member: only the features explicitly granted (bookings, audit).
--   Team/role management is role-gated (never grantable to a plain member).
--
-- Security: EXECUTE is revoked from PUBLIC and re-granted only to the exact
-- principals each RPC needs (so internal _helpers stay private and only
-- request_quote is reachable by anon).  Mirrors the ops_* RLS hardening.
--
-- Idempotent where practical. After applying, expose `sani` to PostgREST:
--   alter role authenticator set pgrst.db_schemas =
--     'public, graphql_public, astroflow, grantflow, sani';
--   notify pgrst, 'reload config';
-- ============================================================================

create schema if not exists sani;

-- ── Tables ──────────────────────────────────────────────────────────────────
create table if not exists sani.team_members (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references auth.users(id) on delete set null,
  email        text not null,
  name         text,
  role         text not null default 'member' check (role in ('super_admin','admin','member')),
  status       text not null default 'invited' check (status in ('invited','active','suspended')),
  invited_by   uuid references sani.team_members(id) on delete set null,
  created_at   timestamptz not null default now(),
  activated_at timestamptz
);
create unique index if not exists team_members_email_key on sani.team_members (lower(email));

create table if not exists sani.grants (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references sani.team_members(id) on delete cascade,
  feature    text not null check (feature in ('bookings','audit')),
  granted_by uuid references sani.team_members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (member_id, feature)
);

create table if not exists sani.bookings (
  id            uuid primary key default gen_random_uuid(),
  event_name    text not null,
  contact_name  text,
  contact_email text,
  contact_phone text,
  event_date    date,
  location      text,
  attendees     int,
  units         int not null default 1,
  status        text not null default 'lead' check (status in ('lead','quoted','confirmed','deployed','closed','lost')),
  amount_mxn    numeric(12,2),
  notes         text,
  source        text not null default 'console',
  assigned_to   uuid references sani.team_members(id) on delete set null,
  created_by    uuid references sani.team_members(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists bookings_status_idx  on sani.bookings (status);
create index if not exists bookings_created_idx on sani.bookings (created_at desc);

create table if not exists sani.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references sani.team_members(id) on delete set null,
  actor_email text,
  action      text not null,
  target      text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_created_idx on sani.audit_log (created_at desc);

-- ── RLS: deny-by-default, no policies → all access via SECURITY DEFINER RPCs ──
alter table sani.team_members enable row level security;
alter table sani.grants       enable row level security;
alter table sani.bookings     enable row level security;
alter table sani.audit_log    enable row level security;

-- ── Internal helpers (private; never granted to clients) ─────────────────────
create or replace function sani._require_active()
returns sani.team_members
language plpgsql stable security definer set search_path = sani, public as $$
declare m sani.team_members;
begin
  select * into m from sani.team_members where user_id = auth.uid() and status = 'active' limit 1;
  if m.id is null then raise exception 'not authorized' using errcode = '42501'; end if;
  return m;
end; $$;

create or replace function sani._has_feature(m sani.team_members, p_feature text)
returns boolean
language sql stable security definer set search_path = sani, public as $$
  select m.status = 'active' and (
    m.role in ('admin','super_admin')
    or exists (select 1 from sani.grants g where g.member_id = m.id and g.feature = p_feature)
  );
$$;

create or replace function sani._audit(m sani.team_members, p_action text, p_target text, p_detail jsonb)
returns void
language sql security definer set search_path = sani, public as $$
  insert into sani.audit_log (actor_id, actor_email, action, target, detail)
  values (m.id, m.email, p_action, p_target, coalesce(p_detail, '{}'::jsonb));
$$;

-- ── me(): caller's identity + effective features (no side effects) ───────────
create or replace function sani.me()
returns jsonb
language plpgsql stable security definer set search_path = sani, public as $$
declare m sani.team_members; v_features text[];
begin
  select * into m from sani.team_members where user_id = auth.uid() limit 1;
  if m.id is null then return jsonb_build_object('member', null); end if;
  if m.role in ('admin','super_admin') then
    v_features := array['bookings','audit'];
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

-- ── claim(): bind the authenticated session to an invited member row ─────────
create or replace function sani.claim()
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare v_uid uuid := auth.uid(); v_email text; m sani.team_members;
begin
  if v_uid is null then raise exception 'no session' using errcode = '42501'; end if;
  select email into v_email from auth.users where id = v_uid;
  select * into m from sani.team_members where user_id = v_uid limit 1;
  if m.id is null and v_email is not null then
    update sani.team_members
       set user_id = v_uid,
           status = case when status = 'invited' then 'active' else status end,
           activated_at = coalesce(activated_at, now())
     where lower(email) = lower(v_email) and user_id is null
    returning * into m;
  end if;
  if m.id is null then return jsonb_build_object('member', null); end if;
  perform sani._audit(m, 'login', null, '{}'::jsonb);
  return sani.me();
end; $$;

-- ── Team management (role-gated) ─────────────────────────────────────────────
create or replace function sani.list_members()
returns jsonb
language plpgsql stable security definer set search_path = sani, public as $$
declare caller sani.team_members; result jsonb;
begin
  caller := sani._require_active();
  if caller.role not in ('admin','super_admin') then raise exception 'admins only' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) into result from (
    select tm.id, tm.email, tm.name, tm.role, tm.status, tm.created_at, tm.activated_at,
           coalesce((select array_agg(g.feature order by g.feature) from sani.grants g where g.member_id = tm.id), '{}') as features,
           inv.email as invited_by_email
    from sani.team_members tm
    left join sani.team_members inv on inv.id = tm.invited_by
  ) t;
  return result;
end; $$;

create or replace function sani.invite_member(p_email text, p_name text default null, p_role text default 'member')
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members; m sani.team_members;
begin
  caller := sani._require_active();
  if caller.role not in ('admin','super_admin') then raise exception 'admins only' using errcode = '42501'; end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  if p_role not in ('member','admin','super_admin') then raise exception 'invalid role'; end if;
  if p_role <> 'member' and caller.role <> 'super_admin' then
    raise exception 'only super_admin can assign elevated roles' using errcode = '42501';
  end if;
  insert into sani.team_members (email, name, role, invited_by, status)
  values (lower(p_email), nullif(p_name, ''), p_role, caller.id, 'invited')
  on conflict (lower(email)) do update set name = coalesce(excluded.name, team_members.name)
  returning * into m;
  perform sani._audit(caller, 'invite_member', m.id::text, jsonb_build_object('email', m.email, 'role', m.role));
  return sani.list_members();
end; $$;

create or replace function sani.set_role(p_member_id uuid, p_role text)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members;
begin
  caller := sani._require_active();
  if caller.role <> 'super_admin' then raise exception 'super_admin only' using errcode = '42501'; end if;
  if p_role not in ('member','admin','super_admin') then raise exception 'invalid role'; end if;
  if p_role <> 'super_admin'
     and exists (select 1 from sani.team_members where id = p_member_id and role = 'super_admin')
     and (select count(*) from sani.team_members where role = 'super_admin' and status = 'active') <= 1 then
    raise exception 'cannot demote the last super_admin';
  end if;
  update sani.team_members set role = p_role where id = p_member_id;
  perform sani._audit(caller, 'set_role', p_member_id::text, jsonb_build_object('role', p_role));
  return sani.list_members();
end; $$;

create or replace function sani.set_grant(p_member_id uuid, p_feature text, p_granted boolean)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members; tgt sani.team_members;
begin
  caller := sani._require_active();
  if caller.role not in ('admin','super_admin') then raise exception 'admins only' using errcode = '42501'; end if;
  if p_feature not in ('bookings','audit') then raise exception 'invalid feature'; end if;
  select * into tgt from sani.team_members where id = p_member_id;
  if tgt.id is null then raise exception 'member not found'; end if;
  if p_granted then
    insert into sani.grants (member_id, feature, granted_by) values (p_member_id, p_feature, caller.id)
    on conflict (member_id, feature) do nothing;
  else
    delete from sani.grants where member_id = p_member_id and feature = p_feature;
  end if;
  perform sani._audit(caller, case when p_granted then 'grant' else 'revoke' end,
                      p_member_id::text, jsonb_build_object('feature', p_feature));
  return sani.list_members();
end; $$;

create or replace function sani.set_status(p_member_id uuid, p_status text)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members; tgt sani.team_members;
begin
  caller := sani._require_active();
  if caller.role not in ('admin','super_admin') then raise exception 'admins only' using errcode = '42501'; end if;
  if p_status not in ('active','suspended') then raise exception 'invalid status'; end if;
  select * into tgt from sani.team_members where id = p_member_id;
  if tgt.id is null then raise exception 'member not found'; end if;
  if tgt.role in ('admin','super_admin') and caller.role <> 'super_admin' then
    raise exception 'only super_admin can change an admin''s status' using errcode = '42501';
  end if;
  if p_status = 'suspended' and tgt.role = 'super_admin'
     and (select count(*) from sani.team_members where role = 'super_admin' and status = 'active') <= 1 then
    raise exception 'cannot suspend the last super_admin';
  end if;
  update sani.team_members set status = p_status where id = p_member_id;
  perform sani._audit(caller, 'set_status', p_member_id::text, jsonb_build_object('status', p_status));
  return sani.list_members();
end; $$;

-- ── Bookings (feature: bookings) ─────────────────────────────────────────────
create or replace function sani.list_bookings()
returns jsonb
language plpgsql stable security definer set search_path = sani, public as $$
declare caller sani.team_members;
begin
  caller := sani._require_active();
  if not sani._has_feature(caller, 'bookings') then raise exception 'no bookings access' using errcode = '42501'; end if;
  return (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
    from (
      select b.id, b.event_name, b.contact_name, b.contact_email, b.contact_phone,
             b.event_date, b.location, b.attendees, b.units, b.status, b.amount_mxn,
             b.notes, b.source, b.assigned_to, am.name as assigned_name,
             b.created_at, b.updated_at
      from sani.bookings b
      left join sani.team_members am on am.id = b.assigned_to
    ) t
  );
end; $$;

create or replace function sani.create_booking(p jsonb)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members; v_id uuid;
begin
  caller := sani._require_active();
  if not sani._has_feature(caller, 'bookings') then raise exception 'no bookings access' using errcode = '42501'; end if;
  if coalesce(p->>'event_name','') = '' then raise exception 'event_name required'; end if;
  insert into sani.bookings (event_name, contact_name, contact_email, contact_phone, event_date,
                             location, attendees, units, status, amount_mxn, notes, source, created_by)
  values (
    p->>'event_name', p->>'contact_name', lower(nullif(p->>'contact_email','')), p->>'contact_phone',
    nullif(p->>'event_date','')::date, p->>'location',
    nullif(p->>'attendees','')::int, coalesce(nullif(p->>'units','')::int, 1),
    coalesce(nullif(p->>'status',''), 'lead'), nullif(p->>'amount_mxn','')::numeric,
    p->>'notes', 'console', caller.id
  ) returning id into v_id;
  perform sani._audit(caller, 'create_booking', v_id::text, jsonb_build_object('event', p->>'event_name'));
  return sani.list_bookings();
end; $$;

create or replace function sani.update_booking(p_id uuid, p jsonb)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members;
begin
  caller := sani._require_active();
  if not sani._has_feature(caller, 'bookings') then raise exception 'no bookings access' using errcode = '42501'; end if;
  update sani.bookings set
    event_name    = coalesce(nullif(p->>'event_name',''), event_name),
    contact_name  = coalesce(p->>'contact_name', contact_name),
    contact_email = coalesce(lower(nullif(p->>'contact_email','')), contact_email),
    contact_phone = coalesce(p->>'contact_phone', contact_phone),
    event_date    = coalesce(nullif(p->>'event_date','')::date, event_date),
    location      = coalesce(p->>'location', location),
    attendees     = coalesce(nullif(p->>'attendees','')::int, attendees),
    units         = coalesce(nullif(p->>'units','')::int, units),
    status        = coalesce(nullif(p->>'status',''), status),
    amount_mxn    = coalesce(nullif(p->>'amount_mxn','')::numeric, amount_mxn),
    notes         = coalesce(p->>'notes', notes),
    assigned_to   = coalesce(nullif(p->>'assigned_to','')::uuid, assigned_to),
    updated_at    = now()
  where id = p_id;
  if not found then raise exception 'booking not found'; end if;
  perform sani._audit(caller, 'update_booking', p_id::text, p - 'notes');
  return sani.list_bookings();
end; $$;

-- ── Public intake from the Sani Templo film CTA (anon-callable) ──────────────
create or replace function sani.request_quote(
  p_event text, p_name text, p_email text, p_phone text default null,
  p_date date default null, p_location text default null,
  p_attendees int default null, p_notes text default null)
returns uuid
language plpgsql security definer set search_path = sani, public as $$
declare v_id uuid;
begin
  if p_email is not null and p_email <> '' and p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;
  insert into sani.bookings (event_name, contact_name, contact_email, contact_phone,
                             event_date, location, attendees, notes, status, source)
  values (coalesce(nullif(p_event,''), '(solicitud web)'), p_name, lower(nullif(p_email,'')),
          p_phone, p_date, p_location, p_attendees, p_notes, 'lead', 'web')
  returning id into v_id;
  insert into sani.audit_log (action, target, detail)
  values ('request_quote', v_id::text, jsonb_build_object('event', p_event, 'email', p_email));
  return v_id;
end; $$;

-- ── Audit (feature: audit) ───────────────────────────────────────────────────
create or replace function sani.list_audit(p_limit int default 100)
returns jsonb
language plpgsql stable security definer set search_path = sani, public as $$
declare caller sani.team_members;
begin
  caller := sani._require_active();
  if not sani._has_feature(caller, 'audit') then raise exception 'no audit access' using errcode = '42501'; end if;
  return (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
    from (
      select a.id, a.actor_email, a.action, a.target, a.detail, a.created_at
      from sani.audit_log a order by a.created_at desc limit greatest(1, least(p_limit, 500))
    ) t
  );
end; $$;

-- ── Privilege hardening: revoke PUBLIC, grant only what each principal needs ──
revoke execute on all functions in schema sani from public;
grant usage on schema sani to anon, authenticated, service_role;

grant execute on function sani.me()                                          to authenticated, service_role;
grant execute on function sani.claim()                                       to authenticated, service_role;
grant execute on function sani.list_members()                                to authenticated, service_role;
grant execute on function sani.invite_member(text, text, text)               to authenticated, service_role;
grant execute on function sani.set_role(uuid, text)                          to authenticated, service_role;
grant execute on function sani.set_grant(uuid, text, boolean)                to authenticated, service_role;
grant execute on function sani.set_status(uuid, text)                        to authenticated, service_role;
grant execute on function sani.list_bookings()                               to authenticated, service_role;
grant execute on function sani.create_booking(jsonb)                         to authenticated, service_role;
grant execute on function sani.update_booking(uuid, jsonb)                   to authenticated, service_role;
grant execute on function sani.list_audit(int)                               to authenticated, service_role;
grant execute on function sani.request_quote(text, text, text, text, date, text, int, text)
                                                                             to anon, authenticated, service_role;

-- ── Seed the founding super_admin (binds to the existing auth user) ──────────
insert into sani.team_members (email, name, role, status, user_id, activated_at)
select 'cryptocoatl101@gmail.com', 'Steph Ferrera', 'super_admin', 'active', u.id, now()
from auth.users u where lower(u.email) = 'cryptocoatl101@gmail.com'
on conflict (lower(email)) do update
  set role = 'super_admin', status = 'active',
      user_id = excluded.user_id,
      activated_at = coalesce(team_members.activated_at, now());
