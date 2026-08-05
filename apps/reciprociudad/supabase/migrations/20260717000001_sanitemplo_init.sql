-- ════════════════════════════════════════════════════════════════
-- SANI TEMPLO · migración inicial
-- Proyecto canónico: fgsrcxxccdjqyrpkitmk (us-east-2)
-- Pattern A: prefijo de app, FK a flowbond_users, RLS on,
--            toda mutación por RPC SECURITY DEFINER, ledgers append-only.
--
-- DRY RUN OBLIGATORIO ANTES DE COMMIT:
--   BEGIN;
--   \i supabase/migrations/20260717000001_sanitemplo_init.sql
--   -- revisar \dt sanitemplo_*  y  \df sanitemplo_*
--   ROLLBACK;
-- ════════════════════════════════════════════════════════════════

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ────────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────────
do $$ begin
  create type sanitemplo_riel        as enum ('A','B');
  create type sanitemplo_zona        as enum ('exterior','interior');
  create type sanitemplo_node_status as enum ('abierto','apertura','solicitud');
  create type sanitemplo_unit_status as enum ('produccion','transito','activo','mantenimiento','retirado');
  create type sanitemplo_order_status as enum ('cotizada','pagada','asignada','activa','cerrada','cancelada');
  create type sanitemplo_cfdi_tipo   as enum ('publicidad','donativo');
  create type sanitemplo_visit_tipo  as enum ('pagada','patrocinada','cortesia');
  create type sanitemplo_fund_base   as enum ('gross','margin','sponsorship');
  create type sanitemplo_fund_status as enum ('devengado','transferido');
exception when duplicate_object then null; end $$;

-- ────────────────────────────────────────────────────────────────
-- NODOS · la red crece por nodos, no por ciudades
-- ────────────────────────────────────────────────────────────────
create table if not exists sanitemplo_nodes (
  id             uuid primary key default gen_random_uuid(),
  num            text unique not null,
  nombre         text not null,
  status         sanitemplo_node_status not null default 'solicitud',
  capacidad      int not null default 0,
  geom           geography(Point,4326),
  operador_fbid  uuid references flowbond_users(id),
  -- TODO_CONFIRM: qué gana el nodo local. Sin esto no hay red, hay flota.
  split_local_pct numeric(5,4),
  created_at     timestamptz not null default now()
);
create index if not exists sanitemplo_nodes_geom_idx on sanitemplo_nodes using gist (geom);
create index if not exists sanitemplo_nodes_status_idx on sanitemplo_nodes (status);

-- ────────────────────────────────────────────────────────────────
-- UNIDADES · capex propio, no renta
-- ────────────────────────────────────────────────────────────────
create table if not exists sanitemplo_units (
  id                 uuid primary key default gen_random_uuid(),
  serial             text unique not null,
  node_id            uuid references sanitemplo_nodes(id),
  status             sanitemplo_unit_status not null default 'produccion',
  capex_mxn          numeric(12,2) not null default 44000,   -- TODO_CONFIRM alcance
  vida_util_meses    int not null default 48,
  fecha_produccion   date,
  geom               geography(Point,4326),
  qr_root            text unique not null default encode(gen_random_bytes(8),'hex'),
  created_at         timestamptz not null default now()
);
create index if not exists sanitemplo_units_node_idx on sanitemplo_units (node_id);
create index if not exists sanitemplo_units_geom_idx on sanitemplo_units using gist (geom);

-- ────────────────────────────────────────────────────────────────
-- ESPACIOS · un espacio nunca cambia de riel
-- ────────────────────────────────────────────────────────────────
create table if not exists sanitemplo_spaces (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references sanitemplo_units(id) on delete cascade,
  tipo          text not null,          -- sol|loto|luna|milpa|semilla|aroma|repisa|espejo|raiz|cta|placa|altar
  zona          sanitemplo_zona not null,
  riel          sanitemplo_riel not null,
  cm_ancho      numeric(6,1),
  cm_alto       numeric(6,1),
  precio_lista  numeric(10,2) not null default 0,
  sagrado       boolean not null default false,
  ocupado_por   uuid,                   -- -> sanitemplo_orders(id)
  qr_slug       text unique,
  created_at    timestamptz not null default now()
);
create index if not exists sanitemplo_spaces_unit_idx on sanitemplo_spaces (unit_id);

