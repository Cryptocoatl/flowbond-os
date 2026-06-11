-- Erase bond — the inverse of accept_bond. A mutual, sticky severance.
--
-- Erasing a bond with someone:
--   • removes the friendship (both ways) → they leave your dashboard/constellation
--   • revokes the mutual chart shares (both directions) → your info collapses to the
--     stranger view (can_view/my_level_on already enforce the minimum once shares+
--     friendship are gone — private shows nothing, public shows only the light teaser)
--   • pulls them out of collective charts you own (and you out of theirs)
--   • clears the cached constellation facts so nothing stale lingers
--   • records the erasure so neither side can SILENTLY re-bond via a link —
--     reconnection must go through a fresh access request the owner approves.
--
-- Consent-first by design: you can always see who can see you (my_allowances) and
-- who has read you (my_audience); erasing is the clean exit, not a punishment.

-- ---------------------------------------------------------------------------
-- Block ledger: a normalized (lo < hi) pair that was erased. Order-independent
-- so it blocks auto-rebond in EITHER direction. Lifted when the owner grants
-- access again (approving a request), letting the flow resume by consent.
-- ---------------------------------------------------------------------------
create table if not exists astroflow.bond_erasures (
  lo        uuid not null references public.flowbond_users(id) on delete cascade,
  hi        uuid not null references public.flowbond_users(id) on delete cascade,
  erased_by uuid not null references public.flowbond_users(id) on delete cascade,
  erased_at timestamptz not null default now(),
  primary key (lo, hi),
  check (lo < hi)
);
alter table astroflow.bond_erasures enable row level security;

-- Either party may see an erasure exists between them (so the UI can explain
-- "you'll need to request access"). Neither sees who else anyone erased.
drop policy if exists bond_erasures_party_select on astroflow.bond_erasures;
create policy bond_erasures_party_select on astroflow.bond_erasures
  for select using (astroflow.current_fbid() in (lo, hi));

-- ---------------------------------------------------------------------------
-- erase_bond(peer_handle): atomically dissolve the bond both ways + clean up.
-- Tolerant/idempotent: works even if there's no live friendship (acts as a
-- "don't auto-connect me with this person" block + share cleanup).
-- ---------------------------------------------------------------------------
create or replace function astroflow.erase_bond(peer_handle text)
returns jsonb
language plpgsql security definer
set search_path to 'astroflow','public'
as $function$
declare
  me uuid := astroflow.current_fbid();
  peer uuid; v_lo uuid; v_hi uuid; v_shares int;
begin
  if me is null then raise exception 'not signed in'; end if;
  select fbid into peer from astroflow.profiles where handle = peer_handle;
  if peer is null then raise exception 'No FlowBond user @%', peer_handle; end if;
  if peer = me then raise exception 'You cannot erase a bond with yourself'; end if;
  v_lo := least(me, peer); v_hi := greatest(me, peer);

  -- 1) sever the friendship (both orderings — PK is (a_fbid, b_fbid))
  delete from astroflow.friendships
   where (a_fbid = me and b_fbid = peer) or (a_fbid = peer and b_fbid = me);

  -- 2) revoke the mutual shares (both directions)
  delete from astroflow.profile_shares
   where (owner_fbid = me and viewer_fbid = peer) or (owner_fbid = peer and viewer_fbid = me);
  get diagnostics v_shares = row_count;

  -- 3) pull them out of collective charts you own (and you out of theirs)
  update astroflow.flow_maps set member_fbids = array_remove(member_fbids, peer)
   where owner_fbid = me and peer = any(member_fbids);
  update astroflow.flow_maps set member_fbids = array_remove(member_fbids, me)
   where owner_fbid = peer and me = any(member_fbids);

  -- 4) clear cached constellation facts for both (rebuilds clean on next view)
  delete from astroflow.constellation_cache where viewer_fbid in (me, peer);

  -- 5) clear any pending access requests between you (clean slate)
  delete from astroflow.access_requests
   where (requester_fbid = me and owner_fbid = peer)
      or (requester_fbid = peer and owner_fbid = me);

  -- 6) record the erasure → no silent re-bond; reconnection = request → approve
  insert into astroflow.bond_erasures(lo, hi, erased_by) values (v_lo, v_hi, me)
   on conflict (lo, hi) do update set erased_by = excluded.erased_by, erased_at = now();

  return jsonb_build_object('erased', true, 'peer', peer_handle, 'shares_removed', v_shares);
end; $function$;

-- ---------------------------------------------------------------------------
-- accept_bond v2 — same weave as before, but if this pair was erased, DON'T
-- auto-rebond: turn the tap-to-accept into an access request the owner approves.
-- Now returns a `status` ('bonded' | 'request_sent') so the UI can speak to it.
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

  -- erased before? reconnection is by consent, not by reopening a link.
  if exists (select 1 from astroflow.bond_erasures
             where lo = least(me, owner.fbid) and hi = greatest(me, owner.fbid)) then
    insert into astroflow.access_requests(requester_fbid, owner_fbid)
      values (me, owner.fbid) on conflict (requester_fbid, owner_fbid) do nothing;
    return jsonb_build_object('status', 'request_sent',
      'handle', owner.handle, 'display_name', owner.display_name);
  end if;

  insert into astroflow.friendships(a_fbid, b_fbid, status) values (owner.fbid, me, 'accepted')
    on conflict (a_fbid, b_fbid) do update set status = 'accepted';
  insert into astroflow.profile_shares(owner_fbid, viewer_fbid, level, context)
    values (me, owner.fbid, 'standard', 'friendship'),
           (owner.fbid, me, 'standard', 'friendship')
    on conflict do nothing;
  update astroflow.profiles set visibility = 'specific'
    where fbid in (me, owner.fbid) and visibility = 'private';

  return jsonb_build_object('status', 'bonded',
    'handle', owner.handle, 'display_name', owner.display_name);
end; $function$;

-- ---------------------------------------------------------------------------
-- grant_access v2 — granting access to someone you'd erased LIFTS the block,
-- so an approved reconnection lets the flow resume normally afterward.
-- (Same signature + defaults; every existing call keeps working.)
-- ---------------------------------------------------------------------------
create or replace function astroflow.grant_access(
  target_handle text,
  lvl text default 'standard',
  ctx text default 'friendship'
) returns void
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); target uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select fbid into target from astroflow.profiles where handle = target_handle;
  if target is null then raise exception 'No FlowBond user @%', target_handle; end if;
  insert into astroflow.profile_shares(owner_fbid, viewer_fbid, level, context)
  values (me, target, lvl::astroflow.share_level, ctx::astroflow.share_context)
  on conflict (owner_fbid, viewer_fbid)
    do update set level = excluded.level, context = excluded.context;
  update astroflow.access_requests set status = 'granted'
    where owner_fbid = me and requester_fbid = target;
  -- approving access lifts any prior erasure block between you
  delete from astroflow.bond_erasures
    where lo = least(me, target) and hi = greatest(me, target);
end; $function$;

grant execute on function astroflow.erase_bond(text) to authenticated;
grant execute on function astroflow.accept_bond(text) to authenticated;
grant execute on function astroflow.grant_access(text, text, text) to authenticated;
