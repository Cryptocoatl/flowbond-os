-- ════════════════════════════════════════════════════════════════════════
--  FlowBond — 0002_flowbond_grants.sql · FBID-native admin grant spine
--
--  PURPOSE: a single, empire-wide access-control table so any app (ClaudIA,
--  FlowMe, Moon Temple, …) can answer "may THIS FBID admin THIS site/page?".
--
--  PLANE NOTE (read this): this is ACCESS-CONTROL METADATA, not private
--  content. It says only "FBID X may admin app Y (page Z)". It is server-
--  readable BY DESIGN — that is how authorization is enforced. It contains
--  NO ONE's memories/tasks/messages, so it does NOT weaken ClaudIA's §0
--  zero-knowledge vault (0001_claudia.sql). Two separate guarantees.
--
--  All FK to public.flowbond_users(id) = FBID root = auth.uid().
--  Apply to a Supabase DEV BRANCH off fgsrcxxccdjqyrpkitmk; validate; merge.
--  NEVER touch the stale eoajujwpdkfuicnoxetk.
-- ════════════════════════════════════════════════════════════════════════

-- ── the grant table ───────────────────────────────────────────────────────
create table if not exists public.flowbond_grants (
  id           uuid primary key default gen_random_uuid(),
  grantee_fbid uuid not null references public.flowbond_users(id) on delete cascade,
  grantor_fbid uuid not null references public.flowbond_users(id) on delete cascade,
  app_slug     text not null,                          -- the website/app (free text: 'moonchurch', 'flowme', …)
  page_path    text,                                   -- NULL = whole site; else a single page (e.g. '/admin')
  role         text not null default 'admin'
                 check (role in ('viewer','editor','admin','superadmin')),
  status       text not null default 'active'
                 check (status in ('active','revoked')),
  granted_at   timestamptz not null default now(),
  revoked_at   timestamptz
);
create index if not exists flowbond_grants_grantee_idx on public.flowbond_grants(grantee_fbid) where status = 'active';
create index if not exists flowbond_grants_app_idx     on public.flowbond_grants(app_slug)     where status = 'active';
-- one active grant per (grantee, app, page, role)
create unique index if not exists flowbond_grants_active_uniq
  on public.flowbond_grants (grantee_fbid, app_slug, coalesce(page_path, ''), role)
  where status = 'active';

-- ── RLS: read your own grants; superadmin reads all; writes only via RPC ───
alter table public.flowbond_grants enable row level security;
drop policy if exists flowbond_grants_read on public.flowbond_grants;
create policy flowbond_grants_read on public.flowbond_grants
  for select using (grantee_fbid = auth.uid() or public.is_superadmin());
-- (no insert/update/delete policies → all writes go through the SECURITY DEFINER RPCs below)

-- ── role ranking (viewer < editor < admin < superadmin) ───────────────────
create or replace function public.flowbond_role_rank(p_role text)
returns int language sql immutable as $$
  select case p_role
    when 'viewer' then 1 when 'editor' then 2 when 'admin' then 3 when 'superadmin' then 4
    else 0 end;
$$;

-- ── is the caller (or p_fbid) a global superadmin? ────────────────────────
create or replace function public.is_superadmin(p_fbid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.flowbond_grants
    where grantee_fbid = p_fbid and role = 'superadmin' and status = 'active'
  );
$$;

-- ── does p_fbid hold at least p_min_role on this app (+page)? ──────────────
--  A whole-site grant (page_path IS NULL) covers every page. A page-scoped
--  grant covers only that page. Superadmin passes everything.
create or replace function public.has_grant(
  p_app_slug  text,
  p_page_path text default null,
  p_min_role  text default 'admin',
  p_fbid      uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_superadmin(p_fbid) or exists (
    select 1 from public.flowbond_grants g
    where g.grantee_fbid = p_fbid
      and g.status = 'active'
      and g.app_slug = p_app_slug
      and (g.page_path is null or g.page_path = p_page_path)
      and public.flowbond_role_rank(g.role) >= public.flowbond_role_rank(p_min_role)
  );
$$;

-- ── grant access (SUPERADMIN ONLY in v1) ──────────────────────────────────
create or replace function public.grant_access(
  p_grantee_fbid uuid,
  p_app_slug     text,
  p_page_path    text default null,
  p_role         text default 'admin'
) returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); gid uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if not public.is_superadmin(me) then raise exception 'superadmin_required'; end if;
  if p_role = 'superadmin' then raise exception 'superadmin_role_not_grantable_here'; end if;
  if public.flowbond_role_rank(p_role) = 0 then raise exception 'invalid_role'; end if;
  if not exists (select 1 from public.flowbond_users where id = p_grantee_fbid) then
    raise exception 'unknown_grantee_fbid';
  end if;

  -- reactivate a matching revoked grant, else insert fresh
  update public.flowbond_grants
     set status = 'active', revoked_at = null, grantor_fbid = me, granted_at = now()
   where grantee_fbid = p_grantee_fbid and app_slug = p_app_slug
     and coalesce(page_path,'') = coalesce(p_page_path,'') and role = p_role
   returning id into gid;
  if gid is null then
    insert into public.flowbond_grants(grantee_fbid, grantor_fbid, app_slug, page_path, role)
    values (p_grantee_fbid, me, p_app_slug, p_page_path, p_role)
    returning id into gid;
  end if;
  return gid;
