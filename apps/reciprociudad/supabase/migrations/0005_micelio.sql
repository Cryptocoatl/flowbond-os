-- ============================================================================
-- MiCelio — the communication & validation mesh for Sani Templo.
-- Everything that happens emits a SIGNAL; signals that move custody require
-- TWO-PARTY confirmation (handoff) to become 'validated'; validated signals
-- advance the cycle (pickup → delivery → compost/FlowGarden). Missions tie
-- members' skills to the work, with XP on validation. Extends 0002–0004
-- (RLS deny-by-default, SECURITY DEFINER RPCs, EXECUTE revoked from PUBLIC).
-- ============================================================================

-- members gain skills (from their onboarding areas) + an XP balance
alter table sani.team_members
  add column if not exists xp     int    not null default 0,
  add column if not exists skills text[] not null default '{}';

-- ── signals: the mycelial event mesh (feed + traceability) ───────────────────
create table if not exists sani.signals (
  id                  uuid primary key default gen_random_uuid(),
  kind                text not null,                  -- pickup_requested, picked_up, delivered, mission_submitted, compost_received…
  ref_type            text,                           -- pickup | mission | booking | node | delivery
  ref_id              uuid,
  node_id             uuid references sani.nodes(id) on delete set null,
  actor_id            uuid references sani.team_members(id) on delete set null,
  payload             jsonb not null default '{}'::jsonb,
  requires_validation boolean not null default false,
  required_parties    int not null default 2,
  validation_state    text not null default 'open' check (validation_state in ('open','validated','disputed')),
  created_at          timestamptz not null default now()
);
create index if not exists signals_created_idx on sani.signals (created_at desc);
create index if not exists signals_open_idx on sani.signals (validation_state) where requires_validation;

-- ── confirmations: two-party handoff sign-offs on a signal ───────────────────
create table if not exists sani.confirmations (
  id           uuid primary key default gen_random_uuid(),
  signal_id    uuid not null references sani.signals(id) on delete cascade,
  party        text not null,                          -- origin | carrier | destination | doer | validator
  confirmed_by uuid references sani.team_members(id) on delete set null,
  note         text,
  evidence     jsonb not null default '{}'::jsonb,     -- future: photo + gps
  created_at   timestamptz not null default now(),
  unique (signal_id, party)
);

