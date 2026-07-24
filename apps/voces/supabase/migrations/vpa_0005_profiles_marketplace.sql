-- =====================================================================
-- VOCES PARA EL ALMA — Migración 0005 — perfiles self-serve + ofertas
-- · app_vpa_applications: cuestionario público de creación de perfil
--   (sin login — mismo patrón que vpa_submit_inquiry; el correo del
--   proyecto no tiene SMTP propio, no dependemos de magic links)
-- · app_vpa_offerings: catálogo unificado de lo que ofrece cada voz
--   (libros, ebooks, audiolibros, coaching, sesiones, retiros, charlas)
--   con enlace externo (Amazon etc.), bandera "vender vía Voces" y
--   bandera "obra en proceso / quiere apoyo para terminarla"
-- · bucket vpa-photos: subida de foto real (anon sólo applications/)
-- · vpa_review_application: aprobar → crea especialista + ofertas,
--   con posición (sort_order) elegida por la admin
-- =====================================================================

-- ============ ENUM ============
do $$ begin create type vpa_offering_type as enum
  ('libro','ebook','audiolibro','curso','coaching','sesion_individual','sesion_grupal','retiro','conferencia','otro');
exception when duplicate_object then null; end $$;

-- ============ OFFERINGS ============
create table if not exists app_vpa_offerings (
  id             uuid primary key default gen_random_uuid(),
  specialist_id  uuid not null references app_vpa_specialists(id) on delete cascade,
  kind           vpa_offering_type not null default 'otro',
  title          text not null,
  description    text,
  price_cents    int check (price_cents >= 0),      -- null = precio a convenir
  currency       text not null default 'MXN',
  external_url   text,                              -- Amazon / tienda externa
  sell_via_voces boolean not null default false,    -- quiere venderlo vía Voces
  in_progress    boolean not null default false,    -- obra a medio camino
  wants_help     boolean not null default false,    -- pide apoyo de Voces para terminar (privado)
  cover_url      text,
  status         vpa_pub_status not null default 'pending',
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists app_vpa_offerings_spec_status_idx on app_vpa_offerings (specialist_id, status);

alter table app_vpa_offerings enable row level security;
create policy vpa_offerings_sel on app_vpa_offerings for select
  using (vpa_role_of(auth.uid()) = 'super_admin'
    or exists (select 1 from app_vpa_specialists s where s.id = specialist_id and s.fbid_user = auth.uid()));

-- vista pública (sin wants_help — eso es entre la voz y la plataforma)
create or replace view app_vpa_offerings_public as
  select o.id, o.specialist_id, o.kind, o.title, o.description, o.price_cents, o.currency,
         o.external_url, o.sell_via_voces, o.in_progress, o.cover_url, o.sort_order,
         s.name as specialist_name
  from app_vpa_offerings o
  join app_vpa_specialists s on s.id = o.specialist_id
  where o.status = 'published' and s.status = 'published';
grant select on app_vpa_offerings_public to anon, authenticated;

-- ============ APPLICATIONS (cuestionario público) ============
create table if not exists app_vpa_applications (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null,
  phone          text,
  category_id    uuid references app_vpa_categories(id),
  headline       text,                    -- rol / título profesional
  what_do        text,                    -- ¿qué haces?
  mission        text,                    -- tu misión
  website        text,
  socials        jsonb not null default '{}'::jsonb,
  certifications text,
  langs          text[] not null default '{es}',
  modalities     vpa_modality[] not null default '{online}',
  photo_path     text,                    -- ruta en bucket vpa-photos
  offerings      jsonb not null default '[]'::jsonb,  -- respuestas crudas del cuestionario
  locale         text not null default 'es' check (locale in ('es','en')),
  status         text not null default 'new' check (status in ('new','in_review','approved','rejected')),
  admin_notes    text,
  specialist_id  uuid references app_vpa_specialists(id),
  reviewed_by    uuid references public.flowbond_users(id),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists app_vpa_applications_status_idx on app_vpa_applications (status, created_at desc);

alter table app_vpa_applications enable row level security;
create policy vpa_applications_sel on app_vpa_applications for select
  using (vpa_role_of(auth.uid()) = 'super_admin');

-- ============ STORAGE: bucket vpa-photos ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vpa-photos','vpa-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- anon sólo puede SUBIR (no listar, no borrar, no sobreescribir) y sólo a applications/
do $$ begin
  create policy vpa_photos_public_upload on storage.objects for insert to anon, authenticated
    with check (
      bucket_id = 'vpa-photos'
      and (storage.foldername(name))[1] = 'applications'
      and storage.extension(name) in ('jpg','jpeg','png','webp')
    );
exception when duplicate_object then null; end $$;

-- ============ RPC: envío público del cuestionario ============
create or replace function vpa_submit_application(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_recent int; v_total int;
  v_email text := lower(trim(payload->>'email'));
  v_name  text := trim(payload->>'name');
  v_off jsonb := '[]'::jsonb; o jsonb;
begin
  if v_name is null or length(v_name) < 2 or length(v_name) > 120 then raise exception 'invalid name'; end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then raise exception 'invalid email'; end if;
  if coalesce(trim(payload->>'what_do'),'') = '' then raise exception 'what_do required'; end if;

  -- rate limit: por correo y global (anti-spam, endpoint anónimo)
  select count(*) into v_recent from app_vpa_applications
   where email = v_email and created_at > now() - interval '10 minutes';
  if v_recent >= 2 then raise exception 'rate limited'; end if;
  select count(*) into v_total from app_vpa_applications where created_at > now() - interval '1 hour';
  if v_total >= 30 then raise exception 'rate limited'; end if;

  if coalesce(payload->>'photo_path','') <> ''
     and payload->>'photo_path' !~ '^applications/[A-Za-z0-9._-]{1,120}$' then
    raise exception 'invalid photo path';
  end if;

  -- sanitiza ofertas: sólo llaves conocidas, longitudes acotadas, máx 20
  if jsonb_typeof(payload->'offerings') = 'array' then
    for o in select * from jsonb_array_elements(payload->'offerings') limit 20 loop
      if coalesce(trim(o->>'title'),'') <> '' then
        v_off := v_off || jsonb_build_array(jsonb_build_object(
          'kind',           left(coalesce(o->>'kind','otro'), 30),
          'title',          left(trim(o->>'title'), 200),
          'description',    left(coalesce(o->>'description',''), 2000),
          'price_mxn',      case when (o->>'price_mxn') ~ '^[0-9]{1,7}(\.[0-9]{1,2})?$' then o->>'price_mxn' else null end,
          'external_url',   left(coalesce(o->>'external_url',''), 500),
          'sell_via_voces', coalesce((o->>'sell_via_voces')::boolean, false),
          'in_progress',    coalesce((o->>'in_progress')::boolean, false),
          'wants_help',     coalesce((o->>'wants_help')::boolean, false)));
      end if;
    end loop;
  end if;

  insert into app_vpa_applications
    (name, email, phone, category_id, headline, what_do, mission, website, socials,
     certifications, langs, modalities, photo_path, offerings, locale)
  values
    (v_name, v_email, left(payload->>'phone', 40),
     nullif(payload->>'category_id','')::uuid,
     left(payload->>'headline', 160),
     left(payload->>'what_do', 4000),
     left(payload->>'mission', 4000),
     left(payload->>'website', 300),
     case when jsonb_typeof(payload->'socials') = 'object' then payload->'socials' else '{}'::jsonb end,
     left(payload->>'certifications', 2000),
     coalesce((select array_agg(x) from (select left(value,5) as x from jsonb_array_elements_text(payload->'langs') limit 4) t), '{es}'),
     coalesce((select array_agg(value::vpa_modality) from jsonb_array_elements_text(payload->'modalities')), '{online}'),
     nullif(payload->>'photo_path',''),
     v_off,
     case when payload->>'locale' = 'en' then 'en' else 'es' end)
  returning id into v_id;
  return v_id;
end; $$;

-- ============ RPC: revisión (admin) — aprobar crea perfil + ofertas ============
create or replace function vpa_review_application(
  p_id uuid, p_approve boolean,
  p_category_id uuid default null, p_sort_order int default null, p_notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a app_vpa_applications; v_spec uuid; v_cat uuid;
  o jsonb; v_kind vpa_offering_type; v_price int; v_bio text; v_photo text;
begin
  perform vpa_require(auth.uid(),'super_admin');
  select * into a from app_vpa_applications where id = p_id;
  if a.id is null then raise exception 'not found'; end if;
  if a.status = 'approved' then raise exception 'already approved'; end if;

  if not p_approve then
    update app_vpa_applications
       set status = 'rejected', admin_notes = coalesce(p_notes, admin_notes),
           reviewed_by = auth.uid(), reviewed_at = now()
     where id = p_id;
    perform vpa__audit('reject_application','application',p_id, jsonb_build_object('notes',p_notes));
    return null;
  end if;

  v_cat := coalesce(p_category_id, a.category_id);
  if v_cat is null then raise exception 'category required'; end if;

  v_bio := trim(both e'\n' from coalesce(a.what_do,'')
           || case when coalesce(a.mission,'') <> '' then e'\n\n' || a.mission else '' end);
  v_photo := case when a.photo_path is not null
    then 'https://fgsrcxxccdjqyrpkitmk.supabase.co/storage/v1/object/public/vpa-photos/' || a.photo_path
    else null end;

  insert into app_vpa_specialists
    (category_id, name, role_es, role_en, bio_es, bio_en, certs_es, certs_en, photo_url,
     langs, modalities, contact_email, contact_phone, contact_web, contact_socials,
     status, sort_order, verified_at, verified_by)
  values
    (v_cat, a.name, a.headline, a.headline, v_bio, v_bio, a.certifications, a.certifications, v_photo,
     a.langs, a.modalities, a.email, a.phone, a.website, coalesce(a.socials,'{}'::jsonb),
     'published', coalesce(p_sort_order, 999), now(), auth.uid())
  returning id into v_spec;

  for o in select * from jsonb_array_elements(coalesce(a.offerings,'[]'::jsonb)) loop
    if coalesce(o->>'title','') <> '' then
      begin v_kind := (o->>'kind')::vpa_offering_type; exception when others then v_kind := 'otro'; end;
      v_price := case when (o->>'price_mxn') ~ '^[0-9]+(\.[0-9]+)?$'
                 then round((o->>'price_mxn')::numeric * 100)::int else null end;
      insert into app_vpa_offerings
        (specialist_id, kind, title, description, price_cents, external_url,
         sell_via_voces, in_progress, wants_help, status)
      values
        (v_spec, v_kind, o->>'title', nullif(o->>'description',''), v_price, nullif(o->>'external_url',''),
         coalesce((o->>'sell_via_voces')::boolean,false), coalesce((o->>'in_progress')::boolean,false),
         coalesce((o->>'wants_help')::boolean,false), 'published');
    end if;
  end loop;

  update app_vpa_applications
     set status = 'approved', specialist_id = v_spec, admin_notes = coalesce(p_notes, admin_notes),
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_id;
  perform vpa__audit('approve_application','specialist',v_spec, jsonb_build_object('application',p_id));
  return v_spec;
end; $$;

-- ============ RPC: upsert de oferta (admin o especialista dueño) ============
create or replace function vpa_upsert_offering(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_role vpa_role := vpa_role_of(auth.uid());
        v_id uuid := nullif(payload->>'id','')::uuid; v_spec uuid := nullif(payload->>'specialist_id','')::uuid;
begin
  if v_role not in ('specialist','super_admin') then raise exception 'forbidden'; end if;
  if v_role = 'specialist' then
    select id into v_spec from app_vpa_specialists where fbid_user = v_uid limit 1;
    if v_spec is null then raise exception 'no specialist profile'; end if;
  end if;
  if v_id is not null and v_role = 'specialist'
     and not exists (select 1 from app_vpa_offerings where id=v_id and specialist_id=v_spec) then raise exception 'forbidden'; end if;

  if v_id is null then
    if v_spec is null then raise exception 'specialist required'; end if;
    insert into app_vpa_offerings (specialist_id, kind, title, description, price_cents, currency,
      external_url, sell_via_voces, in_progress, wants_help, cover_url, status, sort_order)
    values (v_spec, coalesce(nullif(payload->>'kind','')::vpa_offering_type,'otro'), payload->>'title',
      payload->>'description', nullif(payload->>'price_cents','')::int, coalesce(payload->>'currency','MXN'),
      payload->>'external_url', coalesce((payload->>'sell_via_voces')::boolean,false),
      coalesce((payload->>'in_progress')::boolean,false), coalesce((payload->>'wants_help')::boolean,false),
      payload->>'cover_url',
      case when v_role='super_admin' then coalesce((payload->>'status')::vpa_pub_status,'published') else 'pending' end,
      coalesce((payload->>'sort_order')::int,0))
    returning id into v_id;
  else
    update app_vpa_offerings set
      specialist_id = coalesce(v_spec, specialist_id),
      kind = coalesce(nullif(payload->>'kind','')::vpa_offering_type, kind),
      title = coalesce(payload->>'title', title),
      description = payload->>'description',
      price_cents = nullif(payload->>'price_cents','')::int,
      currency = coalesce(payload->>'currency', currency),
      external_url = payload->>'external_url',
      sell_via_voces = coalesce((payload->>'sell_via_voces')::boolean, sell_via_voces),
      in_progress = coalesce((payload->>'in_progress')::boolean, in_progress),
      wants_help = coalesce((payload->>'wants_help')::boolean, wants_help),
      cover_url = payload->>'cover_url',
      status = case when v_role='super_admin' and payload ? 'status' then (payload->>'status')::vpa_pub_status else status end,
      sort_order = coalesce((payload->>'sort_order')::int, sort_order)
    where id = v_id;
  end if;
  perform vpa__audit('upsert','offering',v_id,payload);
  return v_id;
end; $$;

-- ============ vpa_set_status + vpa_reorder ahora conocen 'offering' ============
create or replace function vpa_set_status(p_entity text, p_id uuid, p_status vpa_pub_status)
returns void language plpgsql security definer set search_path = public as $$
declare v_tbl text;
begin
  perform vpa_require(auth.uid(),'super_admin');
  v_tbl := case p_entity
    when 'category' then 'app_vpa_categories' when 'workshop' then 'app_vpa_workshops'
    when 'product' then 'app_vpa_products' when 'service' then 'app_vpa_services'
    when 'testimonial' then 'app_vpa_testimonials' when 'offering' then 'app_vpa_offerings' else null end;
  if v_tbl is null then raise exception 'bad entity'; end if;
  execute format('update %I set status=$1 where id=$2', v_tbl) using p_status, p_id;
  perform vpa__audit('set_status',p_entity,p_id, jsonb_build_object('status',p_status));
end; $$;

create or replace function vpa_reorder(p_entity text, p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare v_tbl text; i int;
begin
  perform vpa_require(auth.uid(),'super_admin');
  v_tbl := case p_entity
    when 'category' then 'app_vpa_categories' when 'specialist' then 'app_vpa_specialists'
    when 'service' then 'app_vpa_services' when 'testimonial' then 'app_vpa_testimonials'
    when 'offering' then 'app_vpa_offerings' else null end;
  if v_tbl is null then raise exception 'bad entity'; end if;
  for i in 1 .. array_length(p_ids,1) loop
    execute format('update %I set sort_order=$1 where id=$2', v_tbl) using i, p_ids[i];
  end loop;
  perform vpa__audit('reorder',p_entity,null, to_jsonb(p_ids));
end; $$;

-- ============ Grants ============
grant execute on function vpa_submit_application(jsonb) to anon, authenticated;
grant execute on function vpa_review_application(uuid, boolean, uuid, int, text) to authenticated;
grant execute on function vpa_upsert_offering(jsonb) to authenticated;

-- (aplicado como vpa_0005b) defensa en profundidad: Postgres otorga EXECUTE a
-- PUBLIC por defecto en funciones nuevas — se revoca para los RPCs no públicos
revoke execute on function vpa_review_application(uuid, boolean, uuid, int, text) from public, anon;
revoke execute on function vpa_upsert_offering(jsonb) from public, anon;
