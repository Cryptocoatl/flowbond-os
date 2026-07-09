-- =====================================================================
-- VOCES PARA EL ALMA · Voices for the Soul
-- Migración 0001 — esquema base (Layer 0 / FlowBond Pattern A)
-- Proyecto canónico: fgsrcxxccdjqyrpkitmk (us-east-2, FlowBond-life)
-- NUNCA usar eoajujwpdkfuicnoxetk.
--
-- Patrón FlowBond:
--   · Todas las tablas con prefijo app_vpa_
--   · Raíz de identidad: public.flowbond_users(id) (FBID)
--   · RLS ON en cada tabla; toda escritura pasa por RPC SECURITY DEFINER
--   · Lecturas públicas vía vistas sin PII
--   · app_vpa_audit append-only
--
-- Alcance extendido (decisiones de producto):
--   · Retiros = taller extendido (ends_at, location, is_retreat)
--   · Tienda multi-vendor: productos/servicios propiedad de especialistas
--   · Servicios holísticos agendables y de pago (app_vpa_services)
--   · Curaduría: lo que sube un especialista nace 'pending' -> super_admin publica
--   · Cross-listing de red: bandera network_shareable (FlowShare)
--   · Gancho de suscripción: app_vpa_members.subscription_status
-- =====================================================================

-- ============ ENUMS ============
do $$ begin create type vpa_role        as enum ('visitor','specialist','super_admin'); exception when duplicate_object then null; end $$;
do $$ begin create type vpa_modality    as enum ('presencial','online','hibrido');      exception when duplicate_object then null; end $$;
do $$ begin create type vpa_spec_status as enum ('pending','verified','published','hidden'); exception when duplicate_object then null; end $$;
do $$ begin create type vpa_pub_status  as enum ('draft','pending','published','hidden'); exception when duplicate_object then null; end $$;
do $$ begin create type vpa_order_kind  as enum ('workshop','product','service');        exception when duplicate_object then null; end $$;
do $$ begin create type vpa_order_status as enum ('created','paid','fulfilled','refunded','failed'); exception when duplicate_object then null; end $$;
do $$ begin create type vpa_inquiry_kind as enum ('general','specialist_application');    exception when duplicate_object then null; end $$;

-- ============ MEMBERS (vínculo de rol con FBID) ============
create table if not exists app_vpa_members (
  id                  uuid primary key default gen_random_uuid(),
  fbid_user           uuid not null references public.flowbond_users(id) on delete cascade,
  role                vpa_role not null default 'visitor',
  locale              text not null default 'es' check (locale in ('es','en')),
  subscription_status text not null default 'none', -- gancho de membresía (none|active|past_due|canceled)
  created_at          timestamptz not null default now(),
  unique (fbid_user)
);

-- ============ CATEGORIES ============
create table if not exists app_vpa_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  icon        text not null,            -- contenido SVG inline (paths)
  name_es     text not null, name_en text not null,
  desc_es     text, desc_en text,
  sort_order  int not null default 0,
  status      vpa_pub_status not null default 'published'
);

