-- Manage charted souls (guests): attach to an existing constellation, spin a
-- brand-new one from you + the soul, or forget them entirely. Owner-checked.

create or replace function astroflow.attach_guest(map_id uuid, guest uuid)
returns void
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid();
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from astroflow.flow_maps where id = map_id and owner_fbid = me) then
    raise exception 'Only the constellation owner can add to it'; end if;
  if not exists (select 1 from astroflow.guests where id = guest and created_by = me) then
    raise exception 'Not your charted soul'; end if;
  update astroflow.flow_maps
    set guest_ids = (select array(select distinct unnest(guest_ids || guest)))
    where id = map_id;
end; $function$;

create or replace function astroflow.create_guest_map(name text, ctx text, guest uuid)
returns uuid
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); new_id uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from astroflow.guests where id = guest and created_by = me) then
    raise exception 'Not your charted soul'; end if;
  insert into astroflow.flow_maps(owner_fbid, name, member_fbids, context, guest_ids)
    values (me, name, array[me], coalesce(nullif(ctx,''),'friendship'), array[guest])
    returning id into new_id;
  return new_id;
end; $function$;

create or replace function astroflow.forget_guest(guest uuid)
returns void
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid();
begin
  if me is null then raise exception 'not signed in'; end if;
  update astroflow.flow_maps set guest_ids = array_remove(guest_ids, guest)
    where owner_fbid = me and guest = any(guest_ids);
  delete from astroflow.guests
    where id = guest and created_by = me and claimed_fbid is null;
end; $function$;

grant execute on function astroflow.attach_guest(uuid, uuid)        to authenticated;
grant execute on function astroflow.create_guest_map(text, text, uuid) to authenticated;
grant execute on function astroflow.forget_guest(uuid)              to authenticated;
