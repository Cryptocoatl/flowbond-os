-- Add / remove a real person (a bonded friend) to an existing constellation.
--
-- Until now a flow map was created whole and frozen. This lets the host grow a
-- constellation over time: search a friend by handle and weave them in, or take
-- someone out. You can only add people you actually have access to (a bond, or
-- they granted you) — never a stranger; their chart still renders only at the
-- share level THEY allow, so privacy stays theirs.

create or replace function astroflow.add_member_to_map(p_map_id uuid, p_member_handle text)
returns jsonb
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); v_owner uuid; target uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select owner_fbid into v_owner from astroflow.flow_maps where id = p_map_id;
  if v_owner is null then raise exception 'no such constellation'; end if;
  if v_owner <> me then raise exception 'only the host can add people'; end if;

  select fbid into target from astroflow.profiles where handle = p_member_handle;
  if target is null then raise exception 'No AstralFlow user @%', p_member_handle; end if;
  if target = me then raise exception 'You are already in your own constellation'; end if;

  -- you may only add people you have access to: a bond, or they granted you
  if not (astroflow.are_friends(me, target)
          or exists (select 1 from astroflow.profile_shares s
                     where s.owner_fbid = target and s.viewer_fbid = me)) then
    raise exception 'not_connected';  -- bond with them first
  end if;

  update astroflow.flow_maps
     set member_fbids = (select array(select distinct unnest(member_fbids || target)))
   where id = p_map_id and not (target = any(member_fbids));

  return jsonb_build_object('status', 'added', 'handle', p_member_handle);
end; $function$;

create or replace function astroflow.remove_member_from_map(p_map_id uuid, p_member_handle text)
returns void
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); v_owner uuid; target uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select owner_fbid into v_owner from astroflow.flow_maps where id = p_map_id;
  if v_owner <> me then raise exception 'only the host can remove people'; end if;
  select fbid into target from astroflow.profiles where handle = p_member_handle;
  if target is null then return; end if;
  update astroflow.flow_maps set member_fbids = array_remove(member_fbids, target)
   where id = p_map_id;
end; $function$;

grant execute on function astroflow.add_member_to_map(uuid, text)      to authenticated;
grant execute on function astroflow.remove_member_from_map(uuid, text) to authenticated;