-- ============ SPECIALISTS ============
create table if not exists app_vpa_specialists (
  id            uuid primary key default gen_random_uuid(),
  fbid_user     uuid references public.flowbond_users(id) on delete set null, -- dueño (panel)
  category_id   uuid not null references app_vpa_categories(id),
  name          text not null,
  role_es       text, role_en text,
  bio_es        text, bio_en text,
  focus_es      text[] default '{}', focus_en text[] default '{}',
  certs_es      text, certs_en text,
  photo_url     text,
  langs         text[] not null default '{es}',
  modalities    vpa_modality[] not null default '{online}',
  available_now boolean not null default true,
  -- contacto (sólo se libera vía RPC autenticada y registrada)
  contact_email text, contact_phone text, contact_web text, contact_socials jsonb default '{}'::jsonb,
  status        vpa_spec_status not null default 'pending',
  verified_at   timestamptz, verified_by uuid references public.flowbond_users(id),
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============ WORKSHOPS (talleres + retiros = taller extendido) ============
create table if not exists app_vpa_workshops (
  id            uuid primary key default gen_random_uuid(),
  specialist_id uuid references app_vpa_specialists(id) on delete set null,
  title_es      text not null, title_en text not null,
  desc_es       text, desc_en text,
  starts_at     timestamptz not null,
  ends_at       timestamptz,                    -- retiros multi-día
  location      text,                           -- sede (presencial / híbrido / retiro)
  is_retreat    boolean not null default false, -- distingue retiro de taller
  modality      vpa_modality not null,
  price_cents   int not null check (price_cents >= 0),
  currency      text not null default 'MXN',
  capacity      int, seats_taken int not null default 0,
  cover_url     text,
  status        vpa_pub_status not null default 'published',
  created_at    timestamptz not null default now()
);

-- ============ PRODUCTS (tienda digital, multi-vendor) ============
create table if not exists app_vpa_products (
  id                uuid primary key default gen_random_uuid(),
  specialist_id     uuid references app_vpa_specialists(id) on delete set null, -- null = de plataforma
  title_es          text not null, title_en text not null,
  desc_es           text, desc_en text,
  type_es           text, type_en text,           -- Ebook / Audio / Curso / Guía
  price_cents       int not null check (price_cents >= 0),
  currency          text not null default 'MXN',
  cover_url         text,
  asset_path        text,                          -- ruta privada; URL firmada al entregar
  network_shareable boolean not null default false,-- cross-listing FlowShare en la red
  status            vpa_pub_status not null default 'published',
  created_at        timestamptz not null default now()
);

-- ============ SERVICES (servicios holísticos agendables, de pago) ============
create table if not exists app_vpa_services (
  id                uuid primary key default gen_random_uuid(),
  specialist_id     uuid not null references app_vpa_specialists(id) on delete cascade,
  title_es          text not null, title_en text not null,
  desc_es           text, desc_en text,
  duration_min      int,                            -- duración de sesión
  modality          vpa_modality not null default 'online',
  price_cents       int not null check (price_cents >= 0),
  currency          text not null default 'MXN',
  cover_url         text,
  network_shareable boolean not null default false,
  status            vpa_pub_status not null default 'pending', -- curaduría
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);

-- ============ ORDERS (ledger append-only) ============
create table if not exists app_vpa_orders (
  id              uuid primary key default gen_random_uuid(),
  buyer_fbid      uuid references public.flowbond_users(id),
  buyer_email     text not null,
  kind            vpa_order_kind not null,
  ref_id          uuid not null,               -- workshop_id | product_id | service_id
  amount_cents    int not null,
  currency        text not null default 'MXN',
  flowshare_ref   text,
  stripe_session  text,
  status          vpa_order_status not null default 'created',
  fulfilled_at    timestamptz,
  created_at      timestamptz not null default now()
);
do $$ begin
  create rule app_vpa_orders_no_delete as on delete to app_vpa_orders do instead nothing;
exception when duplicate_object then null; end $$;

-- ============ TESTIMONIALS ============
create table if not exists app_vpa_testimonials (
  id          uuid primary key default gen_random_uuid(),
  quote_es    text not null, quote_en text not null,
  author      text not null,
  loc_es      text, loc_en text,
  avatar_url  text,
  sort_order  int not null default 0,
  status      vpa_pub_status not null default 'published'
);

-- ============ INQUIRIES (contacto + postulación de especialistas) ============
create table if not exists app_vpa_inquiries (
  id          uuid primary key default gen_random_uuid(),
  kind        vpa_inquiry_kind not null default 'general',
  name        text not null, email text not null,
  discipline  text, message text not null,
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============ SETTINGS (copy editable de inicio / redes) ============
create table if not exists app_vpa_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ============ AUDIT (append-only) ============
create table if not exists app_vpa_audit (
  id          bigint generated always as identity primary key,
  actor_fbid  uuid,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  diff        jsonb,
  at          timestamptz not null default now()
);
do $$ begin
  create rule app_vpa_audit_no_update as on update to app_vpa_audit do instead nothing;
exception when duplicate_object then null; end $$;
do $$ begin
  create rule app_vpa_audit_no_delete as on delete to app_vpa_audit do instead nothing;
exception when duplicate_object then null; end $$;

-- ============ INDEXES ============
create index if not exists app_vpa_specialists_cat_status_idx on app_vpa_specialists (category_id, status);
create index if not exists app_vpa_specialists_owner_idx      on app_vpa_specialists (fbid_user);
create index if not exists app_vpa_workshops_when_status_idx  on app_vpa_workshops (starts_at, status);
create index if not exists app_vpa_workshops_spec_idx         on app_vpa_workshops (specialist_id);
create index if not exists app_vpa_products_spec_status_idx   on app_vpa_products (specialist_id, status);
create index if not exists app_vpa_services_spec_status_idx   on app_vpa_services (specialist_id, status);
create index if not exists app_vpa_orders_buyer_status_idx    on app_vpa_orders (buyer_fbid, status);

-- ============ VISTAS PÚBLICAS (sin PII) ============
create or replace view app_vpa_specialists_public as
  select id, category_id, name, role_es, role_en, bio_es, bio_en,
         focus_es, focus_en, certs_es, certs_en, photo_url, langs, modalities,
         available_now, sort_order
  from app_vpa_specialists
  where status = 'published';   -- SIN columnas contact_*

create or replace view app_vpa_categories_public as
  select id, slug, icon, name_es, name_en, desc_es, desc_en, sort_order
  from app_vpa_categories where status = 'published';

create or replace view app_vpa_workshops_public as
  select w.id, w.specialist_id, w.title_es, w.title_en, w.desc_es, w.desc_en,
         w.starts_at, w.ends_at, w.location, w.is_retreat, w.modality,
         w.price_cents, w.currency, w.capacity, w.seats_taken, w.cover_url,
         s.name as specialist_name
  from app_vpa_workshops w
  left join app_vpa_specialists s on s.id = w.specialist_id
  where w.status = 'published';

create or replace view app_vpa_products_public as
  select p.id, p.specialist_id, p.title_es, p.title_en, p.desc_es, p.desc_en,
         p.type_es, p.type_en, p.price_cents, p.currency, p.cover_url,
         p.network_shareable, s.name as specialist_name
  from app_vpa_products p
  left join app_vpa_specialists s on s.id = p.specialist_id
  where p.status = 'published';

create or replace view app_vpa_services_public as
  select sv.id, sv.specialist_id, sv.title_es, sv.title_en, sv.desc_es, sv.desc_en,
         sv.duration_min, sv.modality, sv.price_cents, sv.currency, sv.cover_url,
         sv.network_shareable, sv.sort_order, s.name as specialist_name
  from app_vpa_services sv
  join app_vpa_specialists s on s.id = sv.specialist_id
  where sv.status = 'published';

create or replace view app_vpa_testimonials_public as
  select id, quote_es, quote_en, author, loc_es, loc_en, avatar_url, sort_order
  from app_vpa_testimonials where status = 'published';

create or replace view app_vpa_settings_public as
  select key, value from app_vpa_settings;  -- settings sólo contienen copy público

grant select on app_vpa_specialists_public, app_vpa_categories_public,
  app_vpa_workshops_public, app_vpa_products_public, app_vpa_services_public,
  app_vpa_testimonials_public, app_vpa_settings_public to anon, authenticated;
