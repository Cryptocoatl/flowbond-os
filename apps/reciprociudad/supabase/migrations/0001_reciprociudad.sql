-- ============================================================================
-- Reciprociudad — schema (Pattern A: own tables, FK to public.flowbond_users,
-- reads through SECURITY DEFINER RPCs). Canonical project: fgsrcxxccdjqyrpkitmk.
--
-- STATUS: NOT YET APPLIED. Validate first with the dry-run wrapper:
--   psql "$DATABASE_URL" -f supabase/dry-run.sql      (BEGIN … ROLLBACK)
-- Then apply for real (commits) once the dry run is clean.
--
-- Idempotent: safe to re-run. FBID = public.flowbond_users.id (Layer-0 root).
-- ============================================================================

create schema if not exists reciprociudad;

-- ── Join leads (email capture for the reciprociudad_join flow) ──────────────
-- A lead is NOT a forged identity. The true FBID is minted only inside an
-- authenticated session via activate_app()/link_auth_or_create_identity();
-- when that lands, backfill `fbid` here.
create table if not exists reciprociudad.reciprociudad_join (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  flow       text not null default 'reciprociudad_join',
  fbid       uuid references public.flowbond_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists reciprociudad_join_email_idx on reciprociudad.reciprociudad_join (lower(email));

-- ── Iniciativas (chinampas) ─────────────────────────────────────────────────
create table if not exists reciprociudad.reciprociudad_iniciativas (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('tianguis','chinampa','tiempo','cultura','ciclo','causas')),
  k           text not null,
  title       text not null,
  description text not null,
  slot        smallint not null check (slot between 1 and 6),
  fbid        uuid references public.flowbond_users(id) on delete set null,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── Eventos ──────────────────────────────────────────────────────────────────
create table if not exists reciprociudad.reciprociudad_eventos (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null,
  starts_at   timestamptz not null,
  location    text,
  fbid        uuid references public.flowbond_users(id) on delete set null,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── Servicios ────────────────────────────────────────────────────────────────
create table if not exists reciprociudad.reciprociudad_servicios (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null,
  category    text,
  fbid        uuid references public.flowbond_users(id) on delete set null,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── RLS: deny-by-default. No direct table access; everything goes through RPCs ─
alter table reciprociudad.reciprociudad_join         enable row level security;
alter table reciprociudad.reciprociudad_iniciativas  enable row level security;
alter table reciprociudad.reciprociudad_eventos      enable row level security;
alter table reciprociudad.reciprociudad_servicios    enable row level security;
-- (intentionally no policies for anon/authenticated → all access via SECURITY DEFINER fns)

-- ── RPC: capture a join lead, return its id ──────────────────────────────────
create or replace function reciprociudad.reciprociudad_join(p_email text, p_flow text default 'reciprociudad_join')
returns uuid
language plpgsql
security definer
set search_path = reciprociudad, public
as $$
declare
  v_id uuid;
begin
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;
  insert into reciprociudad.reciprociudad_join (email, flow)
  values (lower(p_email), coalesce(p_flow, 'reciprociudad_join'))
  returning id into v_id;
  return v_id;
end;
$$;

-- ── RPCs: published catalog reads (only published rows ever leave the DB) ─────
create or replace function reciprociudad.reciprociudad_iniciativas_published()
returns table (id uuid, kind text, k text, title text, description text, slot smallint, fbid uuid)
language sql
security definer
set search_path = reciprociudad, public
as $$
  select id, kind, k, title, description, slot, fbid
  from reciprociudad.reciprociudad_iniciativas
  where published
  order by slot;
$$;

create or replace function reciprociudad.reciprociudad_eventos_published()
returns table (id uuid, title text, description text, starts_at timestamptz, location text, fbid uuid)
language sql
security definer
set search_path = reciprociudad, public
as $$
  select id, title, description, starts_at, location, fbid
  from reciprociudad.reciprociudad_eventos
  where published
  order by starts_at;
$$;

create or replace function reciprociudad.reciprociudad_servicios_published()
returns table (id uuid, title text, description text, category text, fbid uuid)
language sql
security definer
set search_path = reciprociudad, public
as $$
  select id, title, description, category, fbid
  from reciprociudad.reciprociudad_servicios
  where published
  order by created_at desc;
$$;

-- ── Grants ───────────────────────────────────────────────────────────────────
-- The app calls these with the service role; anon/authenticated grants are kept
-- so the same RPCs can back a future client read path (reads are published-only).
grant usage on schema reciprociudad to anon, authenticated, service_role;
grant execute on function reciprociudad.reciprociudad_join(text, text)               to anon, authenticated, service_role;
grant execute on function reciprociudad.reciprociudad_iniciativas_published()        to anon, authenticated, service_role;
grant execute on function reciprociudad.reciprociudad_eventos_published()            to anon, authenticated, service_role;
grant execute on function reciprociudad.reciprociudad_servicios_published()          to anon, authenticated, service_role;
