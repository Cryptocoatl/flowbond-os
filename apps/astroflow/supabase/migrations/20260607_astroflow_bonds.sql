-- AstroBonds: instant mutual-visibility links + solo guests.
--
-- Every profile carries a personal bond_code. Share /bond/<code> with a
-- friend; the link always routes through FBID-first login → chart creation →
-- accept. Accepting weaves the bond: friendship + standard shares BOTH ways,
-- so you see each other in your dashboards/constellations and can add each
-- other to collective charts (each one a little universe).
--
-- Solo guests: compute a one-time chart from someone's natal data without a
-- map. They are NOT a profile until they activate their FBID via their claim
-- link — and claiming now also bonds claimer ↔ creator, turning the chart you
-- made for them into full flow.

-- ---------------------------------------------------------------------------
-- Personal bond code (volatile default ⇒ evaluated per existing row)
-- ---------------------------------------------------------------------------
alter table astroflow.profiles
  add column if not exists bond_code text unique default substr(md5(gen_random_uuid()::text), 1, 10);

update astroflow.profiles set bond_code = substr(md5(gen_random_uuid()::text), 1, 10)
  where bond_code is null;

-- ---------------------------------------------------------------------------
-- my_bond_code: your shareable astrobond link code
-- ---------------------------------------------------------------------------
create or replace function astroflow.my_bond_code()
returns text
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); code text;
begin
  if me is null then raise exception 'not signed in'; end if;
  select bond_code into code from astroflow.profiles where fbid = me;
  if code is null then
    update astroflow.profiles set bond_code = substr(md5(gen_random_uuid()::text), 1, 10)
      where fbid = me returning bond_code into code;
  end if;
  return code;
end; $function$;

-- ---------------------------------------------------------------------------
-- bond_preview: public landing teaser (generic info + big three)
-- ---------------------------------------------------------------------------
create or replace function astroflow.bond_preview(code text)
returns jsonb
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select jsonb_build_object(
    'handle', p.handle, 'display_name', p.display_name, 'avatar_color', p.avatar_color,
    'sun',    p.chart->'bodies'->'Sun'->>'sign',
    'moon',   p.chart->'bodies'->'Moon'->>'sign',
    'rising', p.chart->'asc'->>'sign')
  from astroflow.profiles p where p.bond_code = code;
$function$;

-- ---------------------------------------------------------------------------
-- accept_bond: weave the bond — friendship + standard shares both ways,
-- private skies lifted to 'specific' so the shares take effect.
-- ---------------------------------------------------------------------------
create or replace function astroflow.accept_bond(code text)
returns jsonb
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); owner astroflow.profiles;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select * into owner from astroflow.profiles where bond_code = code;
  if owner.fbid is null then raise exception 'Invalid bond link'; end if;
  if owner.fbid = me then raise exception 'This is your own bond link — send it to a friend'; end if;
  if not exists (select 1 from astroflow.profiles where fbid = me) then
    raise exception 'Create your AstroFlow chart first'; end if;

  insert into astroflow.friendships(a_fbid, b_fbid, status) values (owner.fbid, me, 'accepted')
    on conflict (a_fbid, b_fbid) do update set status = 'accepted';
  insert into astroflow.profile_shares(owner_fbid, viewer_fbid, level, context)
    values (me, owner.fbid, 'standard', 'friendship'),
           (owner.fbid, me, 'standard', 'friendship')
    on conflict do nothing;
  update astroflow.profiles set visibility = 'specific'
    where fbid in (me, owner.fbid) and visibility = 'private';

  return jsonb_build_object('handle', owner.handle, 'display_name', owner.display_name);
end; $function$;

-- ---------------------------------------------------------------------------
-- create_solo_guest: a one-time chart holder with no map — not a profile,
-- not in the flow, just a chart + a personal activation (claim) link.
-- ---------------------------------------------------------------------------
create or replace function astroflow.create_solo_guest(
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
  insert into astroflow.guests
    (created_by, display_name, avatar_color, birth_date, birth_time, birth_tz, birth_lat, birth_lng, birth_place, chart)
  values (me, guest_name, color, bdate, btime, btz, blat, blng, bplace, chart_json)
  returning * into g;
  return query select g.id, g.claim_code;
end; $function$;

-- ---------------------------------------------------------------------------
-- claim_guest v2: claiming now ALSO bonds claimer ↔ creator (friendship +
-- mutual standard shares) — activating an FBID from a chart someone made of
-- your natal data turns it into full mutual flow, maps or no maps.
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

  -- bond with the person who summoned you (they hold a profile + invited you)
  if g.created_by <> me and exists (select 1 from astroflow.profiles where fbid = g.created_by) then
    insert into astroflow.friendships(a_fbid, b_fbid, status) values (g.created_by, me, 'accepted')
      on conflict (a_fbid, b_fbid) do update set status = 'accepted';
    insert into astroflow.profile_shares(owner_fbid, viewer_fbid, level, context)
      values (me, g.created_by, 'standard', 'friendship'),
             (g.created_by, me, 'standard', 'friendship')
      on conflict do nothing;
    update astroflow.profiles set visibility = 'specific'
      where fbid = g.created_by and visibility = 'private';
  end if;

  for mp in select * from astroflow.flow_maps where g.id = any(guest_ids) loop
    ctx := case mp.context
      when 'romance' then 'romantic' when 'coliving' then 'house'
      when 'business' then 'project' else 'friendship' end::astroflow.share_context;
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
grant execute on function astroflow.my_bond_code()  to authenticated;
grant execute on function astroflow.bond_preview(text) to anon, authenticated;
grant execute on function astroflow.accept_bond(text)  to authenticated;
grant execute on function astroflow.create_solo_guest(text, date, time, text, double precision, double precision, text, jsonb, text) to authenticated;
grant execute on function astroflow.claim_guest(text)  to authenticated;
