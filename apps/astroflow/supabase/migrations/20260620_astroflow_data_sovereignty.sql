-- Identity & data sovereignty: leave/delete constellations, change your default
-- visibility, and erase your whole AstroFlow footprint yourself. All
-- security-definer and current_fbid()-scoped — no one acts on your data but you.

-- Host deletes a whole constellation.
create or replace function astroflow.delete_flow_map(p_map_id uuid)
returns void language plpgsql security definer
set search_path to 'astroflow','public' as $function$
declare me uuid := astroflow.current_fbid();
begin
  if me is null then raise exception 'not signed in'; end if;
  delete from astroflow.constellation_cache where map_id = p_map_id;
  delete from astroflow.flow_maps where id = p_map_id and owner_fbid = me;
  if not found then raise exception 'Only the host can delete this constellation'; end if;
end; $function$;

-- A member removes THEMSELVES from a constellation (the host deletes instead).
create or replace function astroflow.leave_flow_map(p_map_id uuid)
returns void language plpgsql security definer
set search_path to 'astroflow','public' as $function$
declare me uuid := astroflow.current_fbid();
begin
  if me is null then raise exception 'not signed in'; end if;
  if exists (select 1 from astroflow.flow_maps where id = p_map_id and owner_fbid = me) then
    raise exception 'You host this constellation — delete it instead of leaving';
  end if;
  update astroflow.flow_maps set member_fbids = array_remove(member_fbids, me)
    where id = p_map_id and me = any(member_fbids);
  if not found then raise exception 'You are not in this constellation'; end if;
  delete from astroflow.constellation_cache where map_id = p_map_id and viewer_fbid = me;
end; $function$;

-- Change your default chart visibility.
create or replace function astroflow.set_my_visibility(v text)
returns void language plpgsql security definer
set search_path to 'astroflow','public' as $function$
declare me uuid := astroflow.current_fbid();
begin
  if me is null then raise exception 'not signed in'; end if;
  if v not in ('private','specific','friends','public') then raise exception 'bad visibility'; end if;
  update astroflow.profiles set visibility = v::astroflow.visibility where fbid = me;
end; $function$;

-- Irreversibly erase the caller's ENTIRE AstroFlow footprint. FlowBond identity
-- for other apps is separate and untouched.
create or replace function astroflow.delete_my_astroflow_account()
returns void language plpgsql security definer
set search_path to 'astroflow','public' as $function$
declare me uuid := astroflow.current_fbid();
begin
  if me is null then raise exception 'not signed in'; end if;
  update astroflow.flow_maps set member_fbids = array_remove(member_fbids, me) where me = any(member_fbids);
  delete from astroflow.flow_maps where owner_fbid = me;
  delete from astroflow.crew_members where fbid = me;
  delete from astroflow.crews where owner_fbid = me;
  delete from astroflow.friendships where a_fbid = me or b_fbid = me;
  delete from astroflow.profile_shares where owner_fbid = me or viewer_fbid = me;
  delete from astroflow.access_requests where requester_fbid = me or owner_fbid = me;
  delete from astroflow.chart_reads where owner_fbid = me or viewer_fbid = me;
  delete from astroflow.bond_erasures where lo = me or hi = me;
  delete from astroflow.profile_memory where fbid = me;
  delete from astroflow.constellation_cache where viewer_fbid = me;
  delete from astroflow.guests where created_by = me;
  delete from astroflow.profiles where fbid = me;
end; $function$;

grant execute on function astroflow.delete_flow_map(uuid)            to authenticated;
grant execute on function astroflow.leave_flow_map(uuid)             to authenticated;
grant execute on function astroflow.set_my_visibility(text)          to authenticated;
grant execute on function astroflow.delete_my_astroflow_account()    to authenticated;
