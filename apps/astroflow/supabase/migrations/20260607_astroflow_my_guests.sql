-- my_guests: my created, not-yet-activated connections — the ghost avatars
-- waiting in my constellation. Each carries its claim_code so I can re-send
-- the activation link that lights up their star (FBID + real profile).
create or replace function astroflow.my_guests()
returns table(id uuid, display_name text, avatar_color text, sun text, moon text, rising text, claim_code text, in_maps int)
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select g.id, g.display_name, g.avatar_color,
         g.chart->'bodies'->'Sun'->>'sign',
         g.chart->'bodies'->'Moon'->>'sign',
         g.chart->'asc'->>'sign',
         g.claim_code,
         (select count(*)::int from astroflow.flow_maps m where g.id = any(m.guest_ids))
  from astroflow.guests g
  where g.created_by = astroflow.current_fbid() and g.claimed_fbid is null
  order by g.created_at desc;
$function$;

grant execute on function astroflow.my_guests() to authenticated;
