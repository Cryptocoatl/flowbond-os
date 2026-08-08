-- =============================================================================
-- 02 · KAI WORLD — Living Earth (V1) — schema, RLS, RPCs, seed.
-- APPLIED to canonical fgsrcxxccdjqyrpkitmk (prod) 2026-07-16 as three migrations:
--   kai_world_v1_living_earth, kai_world_v1_harden_grants_views,
--   kai_world_v1_fix_is_admin_rls_exec. This file is the consolidated final state
--   (a fresh apply reproduces prod exactly). Branch /test was unavailable (Pro-gated).
--
-- Pattern A (strict):
--   • kai_-prefixed tables in the public schema (mirrors app_vpa_ in `voces`)
--   • FK root to public.flowbond_users(id) = FBID = auth.uid()
--   • RLS enabled on EVERY table; the client never INSERT/UPDATE/DELETEs
--   • ALL mutations through SECURITY DEFINER RPCs
--   • append-only audit ledger; soulbound XP with no redemption path
--   • admin = public.is_superadmin(fbid) OR membership in kai_validators
--
-- Every [DECISION] mirrors a choice in docs/kai-world/01_STATE_LAYER_SPEC.md.
-- =============================================================================

-- ---------- Extensions ----------
create extension if not exists pgcrypto;   -- gen_random_uuid()

-- =============================================================================
-- TABLES
-- =============================================================================