-- El altar no se vende. Que la base de datos lo impida, no el código de la UI.
alter table sanitemplo_spaces drop constraint if exists sanitemplo_altar_no_se_vende;
alter table sanitemplo_spaces add constraint sanitemplo_altar_no_se_vende
  check (not (sagrado and ocupado_por is not null));

-- ────────────────────────────────────────────────────────────────
-- PATROCINADORES
-- ────────────────────────────────────────────────────────────────
create table if not exists sanitemplo_sponsors (
  id            uuid primary key default gen_random_uuid(),
  fbid          uuid not null references flowbond_users(id),
  razon_social  text not null,
  rfc           text,
  riel          sanitemplo_riel not null,
  kyc_estado    text not null default 'pendiente',
  created_at    timestamptz not null default now()
);
create index if not exists sanitemplo_sponsors_fbid_idx on sanitemplo_sponsors (fbid);

-- ────────────────────────────────────────────────────────────────
-- ÓRDENES · un solo SKU: visitas
-- ────────────────────────────────────────────────────────────────
create table if not exists sanitemplo_orders (
  id                uuid primary key default gen_random_uuid(),
  sponsor_id        uuid not null references sanitemplo_sponsors(id),
  riel              sanitemplo_riel not null,
  visitas           int not null check (visitas >= 0),
  templos           int not null default 1 check (templos >= 1),
  plazo_id          text not null,
  space_tipos       text[] not null default '{}',
  visitas_subtotal  numeric(12,2) not null,
  presencia_subtotal numeric(12,2) not null,
  subtotal          numeric(12,2) not null,
  iva               numeric(12,2) not null default 0,
  total             numeric(12,2) not null,
  status            sanitemplo_order_status not null default 'cotizada',
  cfdi_tipo         sanitemplo_cfdi_tipo,
  cfdi_uuid         text,
  claim_origen      boolean not null default false,   -- sin costo, sin cantidad, sin fecha
  created_at        timestamptz not null default now()
);
create index if not exists sanitemplo_orders_sponsor_idx on sanitemplo_orders (sponsor_id);
create index if not exists sanitemplo_orders_status_idx on sanitemplo_orders (status);

-- Riel B jamás lleva IVA ni CFDI de publicidad.
alter table sanitemplo_orders drop constraint if exists sanitemplo_riel_b_sin_iva;
alter table sanitemplo_orders add constraint sanitemplo_riel_b_sin_iva
  check (riel <> 'B' or (iva = 0 and (cfdi_tipo is null or cfdi_tipo = 'donativo')));

alter table sanitemplo_orders drop constraint if exists sanitemplo_riel_a_es_publicidad;
alter table sanitemplo_orders add constraint sanitemplo_riel_a_es_publicidad
  check (riel <> 'A' or (cfdi_tipo is null or cfdi_tipo = 'publicidad'));

-- ────────────────────────────────────────────────────────────────
-- ASIGNACIÓN · el "después decides dónde y cuándo"
-- ────────────────────────────────────────────────────────────────
create table if not exists sanitemplo_allocations (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references sanitemplo_orders(id) on delete cascade,
  node_id           uuid not null references sanitemplo_nodes(id),
  unit_id           uuid references sanitemplo_units(id),
  visitas_asignadas int not null check (visitas_asignadas >= 0),
  fecha_inicio      date not null,
  fecha_fin         date not null,
  created_at        timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);
create index if not exists sanitemplo_alloc_order_idx on sanitemplo_allocations (order_id);

