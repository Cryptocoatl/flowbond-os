-- ============================================================================
-- AstroFlow — FlowBond Layer-0 system
-- Migration: 20260602_astroflow_schema.sql
-- Project: FlowBond-life (shared) · schema: astroflow
--
-- Privacy model mirrors FlowGarden: every profile chooses one of four
-- visibility tiers — private / specific / friends / public — enforced in RLS.
--
-- DEPLOY (per FlowBond convention): run inside BEGIN; … ROLLBACK; first as a
-- dry-run, inspect, then re-run with COMMIT. Standard flow: feature branch →
-- /test → validate → promote to production.
--
-- INTEGRATION POINTS (Layer 0) — verified against the live FlowBond-life DB:
--   public.flowbond_users(id uuid pk = auth.uid(), email, flowbond_id text, …)
--     This IS the canonical FlowBondIdentity; id mirrors auth.uid() 1:1.
--     It has NO handle and NO auth_user_id column — AstroFlow owns its own
--     @handle namespace in astroflow.profiles.handle, and grant/revoke/request
--     resolve targets via that table.
--   astroflow.current_fbid() → flowbond_users.id where id = auth.uid().
--   astroflow.activate() idempotently ensures the identity row exists (mirrors
--     public.link_auth_or_create_identity(), which is not yet deployed here).
--   The flowbond_app_connections / activate_app registry does not exist yet and
--     is intentionally NOT a dependency (Layer-0 follow-up).
-- ============================================================================

create schema if not exists astroflow;
grant usage on schema astroflow to authenticated, anon;

-- ── identity helper: resolve the caller's FlowBond ID ──────────────────────
-- Canonical Layer-0 mapping (see 20260520_layer0_identity_root.sql):
-- public.flowbond_users IS the FlowBondIdentity; its id mirrors auth.uid() 1:1
-- (FK to auth.users). One identity logs into every FlowBond app. There is no
-- auth_user_id column — id = auth.uid() directly.
create or replace function astroflow.current_fbid()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.flowbond_users where id = auth.uid() limit 1;
$$;

-- ── visibility tiers ───────────────────────────────────────────────────────
do $$ begin
  create type astroflow.visibility as enum ('private', 'specific', 'friends', 'public');
exception when duplicate_object then null; end $$;

-- ── profiles: birth data + computed chart, owned by an FBID ────────────────
create table if not exists astroflow.profiles (
  fbid          uuid primary key references public.flowbond_users(id) on delete cascade,
  handle        text unique not null,                 -- denormalised from Layer 0 for @-mentions
  display_name  text not null,
  avatar_color  text not null default '#9a8fe0',
  birth_date    date not null,
  birth_time    time,                                 -- null = unknown → no houses/angles
  birth_tz      text not null,
  birth_lat     double precision not null,
  birth_lng     double precision not null,            -- EAST positive
  birth_place   text not null,
  chart         jsonb not null,                        -- computed by lib/astro (server)
  visibility    astroflow.visibility not null default 'private',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── specific-people grants (visibility = 'specific') ───────────────────────
create table if not exists astroflow.profile_shares (
  owner_fbid   uuid not null references astroflow.profiles(fbid) on delete cascade,
  viewer_fbid  uuid not null references public.flowbond_users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (owner_fbid, viewer_fbid)
);

-- ── friend graph (visibility = 'friends'); swappable for a Layer-0 graph ───
create table if not exists astroflow.friendships (
  a_fbid     uuid not null references public.flowbond_users(id) on delete cascade,
  b_fbid     uuid not null references public.flowbond_users(id) on delete cascade,
  status     text not null default 'accepted' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (a_fbid, b_fbid)
);
create or replace function astroflow.are_friends(x uuid, y uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from astroflow.friendships f
    where f.status = 'accepted'
      and ((f.a_fbid = x and f.b_fbid = y) or (f.a_fbid = y and f.b_fbid = x))
  );
$$;

-- ── access requests (when you @-prompt someone to share their chart) ───────
create table if not exists astroflow.access_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_fbid uuid not null references public.flowbond_users(id) on delete cascade,
  owner_fbid    uuid not null references astroflow.profiles(fbid) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','granted','denied')),
  created_at    timestamptz not null default now(),
  unique (requester_fbid, owner_fbid)
);

