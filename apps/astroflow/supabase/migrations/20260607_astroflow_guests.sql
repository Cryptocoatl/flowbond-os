-- AstroFlow guests: people in a collective chart who don't have a FlowBond
-- profile (yet). The map owner adds them with birth date/time/place; their
-- chart is computed like any other and rendered live in the collective —
-- but a guest is NOT linked to the flow (no FBID, no shares, no friendships).
--
-- Every guest carries a personal claim_code. The owner sends them
-- /claim/<code> — a personalized invite that lands on the live chart already
-- updating with their data. Claiming swaps the guest for the real member in
-- every map that contains them and auto-shares standard-level charts with the
-- people already in those maps (so the collective keeps rendering for everyone).

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists astroflow.guests (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid not null references public.flowbond_users(id) on delete cascade,
  display_name text not null,
  avatar_color text not null default '#8fb8e0',
  birth_date   date not null,
  birth_time   time,                                  -- null = unknown → no houses/angles
  birth_tz     text not null,
  birth_lat    double precision not null,
  birth_lng    double precision not null,             -- EAST positive
  birth_place  text not null,
  chart        jsonb not null,                        -- computed by lib/astro (server)
  claim_code   text not null unique default substr(md5(gen_random_uuid()::text), 1, 12),
  claimed_fbid uuid references public.flowbond_users(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table astroflow.guests enable row level security;

-- Only the creator manages their guests directly; everyone else reaches them
-- through the SECURITY DEFINER functions below (map members, claim landing).
drop policy if exists guests_owner_all on astroflow.guests;
create policy guests_owner_all on astroflow.guests for all
  using (created_by = astroflow.current_fbid())
  with check (created_by = astroflow.current_fbid());

grant select, insert, delete on astroflow.guests to authenticated;

alter table astroflow.flow_maps
  add column if not exists guest_ids uuid[] not null default '{}';

-- ---------------------------------------------------------------------------
-- add_guest: insert a guest and attach them to one of MY maps, atomically.
-- Returns the claim code so the UI can hand back the personalized link.
-- ---------------------------------------------------------------------------
create or replace function astroflow.add_guest(
  map_id uuid,
  guest_name text,
  bdate date, btime time, btz text,
  blat double precision, blng double precision, bplace text,
  chart_json jsonb,
  color text default '#8fb8e0'
) returns table(guest_id uuid, claim_code text)
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); g astroflow.guests;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from astroflow.flow_maps m where m.id = map_id and m.owner_fbid = me) then
    raise exception 'Only the map owner can add guests';
  end if;
  insert into astroflow.guests
    (created_by, display_name, avatar_color, birth_date, birth_time, birth_tz, birth_lat, birth_lng, birth_place, chart)
  values (me, guest_name, color, bdate, btime, btz, blat, blng, bplace, chart_json)
  returning * into g;
  update astroflow.flow_maps set guest_ids = guest_ids || g.id where id = map_id;
  return query select g.id, g.claim_code;
end; $function$;

-- ---------------------------------------------------------------------------
-- remove_guest: owner detaches a guest from a map (deletes the guest row if
-- no other map still holds them).
-- ---------------------------------------------------------------------------
create or replace function astroflow.remove_guest(map_id uuid, guest uuid)
returns void
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid();
begin
  if me is null then raise exception 'not signed in'; end if;
  update astroflow.flow_maps set guest_ids = array_remove(guest_ids, guest)
    where id = map_id and owner_fbid = me;
  delete from astroflow.guests g
    where g.id = guest and g.created_by = me
      and not exists (select 1 from astroflow.flow_maps m where guest = any(m.guest_ids));
end; $function$;

-- ---------------------------------------------------------------------------
-- my_flow_maps now mixes guests into the members list. Guest entries carry
-- guest:true + claimed, and (owner only) the claim_code for the invite link.
-- ---------------------------------------------------------------------------
create or replace function astroflow.my_flow_maps()
returns table(id uuid, name text, context text, is_owner boolean, members jsonb, created_at timestamptz)
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select m.id, m.name, m.context,
         m.owner_fbid = astroflow.current_fbid() as is_owner,
         coalesce(
           (select jsonb_agg(jsonb_build_object(
              'handle', p.handle, 'display_name', p.display_name, 'avatar_color', p.avatar_color))
            from unnest(m.member_fbids) as f
            left join astroflow.profiles p on p.fbid = f), '[]'::jsonb)
         ||
         coalesce(
           (select jsonb_agg(jsonb_build_object(
              'display_name', g.display_name, 'avatar_color', g.avatar_color,
              'guest', true, 'claimed', g.claimed_fbid is not null,
              'claim_code', case when m.owner_fbid = astroflow.current_fbid() then g.claim_code end))
            from astroflow.guests g where g.id = any(m.guest_ids)), '[]'::jsonb)
         as members,
         m.created_at
  from astroflow.flow_maps m
  where m.owner_fbid = astroflow.current_fbid()
     or astroflow.current_fbid() = any(m.member_fbids)
  order by m.created_at desc;
$function$;