-- ── missions: coordination — skills ↔ work, assign, validate, reward ─────────
create table if not exists sani.missions (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  kind            text not null default 'custom' check (kind in ('recoleccion','montaje','mantenimiento','ventas','comunidad','custom')),
  node_id         uuid references sani.nodes(id) on delete set null,
  booking_id      uuid references sani.bookings(id) on delete set null,
  pickup_id       uuid references sani.pickups(id) on delete set null,
  required_skills text[] not null default '{}',
  assigned_to     uuid references sani.team_members(id) on delete set null,
  status          text not null default 'open' check (status in ('open','claimed','in_progress','submitted','validated','done','canceled')),
  reward_xp       int not null default 0,
  due_at          timestamptz,
  created_by      uuid references sani.team_members(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists missions_status_idx on sani.missions (status);

alter table sani.signals       enable row level security;
alter table sani.confirmations enable row level security;
alter table sani.missions      enable row level security;

-- ── internal: emit a signal ──────────────────────────────────────────────────
create or replace function sani._emit(p_kind text, p_ref_type text, p_ref_id uuid, p_node uuid,
  p_actor uuid, p_payload jsonb, p_requires boolean default false, p_parties int default 2)
returns uuid
language plpgsql security definer set search_path = sani, public as $$
declare v_id uuid;
begin
  insert into sani.signals (kind, ref_type, ref_id, node_id, actor_id, payload, requires_validation, required_parties, validation_state)
  values (p_kind, p_ref_type, p_ref_id, p_node, p_actor, coalesce(p_payload, '{}'::jsonb),
          p_requires, greatest(coalesce(p_parties, 2), 1),
          case when p_requires then 'open' else 'validated' end)
  returning id into v_id;
  return v_id;
end; $$;

-- ── MiCelio feed: every active member can see the network ─────────────────────
create or replace function sani.micelio_feed(p_limit int default 80)
returns jsonb
language plpgsql stable security definer set search_path = sani, public as $$
declare caller sani.team_members;
begin
  caller := sani._require_active();
  return (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
    from (
      select s.id, s.kind, s.ref_type, s.ref_id, s.payload, s.requires_validation, s.required_parties,
             s.validation_state, s.created_at, n.name as node_name, am.name as actor_name,
             (select count(*) from sani.confirmations c where c.signal_id = s.id) as confirms
      from sani.signals s
      left join sani.nodes n on n.id = s.node_id
      left join sani.team_members am on am.id = s.actor_id
      order by s.created_at desc limit greatest(1, least(p_limit, 300))
    ) t
  );
end; $$;

-- ── Pending validations (open handoffs awaiting confirmation) ────────────────
create or replace function sani.micelio_pending()
returns jsonb
language plpgsql stable security definer set search_path = sani, public as $$
declare caller sani.team_members;
begin
  caller := sani._require_active();
  return (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb)
    from (
      select s.id, s.kind, s.ref_type, s.ref_id, s.payload, s.required_parties, s.created_at,
             n.name as node_name,
             coalesce((select array_agg(c.party order by c.party) from sani.confirmations c where c.signal_id = s.id), '{}') as confirmed_parties,
             (select count(*) from sani.confirmations c where c.signal_id = s.id) as confirms
      from sani.signals s
      left join sani.nodes n on n.id = s.node_id
      where s.requires_validation and s.validation_state = 'open'
    ) t
  );
end; $$;

-- ── Confirm a party on a handoff; validate + advance the cycle when complete ──
create or replace function sani.confirm_signal(p_signal_id uuid, p_party text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members; s sani.signals; v_confirms int; v_new_status text;
begin
  caller := sani._require_active();
  select * into s from sani.signals where id = p_signal_id;
  if s.id is null then raise exception 'signal not found'; end if;
  if not s.requires_validation then raise exception 'signal needs no validation'; end if;
  insert into sani.confirmations (signal_id, party, confirmed_by, note)
  values (p_signal_id, coalesce(nullif(p_party, ''), 'party'), caller.id, nullif(p_note, ''))
  on conflict (signal_id, party) do update set confirmed_by = excluded.confirmed_by, note = coalesce(excluded.note, sani.confirmations.note);
  select count(*) into v_confirms from sani.confirmations where signal_id = p_signal_id;
  if v_confirms >= s.required_parties and s.validation_state = 'open' then
    update sani.signals set validation_state = 'validated' where id = p_signal_id;
    -- advance the cycle: a validated pickup handoff moves the pickup forward
    v_new_status := s.payload->>'advance_pickup_to';
    if s.ref_type = 'pickup' and v_new_status is not null and s.ref_id is not null then
      update sani.pickups set status = v_new_status, updated_at = now() where id = s.ref_id;
      if v_new_status = 'dropped_off' then
        perform sani._emit('compost_received', 'pickup', s.ref_id, s.node_id, caller.id,
                           jsonb_build_object('buckets', (select buckets from sani.pickups where id = s.ref_id),
                                              'to_flowgarden', true), false, 2);
      end if;
    end if;
  end if;
  return sani.micelio_pending();
end; $$;

-- ── Missions ─────────────────────────────────────────────────────────────────
create or replace function sani.list_missions()
returns jsonb
language plpgsql stable security definer set search_path = sani, public as $$
declare caller sani.team_members;
begin
  caller := sani._require_active();
  return (
    select coalesce(jsonb_agg(to_jsonb(t) order by (t.status = 'done'), t.created_at desc), '[]'::jsonb)
    from (
      select m.id, m.title, m.description, m.kind, m.node_id, n.name as node_name,
             m.required_skills, m.assigned_to, am.name as assigned_name, m.status,
             m.reward_xp, m.due_at, m.created_at,
             (m.assigned_to = caller.id) as is_mine,
             (m.required_skills = '{}' or m.required_skills && caller.skills) as skill_match
      from sani.missions m
      left join sani.nodes n on n.id = m.node_id
      left join sani.team_members am on am.id = m.assigned_to
    ) t
  );
end; $$;

create or replace function sani.create_mission(p jsonb)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members; v_id uuid; v_assignee uuid; v_status text;
begin
  caller := sani._require_active();
  if caller.role not in ('admin','super_admin') then raise exception 'coordinadores only' using errcode = '42501'; end if;
  if coalesce(p->>'title','') = '' then raise exception 'title required'; end if;
  v_assignee := nullif(p->>'assigned_to','')::uuid;
  v_status := case when v_assignee is not null then 'claimed' else 'open' end;
  insert into sani.missions (title, description, kind, node_id, pickup_id, required_skills,
                             assigned_to, status, reward_xp, due_at, created_by)
  values (
    p->>'title', nullif(p->>'description',''), coalesce(nullif(p->>'kind',''), 'custom'),
    nullif(p->>'node_id','')::uuid, nullif(p->>'pickup_id','')::uuid,
    coalesce((select array(select jsonb_array_elements_text(p->'required_skills'))), '{}'),
    v_assignee, v_status, coalesce(nullif(p->>'reward_xp','')::int, 0), nullif(p->>'due_at','')::timestamptz, caller.id
  ) returning id into v_id;
  perform sani._emit(case when v_assignee is not null then 'mission_assigned' else 'mission_created' end,
                     'mission', v_id, nullif(p->>'node_id','')::uuid, caller.id,
                     jsonb_build_object('title', p->>'title'), false, 2);
  return sani.list_missions();
end; $$;

create or replace function sani.claim_mission(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members; m sani.missions;
begin
  caller := sani._require_active();
  select * into m from sani.missions where id = p_id;
  if m.id is null then raise exception 'mission not found'; end if;
  if m.status <> 'open' then raise exception 'mission not open'; end if;
  update sani.missions set assigned_to = caller.id, status = 'claimed', updated_at = now() where id = p_id;
  perform sani._emit('mission_claimed', 'mission', p_id, m.node_id, caller.id, jsonb_build_object('title', m.title), false, 2);
  return sani.list_missions();
end; $$;

create or replace function sani.submit_mission(p_id uuid, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members; m sani.missions;
begin
  caller := sani._require_active();
  select * into m from sani.missions where id = p_id;
  if m.id is null then raise exception 'mission not found'; end if;
  if m.assigned_to <> caller.id then raise exception 'not your mission' using errcode = '42501'; end if;
  if m.status not in ('claimed','in_progress') then raise exception 'mission not in progress'; end if;
  update sani.missions set status = 'submitted', updated_at = now() where id = p_id;
  -- emit a handoff that a coordinator validates (doer already implicit → 1 confirm needed)
  perform sani._emit('mission_submitted', 'mission', p_id, m.node_id, caller.id,
                     jsonb_build_object('title', m.title, 'note', p_note), true, 1);
  return sani.list_missions();
end; $$;

create or replace function sani.validate_mission(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members; m sani.missions;
begin
  caller := sani._require_active();
  if caller.role not in ('admin','super_admin') then raise exception 'coordinadores only' using errcode = '42501'; end if;
  select * into m from sani.missions where id = p_id;
  if m.id is null then raise exception 'mission not found'; end if;
  if m.status <> 'submitted' then raise exception 'mission not submitted'; end if;
  update sani.missions set status = 'done', updated_at = now() where id = p_id;
  if m.assigned_to is not null and m.reward_xp > 0 then
    update sani.team_members set xp = xp + m.reward_xp where id = m.assigned_to;
  end if;
  -- close any open submission signal for this mission
  update sani.signals set validation_state = 'validated'
   where ref_type = 'mission' and ref_id = p_id and kind = 'mission_submitted' and validation_state = 'open';
  perform sani._emit('mission_done', 'mission', p_id, m.node_id, caller.id,
                     jsonb_build_object('title', m.title, 'xp', m.reward_xp), false, 2);
  return sani.list_missions();
end; $$;

create or replace function sani.cancel_mission(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members;
begin
  caller := sani._require_active();
  if caller.role not in ('admin','super_admin') then raise exception 'coordinadores only' using errcode = '42501'; end if;
  update sani.missions set status = 'canceled', updated_at = now() where id = p_id;
  if not found then raise exception 'mission not found'; end if;
  return sani.list_missions();
end; $$;

-- ── apply_to_team(): also derive skills from the questionnaire areas ──────────
create or replace function sani.apply_to_team(
  p_profile jsonb, p_suggested_role text default 'member', p_suggested_features text[] default '{}')
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare v_uid uuid := auth.uid(); v_email text; v_name text; v_skills text[]; m sani.team_members;
begin
  if v_uid is null then raise exception 'no session' using errcode = '42501'; end if;
  select email into v_email from auth.users where id = v_uid;
  if v_email is null then raise exception 'no email'; end if;
  v_name := nullif(p_profile->>'name', '');
  v_skills := coalesce((select array(select jsonb_array_elements_text(p_profile->'areas'))), '{}');
  select * into m from sani.team_members where user_id = v_uid or lower(email) = lower(v_email) limit 1;
  if m.id is null then
    insert into sani.team_members (user_id, email, name, role, status, profile, suggested_role, suggested_features, skills, applied_at)
    values (v_uid, lower(v_email), v_name, 'member', 'invited', coalesce(p_profile, '{}'::jsonb),
            coalesce(nullif(p_suggested_role, ''), 'member'), coalesce(p_suggested_features, '{}'), v_skills, now())
    returning * into m;
  else
    update sani.team_members set
      user_id = coalesce(user_id, v_uid), name = coalesce(v_name, name),
      profile = coalesce(p_profile, '{}'::jsonb),
      suggested_role = coalesce(nullif(p_suggested_role, ''), suggested_role),
      suggested_features = coalesce(p_suggested_features, suggested_features),
      skills = v_skills, applied_at = coalesce(applied_at, now())
    where id = m.id returning * into m;
  end if;
  perform sani._audit(m, 'apply_to_team', m.id::text, jsonb_build_object('suggested_role', p_suggested_role));
  return sani.me();
end; $$;

-- ── wire the logistics cycle to emit MiCelio signals ─────────────────────────
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
  perform sani._audit(caller, 'create_pickup', v_id::text, jsonb_build_object('node', n.name, 'buckets', greatest(coalesce(p_buckets,1),1)));
  perform sani._emit('pickup_requested', 'pickup', v_id, p_node_id, caller.id,
                     jsonb_build_object('node', n.name, 'buckets', greatest(coalesce(p_buckets,1),1)), false, 2);
  return jsonb_build_object(
    'pickup_id', v_id, 'node_name', n.name, 'node_address', n.address,
    'node_lat', n.lat, 'node_lng', n.lng,
    'buckets', greatest(coalesce(p_buckets,1),1),
    'dropoff_label', nullif(p_dropoff_label,''), 'dropoff_address', nullif(p_dropoff_address,'')
  );
end; $$;

create or replace function sani.set_pickup_refirides(p_id uuid, p_job_id text,
  p_external_id text default null, p_quote jsonb default null, p_status text default 'scheduled')
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members; p sani.pickups;
begin
  caller := sani._require_active();
  if not sani._has_feature(caller, 'logistics') then raise exception 'no logistics access' using errcode = '42501'; end if;
  update sani.pickups set
    refirides_job_id = p_job_id, refirides_external_id = nullif(p_external_id,''),
    quote = coalesce(p_quote, quote), status = coalesce(nullif(p_status,''), status), updated_at = now()
  where id = p_id returning * into p;
  if p.id is null then raise exception 'pickup not found'; end if;
  perform sani._audit(caller, 'pickup_dispatched', p_id::text, jsonb_build_object('job', p_job_id));
  perform sani._emit('pickup_dispatched', 'pickup', p_id, p.node_id, caller.id,
                     jsonb_build_object('job', p_job_id, 'buckets', p.buckets), false, 2);
  return sani.list_pickups();
end; $$;

create or replace function sani.update_pickup_status(p_id uuid, p_status text)
returns jsonb
language plpgsql security definer set search_path = sani, public as $$
declare caller sani.team_members; p sani.pickups;
begin
  caller := sani._require_active();
  if not sani._has_feature(caller, 'logistics') then raise exception 'no logistics access' using errcode = '42501'; end if;
  if p_status not in ('requested','scheduled','picked_up','dropped_off','done','canceled') then
    raise exception 'invalid status';
  end if;
  update sani.pickups set status = p_status, updated_at = now() where id = p_id returning * into p;
  if p.id is null then raise exception 'pickup not found'; end if;
  perform sani._audit(caller, 'pickup_status', p_id::text, jsonb_build_object('status', p_status));
  perform sani._emit('pickup_' || p_status, 'pickup', p_id, p.node_id, caller.id,
                     jsonb_build_object('buckets', p.buckets), false, 2);
  if p_status = 'dropped_off' then
    perform sani._emit('compost_received', 'pickup', p_id, p.node_id, caller.id,
                       jsonb_build_object('buckets', p.buckets, 'to_flowgarden', true), false, 2);
  end if;
  return sani.list_pickups();
end; $$;

-- ── me(): expose xp + skills ─────────────────────────────────────────────────
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
    select coalesce(array_agg(feature order by feature), '{}') into v_features from sani.grants where member_id = m.id;
  end if;
  return jsonb_build_object(
    'member', jsonb_build_object(
      'id', m.id, 'email', m.email, 'name', m.name, 'role', m.role, 'status', m.status,
      'activated_at', m.activated_at, 'xp', m.xp, 'skills', to_jsonb(m.skills)),
    'features', to_jsonb(v_features),
    'can_manage_team', m.role in ('admin','super_admin'),
    'is_super', m.role = 'super_admin'
  );
end; $$;

-- ── privilege hardening ──────────────────────────────────────────────────────
revoke execute on all functions in schema sani from public;
grant execute on function sani.me()                                        to authenticated, service_role;
grant execute on function sani.apply_to_team(jsonb, text, text[])          to authenticated, service_role;
grant execute on function sani.micelio_feed(int)                           to authenticated, service_role;
grant execute on function sani.micelio_pending()                           to authenticated, service_role;
grant execute on function sani.confirm_signal(uuid, text, text)            to authenticated, service_role;
grant execute on function sani.list_missions()                             to authenticated, service_role;
grant execute on function sani.create_mission(jsonb)                       to authenticated, service_role;
grant execute on function sani.claim_mission(uuid)                         to authenticated, service_role;
grant execute on function sani.submit_mission(uuid, text)                  to authenticated, service_role;
grant execute on function sani.validate_mission(uuid)                      to authenticated, service_role;
grant execute on function sani.cancel_mission(uuid)                        to authenticated, service_role;
grant execute on function sani.create_pickup(uuid, int, text, text)        to authenticated, service_role;
grant execute on function sani.set_pickup_refirides(uuid, text, text, jsonb, text) to authenticated, service_role;
grant execute on function sani.update_pickup_status(uuid, text)            to authenticated, service_role;