-- ── saved collective combinations ("flow maps") ───────────────────────────
create table if not exists astroflow.flow_maps (
  id           uuid primary key default gen_random_uuid(),
  owner_fbid   uuid not null references public.flowbond_users(id) on delete cascade,
  name         text not null,
  member_fbids uuid[] not null,
  context      text not null default 'friendship',
  created_at   timestamptz not null default now()
);

-- ── FlowBond ecosystem places (astrocartography timing tie-in) ─────────────
create table if not exists astroflow.ecosystem_places (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       text not null check (kind in ('property','retreat','event','community')),
  lat        double precision not null,
  lng        double precision not null,
  owner_fbid uuid references public.flowbond_users(id) on delete set null,  -- null = public
  created_at timestamptz not null default now()
);

-- ── core visibility predicate ──────────────────────────────────────────────
create or replace function astroflow.can_view(viewer uuid, owner uuid, vis astroflow.visibility)
returns boolean language sql stable as $$
  select case
    when viewer is null then false
    when viewer = owner then true
    when vis = 'public'  then true
    when vis = 'friends' then astroflow.are_friends(viewer, owner)
    when vis = 'specific' then exists (
      select 1 from astroflow.profile_shares s
      where s.owner_fbid = owner and s.viewer_fbid = viewer)
    else false  -- private
  end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table astroflow.profiles        enable row level security;
alter table astroflow.profile_shares  enable row level security;
alter table astroflow.friendships     enable row level security;
alter table astroflow.access_requests enable row level security;
alter table astroflow.flow_maps        enable row level security;
alter table astroflow.ecosystem_places enable row level security;

-- profiles: visible per tier; writable only by owner
drop policy if exists profiles_select on astroflow.profiles;
create policy profiles_select on astroflow.profiles for select
  using (astroflow.can_view(astroflow.current_fbid(), fbid, visibility));

drop policy if exists profiles_insert on astroflow.profiles;
create policy profiles_insert on astroflow.profiles for insert
  with check (fbid = astroflow.current_fbid());

drop policy if exists profiles_update on astroflow.profiles;
create policy profiles_update on astroflow.profiles for update
  using (fbid = astroflow.current_fbid()) with check (fbid = astroflow.current_fbid());

drop policy if exists profiles_delete on astroflow.profiles;
create policy profiles_delete on astroflow.profiles for delete
  using (fbid = astroflow.current_fbid());

-- shares: only the owner manages who they share with
drop policy if exists shares_all on astroflow.profile_shares;
create policy shares_all on astroflow.profile_shares for all
  using (owner_fbid = astroflow.current_fbid())
  with check (owner_fbid = astroflow.current_fbid());

-- friendships: a party to the edge may see/manage it
drop policy if exists friends_all on astroflow.friendships;
create policy friends_all on astroflow.friendships for all
  using (a_fbid = astroflow.current_fbid() or b_fbid = astroflow.current_fbid())
  with check (a_fbid = astroflow.current_fbid() or b_fbid = astroflow.current_fbid());

-- access requests: requester or owner can see; requester creates; owner resolves
drop policy if exists req_select on astroflow.access_requests;
create policy req_select on astroflow.access_requests for select
  using (requester_fbid = astroflow.current_fbid() or owner_fbid = astroflow.current_fbid());
drop policy if exists req_insert on astroflow.access_requests;
create policy req_insert on astroflow.access_requests for insert
  with check (requester_fbid = astroflow.current_fbid());
drop policy if exists req_update on astroflow.access_requests;
create policy req_update on astroflow.access_requests for update
  using (owner_fbid = astroflow.current_fbid());

-- flow maps: owner-only
drop policy if exists maps_all on astroflow.flow_maps;
create policy maps_all on astroflow.flow_maps for all
  using (owner_fbid = astroflow.current_fbid())
  with check (owner_fbid = astroflow.current_fbid());

-- ecosystem places: public ones readable by all; owned ones by owner
drop policy if exists places_select on astroflow.ecosystem_places;
create policy places_select on astroflow.ecosystem_places for select
  using (owner_fbid is null or owner_fbid = astroflow.current_fbid());
drop policy if exists places_write on astroflow.ecosystem_places;
create policy places_write on astroflow.ecosystem_places for all
  using (owner_fbid = astroflow.current_fbid())
  with check (owner_fbid = astroflow.current_fbid());

-- ============================================================================
-- RPCs (SECURITY DEFINER where they must act across the identity boundary)
-- ============================================================================