-- ---------------------------------------------------------------------------
-- get_flow_map: the live collective chart. Only the owner and members may
-- load it. Member identity info is generic (handle/name/color — what
-- my_flow_maps already exposes); member CHART depth is enforced client-side
-- of this RPC by RLS + my_level_on when the page fetches profiles. Guests are
-- returned in full — the creator supplied their data.
-- ---------------------------------------------------------------------------
create or replace function astroflow.get_flow_map(map_id uuid)
returns jsonb
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select jsonb_build_object(
    'id', m.id, 'name', m.name, 'context', m.context,
    'is_owner', m.owner_fbid = astroflow.current_fbid(),
    'owner_handle', (select handle from astroflow.profiles where fbid = m.owner_fbid),
    'members', coalesce(
      (select jsonb_agg(jsonb_build_object(
         'fbid', f, 'handle', p.handle, 'display_name', p.display_name, 'avatar_color', p.avatar_color))
       from unnest(m.member_fbids) as f
       left join astroflow.profiles p on p.fbid = f), '[]'::jsonb),
    'guests', coalesce(
      (select jsonb_agg(jsonb_build_object(
         'id', g.id, 'display_name', g.display_name, 'avatar_color', g.avatar_color,
         'birth_date', g.birth_date, 'birth_place', g.birth_place,
         'chart', g.chart, 'claimed', g.claimed_fbid is not null,
         'claim_code', case when m.owner_fbid = astroflow.current_fbid() then g.claim_code end))
       from astroflow.guests g where g.id = any(m.guest_ids)), '[]'::jsonb))
  from astroflow.flow_maps m
  where m.id = map_id
    and (m.owner_fbid = astroflow.current_fbid()
         or astroflow.current_fbid() = any(m.member_fbids));
$function$;

-- ---------------------------------------------------------------------------
-- guest_invite: the personalized claim landing. The claim_code is a bearer
-- secret — whoever holds the link is the invitee, so it may return their own
-- birth data (to prefill signup) and their chart (it is THEIR chart).
-- ---------------------------------------------------------------------------
create or replace function astroflow.guest_invite(code text)
returns jsonb
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select jsonb_build_object(
    'display_name', g.display_name, 'avatar_color', g.avatar_color,
    'birth_date', g.birth_date, 'birth_time', g.birth_time, 'birth_tz', g.birth_tz,
    'birth_lat', g.birth_lat, 'birth_lng', g.birth_lng, 'birth_place', g.birth_place,
    'chart', g.chart, 'claimed', g.claimed_fbid is not null,
    'invited_by', (select handle from astroflow.profiles where fbid = g.created_by),
    'maps', coalesce(
      (select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'context', m.context,
          'member_count', cardinality(m.member_fbids) + cardinality(m.guest_ids)))
       from astroflow.flow_maps m where g.id = any(m.guest_ids)), '[]'::jsonb))
  from astroflow.guests g where g.claim_code = code;
$function$;

-- ---------------------------------------------------------------------------
-- claim_guest: the invitee (signed in, chart created) takes their seat.
-- In every map holding the guest: guest out, real member in. Their chart is
-- auto-shared (standard, context mapped from the map) with the owner and
-- existing members so the live collective keeps rendering for everyone —
-- mirrors join_crew. Returns the maps joined.
-- ---------------------------------------------------------------------------
create or replace function astroflow.claim_guest(code text)
returns table(map_id uuid, map_name text)
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare
  me uuid := astroflow.current_fbid();
  g astroflow.guests; mp astroflow.flow_maps; f uuid; ctx astroflow.share_context;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select * into g from astroflow.guests where claim_code = code;
  if g.id is null then raise exception 'Invalid invite link'; end if;
  if g.claimed_fbid is not null and g.claimed_fbid <> me then
    raise exception 'This invite was already claimed'; end if;
  if not exists (select 1 from astroflow.profiles where fbid = me) then
    raise exception 'Create your AstroFlow chart first'; end if;

  update astroflow.guests set claimed_fbid = me where id = g.id;
  update astroflow.profiles set visibility = 'specific' where fbid = me and visibility = 'private';

  for mp in select * from astroflow.flow_maps where g.id = any(guest_ids) loop
    ctx := case mp.context
      when 'romance' then 'romantic' when 'coliving' then 'house'
      when 'business' then 'project' else 'friendship' end::astroflow.share_context;
    -- share my chart with the owner + everyone already woven in
    for f in select x from unnest(mp.member_fbids || mp.owner_fbid) as x where x <> me loop
      insert into astroflow.profile_shares(owner_fbid, viewer_fbid, level, context)
      values (me, f, 'standard', ctx) on conflict do nothing;
    end loop;
    update astroflow.flow_maps set
      guest_ids = array_remove(guest_ids, g.id),
      member_fbids = case when me = any(member_fbids) then member_fbids else member_fbids || me end
    where id = mp.id;
    map_id := mp.id; map_name := mp.name; return next;
  end loop;
end; $function$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function astroflow.add_guest(uuid, text, date, time, text, double precision, double precision, text, jsonb, text) to authenticated;
grant execute on function astroflow.remove_guest(uuid, uuid) to authenticated;
grant execute on function astroflow.my_flow_maps()          to authenticated;
grant execute on function astroflow.get_flow_map(uuid)      to authenticated;
grant execute on function astroflow.guest_invite(text)      to anon, authenticated;
grant execute on function astroflow.claim_guest(text)       to authenticated;
