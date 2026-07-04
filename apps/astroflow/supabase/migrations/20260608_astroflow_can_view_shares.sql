-- Explicit shares (bond/crew/grant) grant visibility at 'specific' and
-- 'friends' tiers — but 'private' stays absolute (self only). Before, a share
-- was honored only at 'specific', so a friend on the 'friends' tier who shared
-- with you via a crew/bond stayed invisible unless you were also in their
-- friend graph. Bonds/crews already lift private→specific on join, so newly
-- connected people still appear. Sharing should always mean sharing.
create or replace function astroflow.can_view(viewer uuid, owner uuid, vis astroflow.visibility)
returns boolean
language sql stable
set search_path to 'public'
as $function$
  select case
    when viewer is null then false
    when viewer = owner then true
    when vis = 'private' then false
    when vis = 'public' then true
    when exists (select 1 from astroflow.profile_shares s
                 where s.owner_fbid = owner and s.viewer_fbid = viewer) then true
    when vis = 'friends' then astroflow.are_friends(viewer, owner)
    else false
  end;
$function$;