-- ────────────────────────────────────────────────────────────────
-- CTA LOCALIZADO · el impreso se hace una vez, se revende infinitas
-- ────────────────────────────────────────────────────────────────
create table if not exists sanitemplo_cta (
  id               uuid primary key default gen_random_uuid(),
  space_id         uuid not null references sanitemplo_spaces(id) on delete cascade,
  node_id          uuid references sanitemplo_nodes(id),
  order_id         uuid references sanitemplo_orders(id),
  campana          text not null,
  destino_url      text not null,
  vigencia_inicio  timestamptz not null,
  vigencia_fin     timestamptz not null,
  created_at       timestamptz not null default now(),
  check (vigencia_fin > vigencia_inicio)
);
create index if not exists sanitemplo_cta_space_idx on sanitemplo_cta (space_id, vigencia_inicio, vigencia_fin);

-- ════════════════════════════════════════════════════════════════
-- LEDGERS · APPEND-ONLY. Sin UPDATE, sin DELETE. Nunca.
-- ════════════════════════════════════════════════════════════════

create table if not exists sanitemplo_visits (
  id         bigserial primary key,
  unit_id    uuid not null references sanitemplo_units(id),
  ts         timestamptz not null default now(),
  tipo       sanitemplo_visit_tipo not null,
  order_id   uuid references sanitemplo_orders(id),
  monto_mxn  numeric(8,2) not null default 11,   -- el precio de la visita no se negocia
  metodo     text
);
create index if not exists sanitemplo_visits_unit_ts_idx on sanitemplo_visits (unit_id, ts desc);
create index if not exists sanitemplo_visits_order_idx on sanitemplo_visits (order_id);

create table if not exists sanitemplo_scans (
  id          bigserial primary key,
  space_id    uuid not null references sanitemplo_spaces(id),
  fbid        uuid references flowbond_users(id),
  ts          timestamptz not null default now(),
  geom        geography(Point,4326),
  campana_id  uuid references sanitemplo_cta(id)
);
create index if not exists sanitemplo_scans_space_ts_idx on sanitemplo_scans (space_id, ts desc);

create table if not exists sanitemplo_impact_ledger (
  id              bigserial primary key,
  unit_id         uuid not null references sanitemplo_units(id),
  periodo         date not null,
  visitas         int not null,
  litros_evitados numeric(12,2) not null,
  kg_composta     numeric(12,2) not null,
  metodo_calculo  text not null,
  firma           text,
  merkle_root     text,       -- lo único que iría onchain en v1
  ts              timestamptz not null default now(),
  unique (unit_id, periodo)
);

create table if not exists sanitemplo_fund_ledger (
  id         bigserial primary key,
  order_id   uuid not null references sanitemplo_orders(id),
  monto_mxn  numeric(12,2) not null,
  base       sanitemplo_fund_base not null,
  pct        numeric(5,4) not null,
  status     sanitemplo_fund_status not null default 'devengado',
  tx_ref     text,
  ts         timestamptz not null default now()
);
create index if not exists sanitemplo_fund_order_idx on sanitemplo_fund_ledger (order_id);

create table if not exists sanitemplo_fund_votes (
  id           bigserial primary key,
  propuesta_id uuid not null,
  fbid         uuid not null references flowbond_users(id),
  peso         numeric(10,4) not null,   -- TODO_CONFIRM: cómo se calcula
  voto         text not null,
  ronda        int not null default 1,
  ts           timestamptz not null default now(),
  unique (propuesta_id, fbid, ronda)
);

create table if not exists sanitemplo_settlements (
  id            bigserial primary key,
  periodo       date not null,
  node_id       uuid references sanitemplo_nodes(id),
  bruto         numeric(12,2) not null,
  fondo_33      numeric(12,2) not null,
  brandmark_12  numeric(12,2) not null,
  flowbond_8    numeric(12,2) not null,
  costo_directo numeric(12,2) not null,
  neto_nodo     numeric(12,2) not null default 0,   -- TODO_CONFIRM split_local_pct
  neto          numeric(12,2) not null,
  status        text not null default 'abierto',
  ts            timestamptz not null default now(),
  unique (periodo, node_id)
);