-- activate AstroFlow for the caller: idempotently guarantee the caller's
-- canonical FlowBondIdentity row exists, then (if available) defer to the
-- canonical Layer-0 bootstrap. This mirrors public.link_auth_or_create_identity()
-- but is self-sufficient, so AstroFlow works whether or not the identity-root
-- migration (20260520) has been applied, and stays correct after it is. The
-- flowbond_app_connections registry from earlier specs does not exist yet and is
-- left as a Layer-0 follow-up.
create or replace function astroflow.activate()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  insert into public.flowbond_users (id, email, flowbond_id, created_at, updated_at)
  select au.id, au.email, 'FB-' || upper(substring(au.id::text, 1, 8)), now(), now()
  from auth.users au
  where au.id = auth.uid()
  on conflict (id) do nothing;
end; $$;

-- Existence probe for a handle that RLS may be hiding: lets the UI tell
-- "no such profile" (not_found) apart from "exists but you can't see it"
-- (forbidden). security definer so it bypasses the profiles RLS for a boolean.
create or replace function astroflow.handle_exists(target_handle text)
returns boolean language sql stable security definer set search_path = astroflow as $$
  select exists (select 1 from astroflow.profiles where handle = target_handle);
$$;

-- grant a specific person access by their FlowBond @handle
create or replace function astroflow.grant_access(target_handle text)
returns void language plpgsql security definer set search_path = public, astroflow as $$
declare me uuid := astroflow.current_fbid(); target uuid;
begin
  select fbid into target from astroflow.profiles where handle = target_handle;
  if target is null then raise exception 'No FlowBond user @%', target_handle; end if;
  insert into astroflow.profile_shares(owner_fbid, viewer_fbid)
  values (me, target) on conflict do nothing;
  update astroflow.access_requests set status = 'granted'
    where owner_fbid = me and requester_fbid = target;
end; $$;

create or replace function astroflow.revoke_access(target_handle text)
returns void language plpgsql security definer set search_path = public, astroflow as $$
declare me uuid := astroflow.current_fbid(); target uuid;
begin
  select fbid into target from astroflow.profiles where handle = target_handle;
  delete from astroflow.profile_shares where owner_fbid = me and viewer_fbid = target;
end; $$;

-- @-prompt: ask another user to share their chart with you
create or replace function astroflow.request_access(target_handle text)
returns void language plpgsql security definer set search_path = public, astroflow as $$
declare me uuid := astroflow.current_fbid(); target uuid;
begin
  select fbid into target from astroflow.profiles where handle = target_handle;
  if target is null then raise exception 'No FlowBond user @%', target_handle; end if;
  insert into astroflow.access_requests(requester_fbid, owner_fbid)
  values (me, target) on conflict (requester_fbid, owner_fbid) do nothing;
end; $$;

-- profiles the caller is allowed to weave into the constellation
create or replace function astroflow.visible_profiles()
returns setof astroflow.profiles language sql stable as $$
  select * from astroflow.profiles;   -- RLS does the filtering
$$;

grant execute on all functions in schema astroflow to authenticated;
-- profiles: owner writes too (RLS still restricts every row to current_fbid()).
grant select, insert, update, delete on astroflow.profiles to authenticated;
grant select on astroflow.ecosystem_places to authenticated;
grant all on astroflow.profile_shares, astroflow.friendships,
  astroflow.access_requests, astroflow.flow_maps to authenticated;

-- anon (logged-out home/constellation): table/function grants so the query runs;
-- RLS hides every profile row (can_view(null,…) = false) and exposes only public
-- ecosystem_places.
grant select on astroflow.profiles, astroflow.ecosystem_places to anon;
grant execute on function astroflow.current_fbid(),
  astroflow.can_view(uuid, uuid, astroflow.visibility),
  astroflow.are_friends(uuid, uuid), astroflow.handle_exists(text),
  astroflow.visible_profiles() to anon;

-- Expose the astroflow schema to the Data API (PostgREST). Also set in the
-- dashboard (Settings → API → Exposed schemas) so it survives platform restarts.
do $cfg$ begin
  execute 'alter role authenticator set pgrst.db_schemas = ''public, graphql_public, astroflow''';
exception when insufficient_privilege then null; end $cfg$;
notify pgrst, 'reload config';
notify pgrst, 'reload schema';

create index if not exists idx_profiles_visibility on astroflow.profiles(visibility);
create index if not exists idx_shares_viewer on astroflow.profile_shares(viewer_fbid);