end $$;

-- ── revoke (superadmin or the original grantor) ───────────────────────────
create or replace function public.revoke_access(p_grant_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.flowbond_grants;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select * into g from public.flowbond_grants where id = p_grant_id;
  if g.id is null then raise exception 'grant_not_found'; end if;
  if g.role = 'superadmin' then raise exception 'cannot_revoke_superadmin_here'; end if;
  if not (public.is_superadmin(me) or me = g.grantor_fbid) then
    raise exception 'not_authorized_to_revoke';
  end if;
  update public.flowbond_grants set status = 'revoked', revoked_at = now() where id = p_grant_id;
end $$;

-- ── my own active grants (any app may call to check the caller) ────────────
create or replace function public.my_grants()
returns table(id uuid, app_slug text, page_path text, role text, granted_at timestamptz)
language sql stable security definer set search_path = public as $$
  select id, app_slug, page_path, role, granted_at
  from public.flowbond_grants
  where grantee_fbid = auth.uid() and status = 'active'
  order by app_slug, page_path nulls first;
$$;

-- ── list all grants (SUPERADMIN ONLY) — for the admin to review/manage ─────
create or replace function public.list_grants(p_app_slug text default null)
returns table(id uuid, grantee_fbid uuid, grantor_fbid uuid, app_slug text,
              page_path text, role text, status text, granted_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_superadmin(auth.uid()) then raise exception 'superadmin_required'; end if;
  return query
    select g.id, g.grantee_fbid, g.grantor_fbid, g.app_slug, g.page_path, g.role, g.status, g.granted_at
    from public.flowbond_grants g
    where g.status = 'active' and (p_app_slug is null or g.app_slug = p_app_slug)
    order by g.app_slug, g.page_path nulls first;
end $$;

-- ── ROOT BOOTSTRAP ────────────────────────────────────────────────────────
--  The very first superadmin. Locked to Steph Ferrera's auth email, and only
--  works while NO superadmin exists yet. Steph runs this once from ClaudIA
--  (the `/admin init` command) — she becomes the global root. Idempotent:
--  if she's already root it just returns her FBID.
create or replace function public.claim_root_superadmin()
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); my_email text;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if public.is_superadmin(me) then return me; end if;
  if exists (select 1 from public.flowbond_grants where role = 'superadmin' and status = 'active') then
    raise exception 'root_already_claimed';
  end if;
  select lower(email) into my_email from auth.users where id = me;
  if my_email is distinct from 'cryptocoatl101@gmail.com' then
    raise exception 'not_the_founder';
  end if;
  insert into public.flowbond_grants(grantee_fbid, grantor_fbid, app_slug, role)
  values (me, me, '*', 'superadmin');
  return me;
end $$;

-- ── EXECUTE grants ────────────────────────────────────────────────────────
revoke all on function public.is_superadmin(uuid)              from public, anon;
revoke all on function public.has_grant(text, text, text, uuid) from public, anon;
revoke all on function public.grant_access(uuid, text, text, text) from public, anon;
revoke all on function public.revoke_access(uuid)             from public, anon;
revoke all on function public.my_grants()                     from public, anon;
revoke all on function public.list_grants(text)               from public, anon;
revoke all on function public.claim_root_superadmin()         from public, anon;

grant execute on function public.is_superadmin(uuid)              to authenticated;
grant execute on function public.has_grant(text, text, text, uuid) to authenticated;
grant execute on function public.grant_access(uuid, text, text, text) to authenticated;
grant execute on function public.revoke_access(uuid)             to authenticated;
grant execute on function public.my_grants()                     to authenticated;
grant execute on function public.list_grants(text)               to authenticated;
grant execute on function public.claim_root_superadmin()         to authenticated;
