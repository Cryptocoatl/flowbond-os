-- Collective context + memory.
--
-- A flow map (collective) is "a little universe" of woven people. Until now it
-- only had a name + relationship lens. This gives each one a PURPOSE and an
-- INTENTION — why the group exists and what they want to understand together
-- (a startup team deciding direction, a family, a co-living crew, a dynamic
-- mix) — plus a growing MEMORY of notes. The collective reading then speaks to
-- that purpose instead of a generic group read.

alter table astroflow.flow_maps
  add column if not exists purpose   text,                       -- short intent label (team/family/...)
  add column if not exists intention text,                       -- free-text: why + what they want to understand
  add column if not exists memory    jsonb not null default '[]'::jsonb;

-- Host sets/edits a collective's name + purpose + intention.
create or replace function astroflow.set_flow_map_context(
  p_map_id uuid,
  p_name text default null,
  p_purpose text default null,
  p_intention text default null
) returns jsonb
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); v_owner uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select owner_fbid into v_owner from astroflow.flow_maps where id = p_map_id;
  if v_owner is null then raise exception 'no such constellation'; end if;
  if v_owner <> me then raise exception 'only the host can set this constellation''s context'; end if;
  update astroflow.flow_maps set
    name      = coalesce(nullif(btrim(p_name), ''), name),
    purpose   = nullif(btrim(p_purpose), ''),
    intention = nullif(btrim(p_intention), '')
  where id = p_map_id;
  return jsonb_build_object('ok', true);
end; $function$;

-- Append a dated note to a collective's memory (host only; newest kept, capped).
create or replace function astroflow.append_flow_map_memory(p_map_id uuid, p_note text)
returns void
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); v_owner uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select owner_fbid into v_owner from astroflow.flow_maps where id = p_map_id;
  if v_owner <> me then raise exception 'only the host'; end if;
  update astroflow.flow_maps set memory = (
    select to_jsonb(array(
      select e from jsonb_array_elements(
        coalesce(memory, '[]'::jsonb) || jsonb_build_object('at', now(), 'note', left(btrim(p_note), 500))
      ) e
    ))
  )
  where id = p_map_id and length(btrim(p_note)) > 0;
end; $function$;

grant execute on function astroflow.set_flow_map_context(uuid, text, text, text) to authenticated;
grant execute on function astroflow.append_flow_map_memory(uuid, text)            to authenticated;