-- Regions. Current state lives on the row (realtime-subscribable); the derivation
-- history lives in kai_region_index_samples + kai_pulse_events.
create table if not exists kai_regions (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  splat_url       text not null,                     -- R2 URL of the .spz
  -- geofence (proof validation) + weights + visualMapping override
  config          jsonb not null default '{}'::jsonb,
  bounds_lat      double precision not null,
  bounds_lng      double precision not null,
  bounds_radius_m double precision not null default 4000,
  -- current visual state (0..1), recomputed by kai_recompute_region_state
  vitality        double precision not null default 0.3 check (vitality between 0 and 1),
  canopy          double precision not null default 0.3 check (canopy between 0 and 1),
  water           double precision not null default 0.3 check (water between 0 and 1),
  biodiversity    double precision not null default 0.2 check (biodiversity between 0 and 1),
  community_pulse double precision not null default 0.0 check (community_pulse between 0 and 1),
  published       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Mission types. quorum defaults to 1 (single admin approval, V1). [DECISION D2]
create table if not exists kai_mission_types (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  xp_reward  integer not null default 10 check (xp_reward >= 0),
  pulse_weight double precision not null default 0.3 check (pulse_weight between 0 and 1),
  quorum     integer not null default 1 check (quorum >= 1),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Validators roster (who may approve proofs). Admins are also superadmins.
create table if not exists kai_validators (
  fbid       uuid primary key references public.flowbond_users(id) on delete cascade,
  added_by   uuid references public.flowbond_users(id) on delete set null,
  note       text,
  created_at timestamptz not null default now()
);

-- Proof submissions. status transitions pending → validated | rejected.
create table if not exists kai_proofs (
  id             uuid primary key default gen_random_uuid(),
  region_id      uuid not null references kai_regions(id) on delete cascade,
  mission_id     uuid not null references kai_mission_types(id) on delete restrict,
  submitter_fbid uuid not null references public.flowbond_users(id) on delete restrict,
  lat            double precision not null,
  lng            double precision not null,
  performed_at   timestamptz not null,
  media_key      text not null,                      -- R2 object key
  media_hash     text not null,                      -- sha256 hex, dup rejection
  status         text not null default 'pending'
                   check (status in ('pending','validated','rejected')),
  validator_fbid uuid references public.flowbond_users(id) on delete set null,
  validated_at   timestamptz,
  note           text,
  submitted_at   timestamptz not null default now(),
  -- anti-fraud: one media reuse rejected per region
  unique (region_id, media_hash)
);
create index if not exists kai_proofs_region_status_idx on kai_proofs(region_id, status);
create index if not exists kai_proofs_submitter_idx on kai_proofs(submitter_fbid);

-- Append-only ledger of verified-mission contributions to communityPulse.
create table if not exists kai_pulse_events (
  id           uuid primary key default gen_random_uuid(),
  region_id    uuid not null references kai_regions(id) on delete cascade,
  proof_id     uuid not null unique references kai_proofs(id) on delete cascade,
  weight       double precision not null check (weight between 0 and 1),
  validated_at timestamptz not null default now()
);
create index if not exists kai_pulse_region_idx on kai_pulse_events(region_id, validated_at);

-- Append-only satellite/observation index samples (audit of derivation).
create table if not exists kai_region_index_samples (
  id           uuid primary key default gen_random_uuid(),
  region_id    uuid not null references kai_regions(id) on delete cascade,
  ndvi         double precision not null,            -- native -1..1
  ndwi         double precision not null,            -- native -1..1
  observations integer not null default 0,
  source       text,
  sampled_at   timestamptz not null default now()
);
create index if not exists kai_index_region_idx on kai_region_index_samples(region_id, sampled_at desc);

-- Append-only soulbound XP ledger. No transfer, no redemption. [spec §6]
create table if not exists kai_xp_ledger (
  id         uuid primary key default gen_random_uuid(),
  fbid       uuid not null references public.flowbond_users(id) on delete restrict,
  amount     integer not null check (amount > 0),
  reason     text not null,
  proof_id   uuid unique references kai_proofs(id) on delete set null, -- idempotent per proof
  granted_at timestamptz not null default now()
);
create index if not exists kai_xp_fbid_idx on kai_xp_ledger(fbid);

-- Append-only audit trail of every mutation.
create table if not exists kai_audit (
  id         bigint generated always as identity primary key,
  actor_fbid uuid,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  diff       jsonb,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- HELPERS
-- =============================================================================

-- Admin = superadmin OR listed validator.
create or replace function kai_is_admin(p_fbid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_fbid is not null and (
    coalesce(public.is_superadmin(p_fbid), false)
    or exists (select 1 from kai_validators v where v.fbid = p_fbid)
  );
$$;

create or replace function kai__audit(p_action text, p_entity text, p_id uuid, p_diff jsonb)
returns void language sql security definer set search_path = public as $$
  insert into kai_audit(actor_fbid, action, entity, entity_id, diff)
  values (auth.uid(), p_action, p_entity, p_id, p_diff);
$$;

-- Great-circle distance in meters (geofence check).
create or replace function kai_haversine_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- clamp to 0..1
create or replace function kai_clamp01(x double precision) returns double precision
language sql immutable as $$ select greatest(0, least(1, x)); $$;

-- =============================================================================
-- STATE RECOMPUTE — mirrors packages/state-engine/src/health.ts exactly.
-- Weights read from region.config.weights with the spec §3 defaults.
-- =============================================================================
create or replace function kai_recompute_region_state(p_region_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r              kai_regions%rowtype;
  cfg            jsonb;
  w_canopy       double precision;
  w_water        double precision;
  w_bio          double precision;
  w_pulse        double precision;
  w_total        double precision;
  obs_cap        double precision;
  half_life_days double precision;
  s              kai_region_index_samples%rowtype;
  v_canopy       double precision := 0;
  v_water        double precision := 0;
  v_bio          double precision := 0;
  v_pulse        double precision := 0;
  v_vitality     double precision := 0;
  lambda         double precision;
begin
  select * into r from kai_regions where id = p_region_id;
  if not found then raise exception 'unknown region'; end if;
  cfg := coalesce(r.config->'weights', '{}'::jsonb);

  w_canopy       := coalesce((cfg#>>'{vitality,canopy}')::double precision, 0.4);
  w_water        := coalesce((cfg#>>'{vitality,water}')::double precision, 0.2);
  w_bio          := coalesce((cfg#>>'{vitality,biodiversity}')::double precision, 0.2);
  w_pulse        := coalesce((cfg#>>'{vitality,communityPulse}')::double precision, 0.2);
  w_total        := nullif(w_canopy + w_water + w_bio + w_pulse, 0);
  obs_cap        := coalesce((cfg->>'observationCap')::double precision, 500);
  half_life_days := coalesce((cfg->>'pulseHalfLifeDays')::double precision, 14);

  -- latest index sample → canopy/water/biodiversity
  select * into s from kai_region_index_samples
   where region_id = p_region_id order by sampled_at desc limit 1;
  if found then
    v_canopy := kai_clamp01((s.ndvi - 0.2) / 0.6);
    v_water  := kai_clamp01((s.ndwi + 0.1) / 0.5);
    if s.observations > 0 then
      v_bio := kai_clamp01(ln(1 + s.observations) / ln(1 + obs_cap));
    end if;
  else
    -- no samples yet: keep whatever the row already holds for these channels
    v_canopy := r.canopy; v_water := r.water; v_bio := r.biodiversity;
  end if;

  -- decayed sum of verified-mission contributions → communityPulse
  lambda := ln(2) / (half_life_days * 86400.0);   -- per second
  select kai_clamp01(coalesce(sum(
           weight * exp(-lambda * greatest(0, extract(epoch from (now() - validated_at))))
         ), 0))
    into v_pulse
    from kai_pulse_events where region_id = p_region_id;

  v_vitality := kai_clamp01(
    (w_canopy * v_canopy + w_water * v_water + w_bio * v_bio + w_pulse * v_pulse)
    / coalesce(w_total, 1)
  );

  update kai_regions set
    canopy = v_canopy, water = v_water, biodiversity = v_bio,
    community_pulse = v_pulse, vitality = v_vitality, updated_at = now()
  where id = p_region_id;
end; $$;

-- =============================================================================
-- READ CONTRACT — kai_get_region (the single read any renderer uses)
-- =============================================================================
create or replace function kai_get_region(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'slug', slug, 'name', name, 'splatUrl', splat_url,
    'bounds', jsonb_build_object('lat', bounds_lat, 'lng', bounds_lng, 'radiusM', bounds_radius_m),
    'mapping', config->'visualMapping',
    'state', jsonb_build_object(
      'vitality', vitality, 'canopy', canopy, 'water', water,
      'biodiversity', biodiversity, 'communityPulse', community_pulse
    )
  )
  from kai_regions where slug = p_slug and published = true;
$$;

-- =============================================================================
-- WRITE RPCs
-- =============================================================================

-- Submit a proof. Enforces auth, geofence, one-pending-per-day, dup-media.
create or replace function kai_submit_proof(
  p_region_slug text, p_mission_slug text,
  p_lat double precision, p_lng double precision,
  p_performed_at timestamptz, p_media_key text, p_media_hash text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  r         kai_regions%rowtype;
  m         kai_mission_types%rowtype;
  v_dist    double precision;
  v_id      uuid;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select * into r from kai_regions where slug = p_region_slug and published = true;
  if not found then raise exception 'unknown region'; end if;
  select * into m from kai_mission_types where slug = p_mission_slug and active = true;
  if not found then raise exception 'unknown mission'; end if;

  -- geofence
  v_dist := kai_haversine_m(p_lat, p_lng, r.bounds_lat, r.bounds_lng);
  if v_dist > r.bounds_radius_m then
    raise exception 'outside region geofence (% m)', round(v_dist);
  end if;

  -- one pending per user per mission per day
  if exists (
    select 1 from kai_proofs
     where submitter_fbid = v_uid and mission_id = m.id and status = 'pending'
       and submitted_at::date = now()::date
  ) then
    raise exception 'you already have a pending proof for this mission today';
  end if;

  insert into kai_proofs(region_id, mission_id, submitter_fbid, lat, lng,
                         performed_at, media_key, media_hash)
  values (r.id, m.id, v_uid, p_lat, p_lng, p_performed_at, p_media_key, p_media_hash)
  returning id into v_id;   -- (region_id, media_hash) UNIQUE rejects dup media

  perform kai__audit('submit_proof', 'kai_proofs', v_id,
    jsonb_build_object('region', p_region_slug, 'mission', p_mission_slug));
  return v_id;
end; $$;

-- Validate (approve/reject). validator ≠ submitter. On approval, atomically:
-- pulse event → recompute state → grant soulbound XP → audit.
create or replace function kai_validate_proof(
  p_proof_id uuid, p_decision text, p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  pr    kai_proofs%rowtype;
  m     kai_mission_types%rowtype;
begin
  if not kai_is_admin(v_uid) then raise exception 'forbidden'; end if;
  if p_decision not in ('validated','rejected') then raise exception 'bad decision'; end if;

  select * into pr from kai_proofs where id = p_proof_id for update;
  if not found then raise exception 'unknown proof'; end if;
  if pr.status <> 'pending' then raise exception 'proof already resolved'; end if;
  if pr.submitter_fbid = v_uid then raise exception 'validator cannot be submitter'; end if;

  update kai_proofs set status = p_decision, validator_fbid = v_uid,
         validated_at = now(), note = p_note where id = p_proof_id;

  if p_decision = 'validated' then
    select * into m from kai_mission_types where id = pr.mission_id;
    insert into kai_pulse_events(region_id, proof_id, weight)
      values (pr.region_id, pr.id, m.pulse_weight)
      on conflict (proof_id) do nothing;
    perform kai_recompute_region_state(pr.region_id);
    insert into kai_xp_ledger(fbid, amount, reason, proof_id)
      values (pr.submitter_fbid, m.xp_reward, 'mission:' || m.slug, pr.id)
      on conflict (proof_id) do nothing;   -- soulbound, idempotent per proof
  end if;

  perform kai__audit('validate_proof', 'kai_proofs', p_proof_id,
    jsonb_build_object('decision', p_decision));
end; $$;

-- Ingestion entry (called by the Workers cron as service_role): record a sample
-- then recompute. Kept as an RPC so even the cron never writes tables directly.
create or replace function kai_ingest_indices(
  p_region_slug text, p_ndvi double precision, p_ndwi double precision,
  p_observations integer, p_source text default 'cron'
) returns void language plpgsql security definer set search_path = public as $$
declare r kai_regions%rowtype;
begin
  if coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') <> 'service_role'
     and not kai_is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;
  select * into r from kai_regions where slug = p_region_slug;
  if not found then raise exception 'unknown region'; end if;
  insert into kai_region_index_samples(region_id, ndvi, ndwi, observations, source)
    values (r.id, p_ndvi, p_ndwi, p_observations, p_source);
  perform kai_recompute_region_state(r.id);
  perform kai__audit('ingest_indices', 'kai_regions', r.id,
    jsonb_build_object('ndvi', p_ndvi, 'ndwi', p_ndwi, 'obs', p_observations));
end; $$;

-- =============================================================================
-- VIEWS
-- =============================================================================
-- Public state view (published regions only) — realtime subscription target.
-- security_invoker: the view runs under the querying user's RLS (never bypasses it).
create or replace view kai_region_state with (security_invoker = on) as
  select slug, name, vitality, canopy, water, biodiversity, community_pulse, updated_at
  from kai_regions where published = true;

-- Admin proof queue. security_invoker so kai_proofs RLS (own-or-admin) still applies
-- — a definer view here would leak every user's proof to any authenticated user.
create or replace view kai_proofs_admin with (security_invoker = on) as
  select p.id, r.slug as region_slug, mt.slug as mission_slug, p.submitter_fbid,
         p.lat, p.lng, p.performed_at, p.media_key, p.media_hash, p.status,
         p.validator_fbid, p.validated_at, p.submitted_at
  from kai_proofs p
  join kai_regions r on r.id = p.region_id
  join kai_mission_types mt on mt.id = p.mission_id;

-- =============================================================================
-- RLS — enable on every table; SELECT policies only (writes go through RPCs).
-- =============================================================================
alter table kai_regions              enable row level security;
alter table kai_mission_types        enable row level security;
alter table kai_validators           enable row level security;
alter table kai_proofs               enable row level security;
alter table kai_pulse_events         enable row level security;
alter table kai_region_index_samples enable row level security;
alter table kai_xp_ledger            enable row level security;
alter table kai_audit                enable row level security;

-- regions: published rows are world-readable; drafts admin-only
create policy kai_regions_sel on kai_regions for select
  using (published = true or kai_is_admin(auth.uid()));
-- mission types: active are public
create policy kai_missions_sel on kai_mission_types for select
  using (active = true or kai_is_admin(auth.uid()));
-- validators: admin only
create policy kai_validators_sel on kai_validators for select
  using (kai_is_admin(auth.uid()));
-- proofs: submitter sees own; admin sees all
create policy kai_proofs_sel on kai_proofs for select
  using (submitter_fbid = auth.uid() or kai_is_admin(auth.uid()));
-- pulse events: public (aggregate signal, no PII)
create policy kai_pulse_sel on kai_pulse_events for select using (true);
-- index samples: public (environmental data)
create policy kai_index_sel on kai_region_index_samples for select using (true);
-- xp ledger: owner or admin
create policy kai_xp_sel on kai_xp_ledger for select
  using (fbid = auth.uid() or kai_is_admin(auth.uid()));
-- audit: admin only
create policy kai_audit_sel on kai_audit for select
  using (kai_is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies anywhere: clients cannot write. The RPCs run
-- SECURITY DEFINER (table owner) and thus bypass RLS by design.

-- =============================================================================
-- GRANTS — expose only the RPCs + read views to anon/authenticated.
-- =============================================================================
-- Reads flow through the RLS SELECT policies above; writes flow through the RPCs.
-- Revoke ONLY write privileges from clients (NOT schema-wide — that would strip
-- grants other FlowBond apps depend on). Grant SELECT so the invoker views + RLS
-- reads work. Verified against advisors on shared prod 2026-07-16.
revoke insert, update, delete, truncate on
  kai_regions, kai_mission_types, kai_validators, kai_proofs,
  kai_pulse_events, kai_region_index_samples, kai_xp_ledger, kai_audit
  from anon, authenticated;
grant select on kai_regions, kai_mission_types, kai_pulse_events, kai_region_index_samples
  to anon, authenticated;                         -- public read channels (RLS-filtered)
grant select on kai_proofs, kai_xp_ledger, kai_validators, kai_audit
  to authenticated;                               -- owner/admin-only (RLS-filtered)
grant select on kai_region_state to anon, authenticated;
grant select on kai_proofs_admin to authenticated;

-- Postgres grants EXECUTE to PUBLIC by default; that exposed internal helpers
-- (kai__audit could forge audit rows). Revoke from PUBLIC, re-grant only what each
-- role legitimately calls. kai_is_admin is re-granted because the RLS policies call
-- it and are evaluated as the querying role.
revoke execute on function
  kai__audit(text,text,uuid,jsonb),
  kai_is_admin(uuid),
  kai_haversine_m(double precision,double precision,double precision,double precision),
  kai_clamp01(double precision),
  kai_recompute_region_state(uuid),
  kai_ingest_indices(text,double precision,double precision,integer,text),
  kai_get_region(text),
  kai_submit_proof(text,text,double precision,double precision,timestamptz,text,text),
  kai_validate_proof(uuid,text,text)
  from public, anon, authenticated;
grant execute on function kai_is_admin(uuid) to anon, authenticated;   -- required by RLS policies
grant execute on function kai_get_region(text) to anon, authenticated;
grant execute on function kai_submit_proof(text, text, double precision, double precision, timestamptz, text, text) to authenticated;
grant execute on function kai_validate_proof(uuid, text, text) to authenticated;
grant execute on function kai_ingest_indices(text, double precision, double precision, integer, text) to service_role;
-- kai_ingest_indices: service_role (cron) only.

-- Pin search_path on the two pure helpers (clears function_search_path_mutable).
alter function kai_haversine_m(double precision,double precision,double precision,double precision) set search_path = pg_catalog;
alter function kai_clamp01(double precision) set search_path = pg_catalog;

-- =============================================================================
-- SEED — one region ("Valle Espejo", Tepoztlán-INSPIRED, never labeled as such)
--        + one mission type ("Siembra un árbol").
-- =============================================================================
insert into kai_mission_types(slug, name, xp_reward, pulse_weight, quorum, active)
values ('siembra-un-arbol', 'Siembra un árbol', 25, 0.3, 1, true)
on conflict (slug) do nothing;

insert into kai_regions(slug, name, splat_url, bounds_lat, bounds_lng, bounds_radius_m,
                        vitality, canopy, water, biodiversity, community_pulse, published, config)
values (
  'valle-espejo', 'Valle Espejo',
  'https://media.play.flowbond.life/valle-espejo/base.spz',
  18.985, -99.093, 4000,
  0.42, 0.5, 0.35, 0.3, 0.15, true,
  jsonb_build_object(
    'weights', jsonb_build_object(
      'vitality', jsonb_build_object('canopy',0.4,'water',0.2,'biodiversity',0.2,'communityPulse',0.2),
      'observationCap', 500, 'pulseHalfLifeDays', 14, 'bloomNudge', 0.05
    )
  )
)
on conflict (slug) do nothing;

-- Enable Realtime on the state source (run once on the project):
-- alter publication supabase_realtime add table kai_regions;
