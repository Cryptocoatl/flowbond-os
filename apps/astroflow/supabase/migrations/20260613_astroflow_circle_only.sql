-- Circle-only constellation — you see ONLY your people, never strangers.
--
-- The bug: the home/constellation called `select * from profiles` and leaned on
-- RLS can_view(), which returns TRUE for every 'public' profile — so anyone who
-- ever set themselves public leaked into EVERY other person's sky, and the set
-- differed per viewer's friend graph ("different people in different dashboards").
--
-- The model AstroFlow wants: your constellation is your circle. You see
--   • yourself
--   • people you've accepted a bond with (mutual friendship)
--   • people who explicitly granted you access (profile_shares → you)
-- and no one else. Strangers are reached only by a direct link + a request.
--
-- Direct profile lookups (/chart/<handle>) still honor can_view (a public chart
-- stays shareable by link) — this only changes what populates YOUR sky.

create or replace function astroflow.my_circle()
returns setof astroflow.profiles
language sql
stable
security definer
set search_path to 'astroflow', 'public'
as $function$
  select p.*
  from astroflow.profiles p
  where astroflow.current_fbid() is not null
    and (
      p.fbid = astroflow.current_fbid()                                   -- yourself
      or astroflow.are_friends(astroflow.current_fbid(), p.fbid)          -- accepted bond
      or exists (                                                         -- they granted you access
        select 1 from astroflow.profile_shares s
        where s.owner_fbid = p.fbid and s.viewer_fbid = astroflow.current_fbid()
      )
    );
$function$;

grant execute on function astroflow.my_circle() to authenticated;

-- New souls start fully private — visible only to themselves until they choose
-- to bond or share. Onboarding is "you see yourself first," opt-in from there.
-- (Existing users' chosen visibility is left untouched.)
alter table astroflow.profiles alter column visibility set default 'private';
