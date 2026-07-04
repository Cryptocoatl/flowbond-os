-- AstroFlow crews: shareable invite-link groups that mutually share charts.
-- NOTE: already applied to the live project (fgsrcxxccdjqyrpkitmk) via MCP on
-- 2026-06-06; this file mirrors the live definitions for repo parity.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists astroflow.crews (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_fbid  uuid not null references public.flowbond_users(id) on delete cascade,
  invite_code text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  created_at  timestamptz not null default now()
);

create table if not exists astroflow.crew_members (
  crew_id   uuid not null references astroflow.crews(id) on delete cascade,
  fbid      uuid not null references public.flowbond_users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (crew_id, fbid)
);

alter table astroflow.crews enable row level security;
alter table astroflow.crew_members enable row level security;

-- Members can see their crews and fellow members; all writes go through the
-- SECURITY DEFINER functions below.
drop policy if exists crews_select on astroflow.crews;
create policy crews_select on astroflow.crews for select using (
  exists (select 1 from astroflow.crew_members cm
          where cm.crew_id = crews.id and cm.fbid = astroflow.current_fbid())
);

drop policy if exists crew_members_select on astroflow.crew_members;
create policy crew_members_select on astroflow.crew_members for select using (
  exists (select 1 from astroflow.crew_members cm
          where cm.crew_id = crew_members.crew_id and cm.fbid = astroflow.current_fbid())
);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------
create or replace function astroflow.create_crew(crew_name text)
returns table(id uuid, name text, invite_code text)
language plpgsql security definer
set search_path to 'astroflow', 'public'
as $function$
declare me uuid := astroflow.current_fbid(); c astroflow.crews;
begin
  if me is null then raise exception 'not signed in'; end if;
  insert into astroflow.crews(name, owner_fbid) values (crew_name, me) returning * into c;
  insert into astroflow.crew_members(crew_id, fbid) values (c.id, me) on conflict do nothing;
  return query select c.id, c.name, c.invite_code;
end; $function$;

-- Public invite-landing preview (name + member count only; no member identities).
create or replace function astroflow.crew_preview(code text)
returns table(name text, member_count integer, owner_handle text)
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select c.name,
    (select count(*)::int from astroflow.crew_members where crew_id = c.id),
    (select handle from astroflow.profiles where fbid = c.owner_fbid)
  from astroflow.crews c where c.invite_code = code;
$function$;

-- Joining mutually shares charts across the whole crew and lifts a fully
-- private profile to 'specific' so those shares actually take effect.
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
    insert into astroflow.profile_shares(owner_fbid, viewer_fbid) values (me, m) on conflict do nothing;
    insert into astroflow.profile_shares(owner_fbid, viewer_fbid) values (m, me) on conflict do nothing;
  end loop;
  return query select c.id, c.name;
end; $function$;

create or replace function astroflow.my_crews()
returns table(id uuid, name text, invite_code text, is_owner boolean, members jsonb)
language sql stable security definer
set search_path to 'astroflow', 'public'
as $function$
  select c.id, c.name, c.invite_code, c.owner_fbid = astroflow.current_fbid(),
    (select jsonb_agg(jsonb_build_object('handle', p.handle, 'display_name', p.display_name, 'avatar_color', p.avatar_color))
       from astroflow.crew_members cm left join astroflow.profiles p on p.fbid = cm.fbid
       where cm.crew_id = c.id)
  from astroflow.crews c
  where exists (select 1 from astroflow.crew_members cm where cm.crew_id = c.id and cm.fbid = astroflow.current_fbid());
$function$;

grant execute on function astroflow.create_crew(text)  to authenticated;
grant execute on function astroflow.crew_preview(text) to anon, authenticated;
grant execute on function astroflow.join_crew(text)    to authenticated;
grant execute on function astroflow.my_crews()         to authenticated;
