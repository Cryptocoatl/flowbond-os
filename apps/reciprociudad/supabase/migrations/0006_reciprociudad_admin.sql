-- ============================================================================
-- Reciprociudad — /admin (editable site) + red viva moderation.
-- Canonical project: fgsrcxxccdjqyrpkitmk. Pattern A:
--   tables live in the private `reciprociudad` schema (RLS on, ZERO policies),
--   every read/write goes through SECURITY DEFINER RPCs in `public`.
--
-- The `reciprociudad` schema is NOT in the PostgREST exposed list, so the RPCs
-- must be created in `public` to be callable from the browser.
--
-- Idempotent: safe to re-run. FBID = public.flowbond_users.id (Layer-0 root).
-- ============================================================================

create schema if not exists reciprociudad;

-- ── Who may edit the site ───────────────────────────────────────────────────
create table if not exists reciprociudad.site_admins (
  fbid       uuid primary key references public.flowbond_users(id) on delete cascade,
  email      text not null,
  nombre     text,
  rol        text not null default 'editor' check (rol in ('super_admin','editor')),
  activo     boolean not null default true,
  added_by   uuid references public.flowbond_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists site_admins_email_idx on reciprociudad.site_admins (lower(email));

-- ── Editable copy: one row per overridden key ───────────────────────────────
-- Absent key  → the app falls back to the canonical default baked in the code
-- (lib/site-content.ts). That's what "Restaurar original" does: delete the row.
create table if not exists reciprociudad.site_content (
  key        text primary key,
  value      text not null,
  updated_by uuid references public.flowbond_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ── Append-only history (nothing Fer changes is ever lost) ──────────────────
create table if not exists reciprociudad.site_content_history (
  id          bigserial primary key,
  key         text not null,
  old_value   text,
  new_value   text,
  actor       uuid references public.flowbond_users(id) on delete set null,
  actor_email text,
  at          timestamptz not null default now()
);
create index if not exists site_content_history_at_idx  on reciprociudad.site_content_history (at desc);
create index if not exists site_content_history_key_idx on reciprociudad.site_content_history (key, at desc);

-- ── Replaceable images (slot → public URL) ──────────────────────────────────
create table if not exists reciprociudad.site_media (
  slot       text primary key,
  url        text not null,
  path       text,
  updated_by uuid references public.flowbond_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ── Iniciativas (the six chinampa cards), curated from /admin ───────────────
create table if not exists reciprociudad.site_iniciativas (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'tianguis'
              check (kind in ('tianguis','chinampa','tiempo','cultura','ciclo','causas')),
  k           text not null,
  title       text not null,
  description text not null,
  slot        smallint not null check (slot between 1 and 6),
  published   boolean not null default true,
  updated_by  uuid references public.flowbond_users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists site_iniciativas_slot_idx on reciprociudad.site_iniciativas (slot);

-- ── RLS: deny-by-default, no policies. RPC-only, on purpose. ────────────────
alter table reciprociudad.site_admins          enable row level security;
alter table reciprociudad.site_content         enable row level security;
alter table reciprociudad.site_content_history enable row level security;
alter table reciprociudad.site_media           enable row level security;
alter table reciprociudad.site_iniciativas     enable row level security;

-- ── History is append-only: block UPDATE/DELETE at the table level ──────────
create or replace function reciprociudad.block_mutation()
returns trigger language plpgsql
set search_path = reciprociudad, public
as $$ begin raise exception 'append-only table'; end; $$;

drop trigger if exists site_content_history_append_only on reciprociudad.site_content_history;
create trigger site_content_history_append_only
  before update or delete on reciprociudad.site_content_history
  for each row execute function reciprociudad.block_mutation();

-- ============================================================================
-- Role helpers (internal — NOT granted to anon/authenticated directly)
-- ============================================================================
create or replace function reciprociudad.actor()
returns uuid language sql stable
set search_path = reciprociudad, public
as $$ select auth.uid(); $$;

create or replace function reciprociudad.is_editor_uid(p_uid uuid)
returns boolean language sql stable security definer
set search_path = reciprociudad, public
as $$
  select exists (
    select 1 from reciprociudad.site_admins
    where fbid = p_uid and activo
  );
$$;

create or replace function reciprociudad.require_editor()
returns uuid language plpgsql stable security definer
set search_path = reciprociudad, public
as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'not authenticated'; end if;
  if not reciprociudad.is_editor_uid(v) then raise exception 'not an editor'; end if;
  return v;
end;
$$;

create or replace function reciprociudad.require_super()
returns uuid language plpgsql stable security definer
set search_path = reciprociudad, public
as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'not authenticated'; end if;
  if not exists (
    select 1 from reciprociudad.site_admins
    where fbid = v and activo and rol = 'super_admin'
  ) then raise exception 'not a super admin'; end if;
  return v;
end;
$$;

-- ============================================================================
-- PUBLIC READS (anon + authenticated) — what the live site renders
-- ============================================================================
create or replace function public.reciprociudad_content_public()
returns table (key text, value text)
language sql security definer stable
set search_path = reciprociudad, public
as $$ select key, value from reciprociudad.site_content; $$;

create or replace function public.reciprociudad_media_public()
returns table (slot text, url text)
language sql security definer stable
set search_path = reciprociudad, public
as $$ select slot, url from reciprociudad.site_media; $$;

create or replace function public.reciprociudad_iniciativas_public()
returns table (id uuid, kind text, k text, title text, description text, slot smallint)
language sql security definer stable
set search_path = reciprociudad, public
as $$
  select id, kind, k, title, description, slot
  from reciprociudad.site_iniciativas
  where published
  order by slot;
$$;

-- ============================================================================
-- SESSION / GATE
-- ============================================================================
create or replace function public.reciprociudad_me()
returns table (fbid uuid, email text, nombre text, rol text, is_editor boolean, is_super boolean)
language sql security definer stable
set search_path = reciprociudad, public
as $$
  select a.fbid, a.email, a.nombre, a.rol,
         true as is_editor,
         (a.rol = 'super_admin') as is_super
  from reciprociudad.site_admins a
  where a.fbid = auth.uid() and a.activo;
$$;

-- ============================================================================
-- EDITOR WRITES
-- ============================================================================
create or replace function public.reciprociudad_content_set(p_key text, p_value text)
returns void language plpgsql security definer
set search_path = reciprociudad, public
as $$
declare
  v_uid   uuid := reciprociudad.require_editor();
  v_email text;
  v_old   text;
begin
  if p_key is null or length(trim(p_key)) = 0 then raise exception 'key required'; end if;
  if length(p_value) > 8000 then raise exception 'value too long'; end if;

  select email into v_email from reciprociudad.site_admins where fbid = v_uid;
  select value into v_old   from reciprociudad.site_content where key = p_key;

  insert into reciprociudad.site_content (key, value, updated_by, updated_at)
  values (p_key, p_value, v_uid, now())
  on conflict (key) do update
    set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();

  insert into reciprociudad.site_content_history (key, old_value, new_value, actor, actor_email)
  values (p_key, v_old, p_value, v_uid, v_email);
end;
$$;

-- "Restaurar original" — drop the override so the code default renders again.
create or replace function public.reciprociudad_content_reset(p_key text)
returns void language plpgsql security definer
set search_path = reciprociudad, public
as $$
declare
  v_uid   uuid := reciprociudad.require_editor();
  v_email text;
  v_old   text;
begin
  select email into v_email from reciprociudad.site_admins where fbid = v_uid;
  select value into v_old   from reciprociudad.site_content where key = p_key;
  if v_old is null then return; end if;

  delete from reciprociudad.site_content where key = p_key;
  insert into reciprociudad.site_content_history (key, old_value, new_value, actor, actor_email)
  values (p_key, v_old, null, v_uid, v_email);
end;
$$;

create or replace function public.reciprociudad_content_history(p_key text default null, p_limit int default 60)
returns table (id bigint, key text, old_value text, new_value text, actor_email text, at timestamptz)
language sql security definer stable
set search_path = reciprociudad, public
as $$
  select h.id, h.key, h.old_value, h.new_value, h.actor_email, h.at
  from reciprociudad.site_content_history h
  where reciprociudad.is_editor_uid(auth.uid())
    and (p_key is null or h.key = p_key)
  order by h.at desc
  limit least(coalesce(p_limit, 60), 300);
$$;

create or replace function public.reciprociudad_media_set(p_slot text, p_url text, p_path text default null)
returns void language plpgsql security definer
set search_path = reciprociudad, public
as $$
declare v_uid uuid := reciprociudad.require_editor();
begin
  if p_slot is null or length(trim(p_slot)) = 0 then raise exception 'slot required'; end if;
  if p_url !~ '^https?://' and p_url !~ '^/' then raise exception 'invalid url'; end if;

  insert into reciprociudad.site_media (slot, url, path, updated_by, updated_at)
  values (p_slot, p_url, p_path, v_uid, now())
  on conflict (slot) do update
    set url = excluded.url, path = excluded.path, updated_by = excluded.updated_by, updated_at = now();

  insert into reciprociudad.site_content_history (key, old_value, new_value, actor, actor_email)
  select 'media:' || p_slot, null, p_url, v_uid, email
  from reciprociudad.site_admins where fbid = v_uid;
end;
$$;

create or replace function public.reciprociudad_media_reset(p_slot text)
returns void language plpgsql security definer
set search_path = reciprociudad, public
as $$
declare v_uid uuid := reciprociudad.require_editor();
begin
  delete from reciprociudad.site_media where slot = p_slot;
  insert into reciprociudad.site_content_history (key, old_value, new_value, actor, actor_email)
  select 'media:' || p_slot, null, null, v_uid, email
  from reciprociudad.site_admins where fbid = v_uid;
end;
$$;

-- ── Iniciativas CRUD ────────────────────────────────────────────────────────
create or replace function public.reciprociudad_iniciativas_all()
returns table (id uuid, kind text, k text, title text, description text, slot smallint, published boolean)
language sql security definer stable
set search_path = reciprociudad, public
as $$
  select i.id, i.kind, i.k, i.title, i.description, i.slot, i.published
  from reciprociudad.site_iniciativas i
  where reciprociudad.is_editor_uid(auth.uid())
  order by i.slot;
$$;

create or replace function public.reciprociudad_iniciativa_upsert(
  p_id uuid, p_kind text, p_k text, p_title text, p_description text,
  p_slot int, p_published boolean
) returns uuid language plpgsql security definer
set search_path = reciprociudad, public
as $$
declare
  v_uid uuid := reciprociudad.require_editor();
  v_id  uuid;
begin
  if p_id is null then
    insert into reciprociudad.site_iniciativas (kind, k, title, description, slot, published, updated_by)
    values (p_kind, p_k, p_title, p_description, p_slot::smallint, coalesce(p_published, true), v_uid)
    returning id into v_id;
  else
    update reciprociudad.site_iniciativas
       set kind = p_kind, k = p_k, title = p_title, description = p_description,
           slot = p_slot::smallint, published = coalesce(p_published, true),
           updated_by = v_uid, updated_at = now()
     where id = p_id
     returning id into v_id;
    if v_id is null then raise exception 'iniciativa not found'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.reciprociudad_iniciativa_delete(p_id uuid)
returns void language plpgsql security definer
set search_path = reciprociudad, public
as $$
begin
  perform reciprociudad.require_editor();
  delete from reciprociudad.site_iniciativas where id = p_id;
end;
$$;

-- ── Red viva: moderate the nodes people register ────────────────────────────
create or replace function public.reciprociudad_nodes_admin_list()
returns table (
  id uuid, name text, kind text, description text, lat double precision,
  lng double precision, offers text, needs text, contact text, status text,
  created_at timestamptz
) language sql security definer stable
set search_path = reciprociudad, public
as $$
  select n.id, n.name, n.kind, n.description, n.lat, n.lng, n.offers, n.needs,
         n.contact, n.status, n.created_at
  from reciprociudad.reciprociudad_nodos n
  where reciprociudad.is_editor_uid(auth.uid())
  order by n.created_at desc;
$$;

create or replace function public.reciprociudad_node_set_status(p_id uuid, p_status text)
returns void language plpgsql security definer
set search_path = reciprociudad, public
as $$
declare v_uid uuid := reciprociudad.require_editor();
begin
  -- 'draft' is the existing table vocabulary for "not on the site"; nodes are
  -- created 'published' by their owner, so moderation means hiding, not approving.
  if p_status not in ('published','draft') then raise exception 'invalid status'; end if;
  update reciprociudad.reciprociudad_nodos
     set status = p_status, updated_at = now()
   where id = p_id;

  insert into reciprociudad.site_content_history (key, old_value, new_value, actor, actor_email)
  select 'nodo:' || p_id::text, null, p_status, v_uid, email
  from reciprociudad.site_admins where fbid = v_uid;
end;
$$;

create or replace function public.reciprociudad_node_admin_edit(
  p_id uuid, p_name text, p_kind text, p_description text,
  p_lat double precision, p_lng double precision,
  p_offers text, p_needs text, p_contact text
) returns void language plpgsql security definer
set search_path = reciprociudad, public
as $$
begin
  perform reciprociudad.require_editor();
  update reciprociudad.reciprociudad_nodos
     set name = p_name, kind = p_kind, description = p_description,
         lat = p_lat, lng = p_lng, offers = p_offers, needs = p_needs,
         contact = p_contact, updated_at = now()
   where id = p_id;
end;
$$;

-- ── Team (super_admin only) ─────────────────────────────────────────────────
create or replace function public.reciprociudad_admins_list()
returns table (fbid uuid, email text, nombre text, rol text, activo boolean, created_at timestamptz)
language sql security definer stable
set search_path = reciprociudad, public
as $$
  select a.fbid, a.email, a.nombre, a.rol, a.activo, a.created_at
  from reciprociudad.site_admins a
  where exists (
    select 1 from reciprociudad.site_admins s
    where s.fbid = auth.uid() and s.activo and s.rol = 'super_admin'
  )
  order by a.created_at;
$$;

-- Grants editing rights to an EXISTING FBID only — never mints an identity.
create or replace function public.reciprociudad_admin_grant(p_email text, p_rol text, p_nombre text default null)
returns uuid language plpgsql security definer
set search_path = reciprociudad, public
as $$
declare
  v_uid    uuid := reciprociudad.require_super();
  v_target uuid;
begin
  if p_rol not in ('super_admin','editor') then raise exception 'invalid role'; end if;
  select id into v_target from public.flowbond_users where lower(email) = lower(trim(p_email));
  if v_target is null then
    raise exception 'no FBID for %, that person must log in to reciprociudad.lat first', p_email;
  end if;

  insert into reciprociudad.site_admins (fbid, email, nombre, rol, activo, added_by)
  values (v_target, lower(trim(p_email)), p_nombre, p_rol, true, v_uid)
  on conflict (fbid) do update
    set rol = excluded.rol, activo = true,
        nombre = coalesce(excluded.nombre, reciprociudad.site_admins.nombre);
  return v_target;
end;
$$;

create or replace function public.reciprociudad_admin_set_active(p_fbid uuid, p_activo boolean)
returns void language plpgsql security definer
set search_path = reciprociudad, public
as $$
declare v_uid uuid := reciprociudad.require_super();
begin
  if p_fbid = v_uid and not p_activo then raise exception 'no puedes desactivarte a ti misma'; end if;
  -- never leave the site without a super admin
  if not p_activo and (
    select rol from reciprociudad.site_admins where fbid = p_fbid
  ) = 'super_admin' and (
    select count(*) from reciprociudad.site_admins where activo and rol = 'super_admin'
  ) <= 1 then
    raise exception 'es el último super admin';
  end if;
  update reciprociudad.site_admins set activo = p_activo where fbid = p_fbid;
end;
$$;

-- ============================================================================
-- GRANTS — Supabase grants EXECUTE to PUBLIC by default; revoke, then re-grant
-- exactly what each audience needs.
-- ============================================================================
grant usage on schema reciprociudad to anon, authenticated, service_role;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure::text sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'reciprociudad\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- Anonymous visitors read only what the site renders.
grant execute on function public.reciprociudad_content_public()     to anon, authenticated, service_role;
grant execute on function public.reciprociudad_media_public()       to anon, authenticated, service_role;
grant execute on function public.reciprociudad_iniciativas_public() to anon, authenticated, service_role;
grant execute on function public.reciprociudad_nodes_published()    to anon, authenticated, service_role;

-- Logged-in identity surface (the node people register themselves).
grant execute on function public.reciprociudad_my_node()            to authenticated, service_role;
grant execute on function public.reciprociudad_node_upsert(text, text, text, double precision, double precision, text, text, text)
  to authenticated, service_role;

-- Editor surface — the functions self-enforce the role; anon stays revoked.
grant execute on function public.reciprociudad_me()                                            to authenticated, service_role;
grant execute on function public.reciprociudad_content_set(text, text)                         to authenticated, service_role;
grant execute on function public.reciprociudad_content_reset(text)                             to authenticated, service_role;
grant execute on function public.reciprociudad_content_history(text, int)                      to authenticated, service_role;
grant execute on function public.reciprociudad_media_set(text, text, text)                     to authenticated, service_role;
grant execute on function public.reciprociudad_media_reset(text)                               to authenticated, service_role;
grant execute on function public.reciprociudad_iniciativas_all()                               to authenticated, service_role;
grant execute on function public.reciprociudad_iniciativa_upsert(uuid, text, text, text, text, int, boolean)
  to authenticated, service_role;
grant execute on function public.reciprociudad_iniciativa_delete(uuid)                         to authenticated, service_role;
grant execute on function public.reciprociudad_nodes_admin_list()                              to authenticated, service_role;
grant execute on function public.reciprociudad_node_set_status(uuid, text)                     to authenticated, service_role;
grant execute on function public.reciprociudad_node_admin_edit(uuid, text, text, text, double precision, double precision, text, text, text)
  to authenticated, service_role;
grant execute on function public.reciprociudad_admins_list()                                   to authenticated, service_role;
grant execute on function public.reciprociudad_admin_grant(text, text, text)                   to authenticated, service_role;
grant execute on function public.reciprociudad_admin_set_active(uuid, boolean)                 to authenticated, service_role;

-- ============================================================================
-- SEED — Steph (super_admin) + Fer (editor)
-- ============================================================================
insert into reciprociudad.site_admins (fbid, email, nombre, rol, activo)
select id, lower(email), 'Steph', 'super_admin', true
from public.flowbond_users where lower(email) = 'cryptocoatl101@gmail.com'
on conflict (fbid) do update set rol = 'super_admin', activo = true;

insert into reciprociudad.site_admins (fbid, email, nombre, rol, activo)
select id, lower(email), 'Fer', 'editor', true
from public.flowbond_users where lower(email) = 'fernandokawoq@gmail.com'
on conflict (fbid) do update set rol = 'editor', activo = true;