-- Guardia de append-only. Que la base de datos lo impida, no la buena voluntad.
create or replace function sanitemplo_block_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'Ledger append-only: % no acepta % ', TG_TABLE_NAME, TG_OP;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'sanitemplo_visits','sanitemplo_scans','sanitemplo_impact_ledger',
    'sanitemplo_fund_ledger','sanitemplo_fund_votes'
  ] loop
    execute format('drop trigger if exists %I_append_only on %I', t, t);
    execute format(
      'create trigger %I_append_only before update or delete on %I
       for each row execute function sanitemplo_block_mutation()', t, t);
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════
-- RLS · todo cerrado por defecto
-- ════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'sanitemplo_nodes','sanitemplo_units','sanitemplo_spaces','sanitemplo_sponsors',
    'sanitemplo_orders','sanitemplo_allocations','sanitemplo_cta','sanitemplo_visits',
    'sanitemplo_scans','sanitemplo_impact_ledger','sanitemplo_fund_ledger',
    'sanitemplo_fund_votes','sanitemplo_settlements'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Público lee lo que es público: nodos abiertos y el ledger del fondo.
-- El fondo se lee sin login a propósito: eso es lo que hace creíble el voto.
drop policy if exists sanitemplo_nodes_public_read on sanitemplo_nodes;
create policy sanitemplo_nodes_public_read on sanitemplo_nodes
  for select using (status in ('abierto','apertura'));

drop policy if exists sanitemplo_fund_public_read on sanitemplo_fund_ledger;
create policy sanitemplo_fund_public_read on sanitemplo_fund_ledger
  for select using (true);

drop policy if exists sanitemplo_impact_public_read on sanitemplo_impact_ledger;
create policy sanitemplo_impact_public_read on sanitemplo_impact_ledger
  for select using (true);

-- El patrocinador ve lo suyo y nada más.
drop policy if exists sanitemplo_orders_own on sanitemplo_orders;
create policy sanitemplo_orders_own on sanitemplo_orders
  for select using (
    sponsor_id in (select id from sanitemplo_sponsors where fbid = auth.uid())
  );

drop policy if exists sanitemplo_sponsors_own on sanitemplo_sponsors;
create policy sanitemplo_sponsors_own on sanitemplo_sponsors
  for select using (fbid = auth.uid());

-- Ninguna política de INSERT/UPDATE/DELETE para el cliente. A propósito.
-- Todo entra por RPC.

-- ════════════════════════════════════════════════════════════════
-- RPCs · SECURITY DEFINER
-- ════════════════════════════════════════════════════════════════

-- Guardia de claims. Espejo de LEGAL.forbiddenClaims en config.ts.
create or replace function sanitemplo_check_claim(p_text text)
returns table (ok boolean, hits text[])
language plpgsql immutable as $$
declare
  banned text[] := array[
    'carbono neutral','carbon neutral','carbono-neutral','compensado','compensada',
    'offset','huella cero','cero emisiones','net zero','climáticamente neutral'
  ];
  found text[] := '{}';
  w text;
begin
  foreach w in array banned loop
    if position(w in lower(p_text)) > 0 then found := found || w; end if;
  end loop;
  return query select (array_length(found,1) is null), found;
end $$;

create or replace function sanitemplo_submit_lead(
  p_email text, p_nombre text, p_razon_social text, p_riel sanitemplo_riel,
  p_visitas int, p_templos int, p_plazo_id text, p_space_tipos text[],
  p_node_ids uuid[], p_mensaje text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_claim record;
begin
  if p_mensaje is not null then
    select * into v_claim from sanitemplo_check_claim(p_mensaje);
    if not v_claim.ok then
      raise exception 'Este mensaje incluye una claim que este patrocinio no sustenta: %. La responsabilidad recae en el patrocinador.', array_to_string(v_claim.hits, ', ');
    end if;
  end if;

  insert into sanitemplo_leads(email, nombre, razon_social, riel, visitas, templos,
                               plazo_id, space_tipos, node_ids, mensaje)
  values (p_email, p_nombre, p_razon_social, p_riel, p_visitas, p_templos,
          p_plazo_id, p_space_tipos, p_node_ids, p_mensaje)
  returning id into v_id;
  return v_id;
end $$;

create table if not exists sanitemplo_leads (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  nombre       text,
  razon_social text,
  riel         sanitemplo_riel not null,
  visitas      int,
  templos      int,
  plazo_id     text,
  space_tipos  text[],
  node_ids     uuid[],
  mensaje      text,
  fbid         uuid references flowbond_users(id),
  created_at   timestamptz not null default now()
);
alter table sanitemplo_leads enable row level security;

create or replace function sanitemplo_log_visit(
  p_unit_id uuid, p_tipo sanitemplo_visit_tipo, p_order_id uuid default null,
  p_metodo text default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_monto numeric := 11;
begin
  if p_tipo = 'cortesia' then v_monto := 0; end if;
  insert into sanitemplo_visits(unit_id, tipo, order_id, monto_mxn, metodo)
  values (p_unit_id, p_tipo, p_order_id, v_monto, p_metodo)
  returning id into v_id;
  return v_id;
end $$;

create or replace function sanitemplo_fund_accrue(p_order_id uuid, p_base sanitemplo_fund_base)
returns numeric
language plpgsql security definer set search_path = public as $$
declare o record; v_base numeric; v_monto numeric;
begin
  select * into o from sanitemplo_orders where id = p_order_id;
  if not found then raise exception 'Orden % no existe', p_order_id; end if;

  v_base := case p_base
    when 'gross'       then o.subtotal
    when 'sponsorship' then o.presencia_subtotal
    when 'margin'      then greatest(0, o.subtotal * 0.4)  -- placeholder: settle real vive en el Worker
  end;

  v_monto := v_base * 0.33;
  insert into sanitemplo_fund_ledger(order_id, monto_mxn, base, pct)
  values (p_order_id, v_monto, p_base, 0.33);
  return v_monto;
end $$;

create or replace function sanitemplo_allocate(
  p_order_id uuid, p_node_id uuid, p_visitas int, p_inicio date, p_fin date
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_status sanitemplo_node_status; v_pend int;
begin
  select status into v_status from sanitemplo_nodes where id = p_node_id;
  if v_status is distinct from 'abierto' then
    raise exception 'El nodo no está abierto. Solo se asigna a nodos abiertos.';
  end if;

  select o.visitas - coalesce(sum(a.visitas_asignadas),0) into v_pend
  from sanitemplo_orders o
  left join sanitemplo_allocations a on a.order_id = o.id
  where o.id = p_order_id group by o.visitas;

  if p_visitas > v_pend then
    raise exception 'Quedan % visitas por asignar y pediste %.', v_pend, p_visitas;
  end if;

  insert into sanitemplo_allocations(order_id, node_id, visitas_asignadas, fecha_inicio, fecha_fin)
  values (p_order_id, p_node_id, p_visitas, p_inicio, p_fin) returning id into v_id;

  update sanitemplo_orders set status = 'asignada' where id = p_order_id;
  return v_id;
end $$;

-- Vista pública del fondo. Sin login. Ese es el punto.
create or replace view sanitemplo_fund_public as
select date_trunc('month', ts)::date as periodo,
       base, sum(monto_mxn) as monto, count(*) as ordenes,
       sum(monto_mxn) filter (where status='transferido') as transferido
from sanitemplo_fund_ledger group by 1,2 order by 1 desc;

grant select on sanitemplo_fund_public to anon, authenticated;
grant execute on function sanitemplo_submit_lead to anon, authenticated;
grant execute on function sanitemplo_check_claim to anon, authenticated;

-- ════════════════════════════════════════════════════════════════
-- REGISTRO EN FBID
-- ════════════════════════════════════════════════════════════════
-- NOTA (corrección 2026-07-24): flowbond_app_connections NO es un catálogo
-- de apps — es el ledger de activación POR USUARIO (user_id, app_slug, status,
-- first_activated_at...). No existe una fila estática que registrar. La app
-- 'sanitemplo' se conecta por-usuario vía el SDK (linkAuthOrCreateIdentity /
-- activate_app) en el login, igual que reciprociudad. Por eso se eliminó el
-- INSERT original del kit (asumía columnas app_name/entry_point/notes y un
-- on conflict (app_slug) que este esquema no tiene).
--   Riel A = publicidad vía BrandMark. Riel B = donativo vía A.C.
--   (pendiente verificar donataria autorizada — LEGAL.acDonataria.verified).
