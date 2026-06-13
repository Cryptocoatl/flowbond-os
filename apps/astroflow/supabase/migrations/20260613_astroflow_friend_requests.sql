-- Find people by handle + send/accept AstralBond requests.
--
-- Until now bonds only formed by sharing a personal bond link (accept_bond) or
-- claiming a guest chart. This adds the social loop people expect:
--   1. SEARCH for someone by their handle — seeing only minimum public info
--      (handle, display name, avatar) — never their chart until you're bonded.
--   2. SEND a bond request. If they already requested you, it bonds instantly.
--   3. ACCEPT / DECLINE incoming requests. Accepting weaves the AstralBond
--      (friendship + mutual standard shares both ways) so you appear in each
--      other's constellation, and lifts any prior erasure block.
--
-- All security server-side via current_fbid(); search exposes ONLY the three
-- minimal public fields, regardless of a profile's visibility.

-- ── search: minimal public info only ────────────────────────────────────────
create or replace function astroflow.search_profiles(q text)
returns table(handle text, display_name text, avatar_color text,
              is_self boolean, is_friend boolean, request_pending boolean)
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select p.handle, p.display_name, p.avatar_color,
    p.fbid = astroflow.current_fbid() as is_self,
    astroflow.are_friends(astroflow.current_fbid(), p.fbid) as is_friend,
    exists (
      select 1 from astroflow.friendships f
      where f.status = 'pending'
        and ((f.a_fbid = astroflow.current_fbid() and f.b_fbid = p.fbid)
          or (f.a_fbid = p.fbid and f.b_fbid = astroflow.current_fbid()))
    ) as request_pending
  from astroflow.profiles p
  where astroflow.current_fbid() is not null
    and p.fbid <> astroflow.current_fbid()
    and length(btrim(q)) >= 2
    and (p.handle ilike '%' || btrim(q) || '%' or p.display_name ilike '%' || btrim(q) || '%')
  order by (lower(p.handle) = lower(btrim(q))) desc, p.handle
  limit 12;
$function$;

-- ── accept an incoming bond request (weave the AstralBond) ───────────────────
create or replace function astroflow.accept_bond_request(requester_handle text)
returns jsonb
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); requester uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select fbid into requester from astroflow.profiles where handle = requester_handle;
  if requester is null then raise exception 'No AstralFlow user @%', requester_handle; end if;
  if not exists (select 1 from astroflow.friendships
                 where a_fbid = requester and b_fbid = me and status = 'pending') then
    raise exception 'no_pending_request';
  end if;
  update astroflow.friendships set status = 'accepted'
    where a_fbid = requester and b_fbid = me;
  insert into astroflow.profile_shares(owner_fbid, viewer_fbid, level, context)
    values (me, requester, 'standard', 'friendship'),
           (requester, me, 'standard', 'friendship')
    on conflict do nothing;
  update astroflow.profiles set visibility = 'specific'
    where fbid in (me, requester) and visibility = 'private';
  -- accepting reconnects a previously-erased pair too
  delete from astroflow.bond_erasures
    where lo = least(me, requester) and hi = greatest(me, requester);
  return jsonb_build_object('status', 'bonded', 'handle', requester_handle);
end; $function$;

-- ── send a bond request by handle (auto-bonds if they already asked you) ─────
create or replace function astroflow.request_bond(target_handle text)
returns jsonb
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); target uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select fbid into target from astroflow.profiles where handle = target_handle;
  if target is null then raise exception 'No AstralFlow user @%', target_handle; end if;
  if target = me then raise exception 'That is your own handle'; end if;
  if not exists (select 1 from astroflow.profiles where fbid = me) then
    raise exception 'Create your AstralFlow chart first'; end if;
  if astroflow.are_friends(me, target) then
    return jsonb_build_object('status', 'already_bonded', 'handle', target_handle);
  end if;
  -- they already requested you → accept it now (mutual want = instant bond)
  if exists (select 1 from astroflow.friendships
             where a_fbid = target and b_fbid = me and status = 'pending') then
    return astroflow.accept_bond_request(target_handle);
  end if;
  insert into astroflow.friendships(a_fbid, b_fbid, status) values (me, target, 'pending')
    on conflict (a_fbid, b_fbid) do nothing;
  return jsonb_build_object('status', 'requested', 'handle', target_handle);
end; $function$;

-- ── decline an incoming request / cancel an outgoing one ─────────────────────
create or replace function astroflow.decline_bond_request(requester_handle text)
returns void
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); other uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select fbid into other from astroflow.profiles where handle = requester_handle;
  delete from astroflow.friendships
    where status = 'pending'
      and ((a_fbid = other and b_fbid = me) or (a_fbid = me and b_fbid = other));
end; $function$;

-- ── who asked to bond with me / who I've asked (to show state) ───────────────
create or replace function astroflow.my_incoming_bond_requests()
returns table(handle text, display_name text, avatar_color text)
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select p.handle, p.display_name, p.avatar_color
  from astroflow.friendships f
  join astroflow.profiles p on p.fbid = f.a_fbid
  where f.b_fbid = astroflow.current_fbid() and f.status = 'pending'
  order by f.created_at desc;
$function$;

create or replace function astroflow.my_outgoing_bond_requests()
returns table(handle text)
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select p.handle
  from astroflow.friendships f
  join astroflow.profiles p on p.fbid = f.b_fbid
  where f.a_fbid = astroflow.current_fbid() and f.status = 'pending';
$function$;

-- ── my_friends now returns only ESTABLISHED bonds (pending lives separately) ──
create or replace function astroflow.my_friends()
returns table(handle text, display_name text, status text)
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select p.handle, p.display_name, f.status
  from astroflow.friendships f
  join astroflow.profiles p on p.fbid = (case when f.a_fbid = astroflow.current_fbid() then f.b_fbid else f.a_fbid end)
  where astroflow.current_fbid() in (f.a_fbid, f.b_fbid)
    and f.status = 'accepted';
$function$;

grant execute on function astroflow.search_profiles(text)        to authenticated;
grant execute on function astroflow.request_bond(text)           to authenticated;
grant execute on function astroflow.accept_bond_request(text)    to authenticated;
grant execute on function astroflow.decline_bond_request(text)   to authenticated;
grant execute on function astroflow.my_incoming_bond_requests()  to authenticated;
grant execute on function astroflow.my_outgoing_bond_requests()  to authenticated;
grant execute on function astroflow.my_friends()                 to authenticated;
