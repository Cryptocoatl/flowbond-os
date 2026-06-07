-- AstroFlow privacy layers: HOW MUCH you share (level) × IN WHAT RELATIONSHIP
-- (context), plus a "who reads me" audit. Extends the existing boolean
-- can_view() model — visibility tiers still decide IF someone can see you;
-- the share level decides HOW DEEP they can see.
--
--   light     → big three + elements (vibe check)
--   standard  → full natal chart (placements, aspects, astrocartography)
--   deep      → + patterns & shadow-work readings
--   open_heart→ everything, both directions — full transparency protocol
--
-- Contexts label WHY the share exists (friendship, romantic, project, house,
-- family, crew, app) so synastry and readings land in the right frame.

-- ---------------------------------------------------------------------------
-- Types + columns
-- ---------------------------------------------------------------------------
do $$ begin
  create type astroflow.share_level as enum ('light','standard','deep','open_heart');
exception when duplicate_object then null; end $$;

do $$ begin
  create type astroflow.share_context as enum
    ('friendship','romantic','project','house','family','crew','app');
exception when duplicate_object then null; end $$;

alter table astroflow.profile_shares
  add column if not exists level   astroflow.share_level   not null default 'standard',
  add column if not exists context astroflow.share_context not null default 'friendship';

-- ---------------------------------------------------------------------------
-- grant_access now takes level + context (text args so PostgREST stays simple;
-- defaults keep every existing rpc('grant_access', {target_handle}) call working)
-- ---------------------------------------------------------------------------
drop function if exists astroflow.grant_access(text);
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
end; $function$;

-- ---------------------------------------------------------------------------
-- my_allowances returns level + context so the dashboard can show/edit them
-- ---------------------------------------------------------------------------
drop function if exists astroflow.my_allowances();
create function astroflow.my_allowances()
returns table(handle text, display_name text, level text, context text)
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select p.handle, p.display_name, s.level::text, s.context::text
  from astroflow.profile_shares s
  left join astroflow.profiles p on p.fbid = s.viewer_fbid
  where s.owner_fbid = astroflow.current_fbid();
$function$;

-- ---------------------------------------------------------------------------
-- my_level_on(owner): how deep may the CURRENT caller read this profile?
-- null = no access at all (can_view() already said no).
--   self → open_heart; explicit share → its level;
--   friends-tier visibility → standard; public visibility → light.
-- ---------------------------------------------------------------------------
create or replace function astroflow.my_level_on(owner uuid)
returns text
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select case
    when astroflow.current_fbid() is null then null
    when astroflow.current_fbid() = owner then 'open_heart'
    else coalesce(
      (select s.level::text from astroflow.profile_shares s
        where s.owner_fbid = owner and s.viewer_fbid = astroflow.current_fbid()),
      case (select visibility from astroflow.profiles where fbid = owner)
        when 'public'  then 'light'
        when 'friends' then case when astroflow.are_friends(astroflow.current_fbid(), owner) then 'standard' end
      end)
  end;
$function$;

-- ---------------------------------------------------------------------------
-- Crew auto-shares are labeled as crew context (level stays standard)
-- ---------------------------------------------------------------------------
create or replace function astroflow.join_crew(code text)
returns table(id uuid, name text)
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); c astroflow.crews; m uuid;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select * into c from astroflow.crews where invite_code = code;
  if c.id is null then raise exception 'Invalid invite code'; end if;
  if not exists (select 1 from astroflow.profiles where fbid = me) then
    raise exception 'Create your AstroFlow chart first'; end if;
  insert into astroflow.crew_members(crew_id, fbid) values (c.id, me) on conflict do nothing;
  update astroflow.profiles set visibility = 'specific' where fbid = me and visibility = 'private';
  for m in select fbid from astroflow.crew_members where crew_id = c.id and fbid <> me loop
    insert into astroflow.profile_shares(owner_fbid, viewer_fbid, context) values (me, m, 'crew') on conflict do nothing;
    insert into astroflow.profile_shares(owner_fbid, viewer_fbid, context) values (m, me, 'crew') on conflict do nothing;
  end loop;
  return query select c.id, c.name;
end; $function$;

-- ---------------------------------------------------------------------------
-- "Who reads me" — consent-transparency audit. Only the OWNER sees their own
-- audience; viewers appear by handle + counts only (generic info).
-- ---------------------------------------------------------------------------
create table if not exists astroflow.chart_reads (
  id          bigint generated always as identity primary key,
  owner_fbid  uuid not null references public.flowbond_users(id) on delete cascade,
  viewer_fbid uuid not null references public.flowbond_users(id) on delete cascade,
  kind        text not null check (kind in ('chart','reading','synastry')),
  created_at  timestamptz not null default now()
);
create index if not exists chart_reads_owner_idx on astroflow.chart_reads(owner_fbid, created_at desc);
alter table astroflow.chart_reads enable row level security;

drop policy if exists chart_reads_owner_select on astroflow.chart_reads;
create policy chart_reads_owner_select on astroflow.chart_reads
  for select using (owner_fbid = astroflow.current_fbid());

create or replace function astroflow.log_chart_read(owner uuid, k text)
returns void
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid();
begin
  if me is null or me = owner then return; end if;
  insert into astroflow.chart_reads(owner_fbid, viewer_fbid, kind) values (owner, me, k);
end; $function$;

create or replace function astroflow.my_audience()
returns table(handle text, display_name text, avatar_color text, reads bigint, last_read timestamptz)
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select p.handle, p.display_name, p.avatar_color, count(*), max(r.created_at)
  from astroflow.chart_reads r
  left join astroflow.profiles p on p.fbid = r.viewer_fbid
  where r.owner_fbid = astroflow.current_fbid()
  group by p.handle, p.display_name, p.avatar_color
  order by max(r.created_at) desc;
$function$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function astroflow.grant_access(text, text, text) to authenticated;
grant execute on function astroflow.my_allowances()                to authenticated;
grant execute on function astroflow.my_level_on(uuid)              to authenticated;
grant execute on function astroflow.log_chart_read(uuid, text)     to authenticated;
grant execute on function astroflow.my_audience()                  to authenticated;
