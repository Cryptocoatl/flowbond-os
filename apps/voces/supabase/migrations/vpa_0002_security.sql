-- =====================================================================
-- VOCES PARA EL ALMA — Migración 0002 — RLS + RPCs (SECURITY DEFINER)
-- RLS ON en todas las tablas. Lecturas públicas vía vistas (0001).
-- Toda escritura pasa por estas RPCs; el cliente nunca hace INSERT/UPDATE.
-- =====================================================================

-- ---------- Habilitar RLS ----------
alter table app_vpa_members      enable row level security;
alter table app_vpa_categories   enable row level security;
alter table app_vpa_specialists  enable row level security;
alter table app_vpa_workshops    enable row level security;
alter table app_vpa_products     enable row level security;
alter table app_vpa_services     enable row level security;
alter table app_vpa_orders       enable row level security;
alter table app_vpa_testimonials enable row level security;
alter table app_vpa_inquiries    enable row level security;
alter table app_vpa_settings     enable row level security;
alter table app_vpa_audit        enable row level security;

-- ---------- Helpers de rol ----------
create or replace function vpa_role_of(p_uid uuid) returns vpa_role
language sql stable security definer set search_path = public as $$
  select coalesce((select role from app_vpa_members where fbid_user = p_uid), 'visitor');
$$;

create or replace function vpa_require(p_uid uuid, p_min vpa_role) returns void
language plpgsql stable security definer set search_path = public as $$
declare r vpa_role := vpa_role_of(p_uid);
begin
  if p_uid is null then raise exception 'auth required'; end if;
  if p_min = 'super_admin' and r <> 'super_admin' then raise exception 'forbidden'; end if;
  if p_min = 'specialist' and r not in ('specialist','super_admin') then raise exception 'forbidden'; end if;
end; $$;

-- rol del usuario actual (para el cliente)
create or replace function vpa_my_role() returns vpa_role
language sql stable security definer set search_path = public as $$
  select vpa_role_of(auth.uid());
$$;

-- guardia de service_role para webhooks
create or replace function vpa__is_service() returns boolean
language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'service_role';
$$;

-- escribe una fila de auditoría (helper interno)
create or replace function vpa__audit(p_action text, p_entity text, p_id uuid, p_diff jsonb)
returns void language sql security definer set search_path = public as $$
  insert into app_vpa_audit(actor_fbid, action, entity, entity_id, diff)
  values (auth.uid(), p_action, p_entity, p_id, p_diff);
$$;

-- ---------- Políticas RLS (sólo SELECT; escrituras vía RPC) ----------
-- members
create policy vpa_members_sel on app_vpa_members for select
  using (fbid_user = auth.uid() or vpa_role_of(auth.uid()) = 'super_admin');
-- specialists (base con PII: sólo dueño o admin; público usa la vista)
create policy vpa_specialists_sel on app_vpa_specialists for select
  using (auth.uid() is not null and (vpa_role_of(auth.uid()) = 'super_admin' or fbid_user = auth.uid()));
-- categories (edición = admin; público usa la vista)
create policy vpa_categories_sel on app_vpa_categories for select
  using (vpa_role_of(auth.uid()) = 'super_admin');
-- workshops (admin o especialista dueño)
create policy vpa_workshops_sel on app_vpa_workshops for select
  using (vpa_role_of(auth.uid()) = 'super_admin'
    or exists (select 1 from app_vpa_specialists s where s.id = specialist_id and s.fbid_user = auth.uid()));
-- products
create policy vpa_products_sel on app_vpa_products for select
  using (vpa_role_of(auth.uid()) = 'super_admin'
    or exists (select 1 from app_vpa_specialists s where s.id = specialist_id and s.fbid_user = auth.uid()));
-- services
create policy vpa_services_sel on app_vpa_services for select
  using (vpa_role_of(auth.uid()) = 'super_admin'
    or exists (select 1 from app_vpa_specialists s where s.id = specialist_id and s.fbid_user = auth.uid()));
-- testimonials
create policy vpa_testimonials_sel on app_vpa_testimonials for select
  using (vpa_role_of(auth.uid()) = 'super_admin');
-- orders (comprador o admin)
create policy vpa_orders_sel on app_vpa_orders for select
  using (buyer_fbid = auth.uid() or vpa_role_of(auth.uid()) = 'super_admin');
-- inquiries (admin)
create policy vpa_inquiries_sel on app_vpa_inquiries for select
  using (vpa_role_of(auth.uid()) = 'super_admin');
-- settings (admin; público usa la vista)
create policy vpa_settings_sel on app_vpa_settings for select
  using (vpa_role_of(auth.uid()) = 'super_admin');
-- audit (admin)
create policy vpa_audit_sel on app_vpa_audit for select
  using (vpa_role_of(auth.uid()) = 'super_admin');

-- =====================================================================
-- RPCs
-- =====================================================================

-- Asegura la fila de miembro del usuario actual (al iniciar sesión). Idempotente.
create or replace function vpa_ensure_member(p_locale text default 'es')
returns vpa_role language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'auth required'; end if;
  insert into app_vpa_members (fbid_user, locale) values (v_uid, coalesce(p_locale,'es'))
  on conflict (fbid_user) do nothing;
  return vpa_role_of(v_uid);
end; $$;

-- Crea/edita perfil de especialista (bilingüe). Especialista edita el suyo; admin cualquiera.
create or replace function vpa_upsert_specialist(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid := nullif(payload->>'id','')::uuid; v_role vpa_role;
begin
  v_role := vpa_role_of(v_uid);
  if v_role not in ('specialist','super_admin') then raise exception 'forbidden'; end if;
  if v_id is not null and v_role <> 'super_admin' then
    if not exists (select 1 from app_vpa_specialists where id = v_id and fbid_user = v_uid) then
      raise exception 'forbidden'; end if;
  end if;

  if v_id is null then
    insert into app_vpa_specialists (
      fbid_user, category_id, name, role_es, role_en, bio_es, bio_en,
      focus_es, focus_en, certs_es, certs_en, photo_url, langs, modalities, available_now,
      contact_email, contact_phone, contact_web, contact_socials,
      status, sort_order)
    values (
      case when v_role = 'super_admin' then nullif(payload->>'fbid_user','')::uuid else v_uid end,
      (payload->>'category_id')::uuid, payload->>'name',
      payload->>'role_es', payload->>'role_en', payload->>'bio_es', payload->>'bio_en',
      coalesce((select array_agg(value) from jsonb_array_elements_text(payload->'focus_es')),'{}'),
      coalesce((select array_agg(value) from jsonb_array_elements_text(payload->'focus_en')),'{}'),
      payload->>'certs_es', payload->>'certs_en', payload->>'photo_url',
      coalesce((select array_agg(value) from jsonb_array_elements_text(payload->'langs')),'{es}'),
      coalesce((select array_agg(value::vpa_modality) from jsonb_array_elements_text(payload->'modalities')),'{online}'),
      coalesce((payload->>'available_now')::boolean, true),
      payload->>'contact_email', payload->>'contact_phone', payload->>'contact_web',
      coalesce(payload->'contact_socials','{}'::jsonb),
      -- especialista que crea su perfil queda 'pending' (curaduría); admin puede fijar status
      case when v_role = 'super_admin' then coalesce((payload->>'status')::vpa_spec_status,'published') else 'pending' end,
      coalesce((payload->>'sort_order')::int, 0))
    returning id into v_id;
  else
    update app_vpa_specialists set
      category_id = coalesce((payload->>'category_id')::uuid, category_id),
      name = coalesce(payload->>'name', name),
      role_es = payload->>'role_es', role_en = payload->>'role_en',
      bio_es = payload->>'bio_es', bio_en = payload->>'bio_en',
      focus_es = coalesce((select array_agg(value) from jsonb_array_elements_text(payload->'focus_es')), focus_es),
      focus_en = coalesce((select array_agg(value) from jsonb_array_elements_text(payload->'focus_en')), focus_en),
      certs_es = payload->>'certs_es', certs_en = payload->>'certs_en',
      photo_url = coalesce(payload->>'photo_url', photo_url),
      langs = coalesce((select array_agg(value) from jsonb_array_elements_text(payload->'langs')), langs),
      modalities = coalesce((select array_agg(value::vpa_modality) from jsonb_array_elements_text(payload->'modalities')), modalities),
      available_now = coalesce((payload->>'available_now')::boolean, available_now),
      contact_email = coalesce(payload->>'contact_email', contact_email),
      contact_phone = coalesce(payload->>'contact_phone', contact_phone),
      contact_web = coalesce(payload->>'contact_web', contact_web),
      contact_socials = coalesce(payload->'contact_socials', contact_socials),
      status = case when v_role = 'super_admin' and payload ? 'status' then (payload->>'status')::vpa_spec_status else status end,
      sort_order = coalesce((payload->>'sort_order')::int, sort_order),
      updated_at = now()
    where id = v_id;
  end if;

  perform vpa__audit('upsert','specialist',v_id,payload);
  return v_id;
end; $$;

-- Verificar / publicar / ocultar especialista (admin)
create or replace function vpa_set_specialist_status(p_id uuid, p_status vpa_spec_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform vpa_require(auth.uid(),'super_admin');
  update app_vpa_specialists
     set status = p_status,
         verified_at = case when p_status in ('verified','published') then coalesce(verified_at, now()) else verified_at end,
         verified_by = case when p_status in ('verified','published') then coalesce(verified_by, auth.uid()) else verified_by end,
         updated_at = now()
   where id = p_id;
  perform vpa__audit('set_status','specialist',p_id, jsonb_build_object('status',p_status));
end; $$;

-- Revelar contacto (requiere sesión; registra el reveal — anti-scrape + analítica)
create or replace function vpa_reveal_contact(p_specialist_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v jsonb;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select jsonb_build_object(
    'email', contact_email, 'phone', contact_phone,
    'web', contact_web, 'socials', contact_socials)
    into v
  from app_vpa_specialists where id = p_specialist_id and status = 'published';
  if v is null then raise exception 'not found'; end if;
  perform vpa__audit('reveal_contact','specialist',p_specialist_id, jsonb_build_object('by',v_uid));
  return v;
end; $$;

-- Categoría (admin)
create or replace function vpa_upsert_category(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(payload->>'id','')::uuid;
begin
  perform vpa_require(auth.uid(),'super_admin');
  if v_id is null then
    insert into app_vpa_categories (slug, icon, name_es, name_en, desc_es, desc_en, sort_order, status)
    values (payload->>'slug', payload->>'icon', payload->>'name_es', payload->>'name_en',
            payload->>'desc_es', payload->>'desc_en',
            coalesce((payload->>'sort_order')::int,0), coalesce((payload->>'status')::vpa_pub_status,'published'))
    returning id into v_id;
  else
    update app_vpa_categories set
      slug = coalesce(payload->>'slug', slug), icon = coalesce(payload->>'icon', icon),
      name_es = coalesce(payload->>'name_es', name_es), name_en = coalesce(payload->>'name_en', name_en),
      desc_es = payload->>'desc_es', desc_en = payload->>'desc_en',
      sort_order = coalesce((payload->>'sort_order')::int, sort_order),
      status = coalesce((payload->>'status')::vpa_pub_status, status)
    where id = v_id;
  end if;
  perform vpa__audit('upsert','category',v_id,payload);
  return v_id;
end; $$;

-- Taller / retiro (admin o especialista dueño). Especialista => 'pending'.
create or replace function vpa_upsert_workshop(payload jsonb)
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
     and not exists (select 1 from app_vpa_workshops w join app_vpa_specialists s on s.id=w.specialist_id
                     where w.id=v_id and s.fbid_user=v_uid) then raise exception 'forbidden'; end if;

  if v_id is null then
    insert into app_vpa_workshops (specialist_id, title_es, title_en, desc_es, desc_en, starts_at, ends_at,
      location, is_retreat, modality, price_cents, currency, capacity, cover_url, status)
    values (v_spec, payload->>'title_es', payload->>'title_en', payload->>'desc_es', payload->>'desc_en',
      (payload->>'starts_at')::timestamptz, nullif(payload->>'ends_at','')::timestamptz,
      payload->>'location', coalesce((payload->>'is_retreat')::boolean,false),
      (payload->>'modality')::vpa_modality, coalesce((payload->>'price_cents')::int,0),
      coalesce(payload->>'currency','MXN'), nullif(payload->>'capacity','')::int, payload->>'cover_url',
      case when v_role='super_admin' then coalesce((payload->>'status')::vpa_pub_status,'published') else 'pending' end)
    returning id into v_id;
  else
    update app_vpa_workshops set
      specialist_id = coalesce(v_spec, specialist_id),
      title_es = coalesce(payload->>'title_es', title_es), title_en = coalesce(payload->>'title_en', title_en),
      desc_es = payload->>'desc_es', desc_en = payload->>'desc_en',
      starts_at = coalesce((payload->>'starts_at')::timestamptz, starts_at),
      ends_at = nullif(payload->>'ends_at','')::timestamptz, location = payload->>'location',
      is_retreat = coalesce((payload->>'is_retreat')::boolean, is_retreat),
      modality = coalesce((payload->>'modality')::vpa_modality, modality),
      price_cents = coalesce((payload->>'price_cents')::int, price_cents),
      currency = coalesce(payload->>'currency', currency),
      capacity = nullif(payload->>'capacity','')::int, cover_url = coalesce(payload->>'cover_url', cover_url),
      status = case when v_role='super_admin' and payload ? 'status' then (payload->>'status')::vpa_pub_status else status end
    where id = v_id;
  end if;
  perform vpa__audit('upsert','workshop',v_id,payload);
  return v_id;
end; $$;

-- Producto (admin o especialista dueño). Especialista => 'pending' (curaduría).
create or replace function vpa_upsert_product(payload jsonb)
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
     and not exists (select 1 from app_vpa_products where id=v_id and specialist_id=v_spec) then raise exception 'forbidden'; end if;

  if v_id is null then
    insert into app_vpa_products (specialist_id, title_es, title_en, desc_es, desc_en, type_es, type_en,
      price_cents, currency, cover_url, asset_path, network_shareable, status)
    values (v_spec, payload->>'title_es', payload->>'title_en', payload->>'desc_es', payload->>'desc_en',
      payload->>'type_es', payload->>'type_en', coalesce((payload->>'price_cents')::int,0),
      coalesce(payload->>'currency','MXN'), payload->>'cover_url', payload->>'asset_path',
      coalesce((payload->>'network_shareable')::boolean,false),
      case when v_role='super_admin' then coalesce((payload->>'status')::vpa_pub_status,'published') else 'pending' end)
    returning id into v_id;
  else
    update app_vpa_products set
      specialist_id = coalesce(v_spec, specialist_id),
      title_es = coalesce(payload->>'title_es', title_es), title_en = coalesce(payload->>'title_en', title_en),
      desc_es = payload->>'desc_es', desc_en = payload->>'desc_en',
      type_es = payload->>'type_es', type_en = payload->>'type_en',
      price_cents = coalesce((payload->>'price_cents')::int, price_cents),
      currency = coalesce(payload->>'currency', currency), cover_url = coalesce(payload->>'cover_url', cover_url),
      asset_path = coalesce(payload->>'asset_path', asset_path),
      network_shareable = coalesce((payload->>'network_shareable')::boolean, network_shareable),
      status = case when v_role='super_admin' and payload ? 'status' then (payload->>'status')::vpa_pub_status else status end
    where id = v_id;
  end if;
  perform vpa__audit('upsert','product',v_id,payload);
  return v_id;
end; $$;

-- Servicio holístico agendable (admin o especialista dueño). Especialista => 'pending'.
create or replace function vpa_upsert_service(payload jsonb)
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
     and not exists (select 1 from app_vpa_services where id=v_id and specialist_id=v_spec) then raise exception 'forbidden'; end if;

  if v_id is null then
    insert into app_vpa_services (specialist_id, title_es, title_en, desc_es, desc_en, duration_min,
      modality, price_cents, currency, cover_url, network_shareable, status, sort_order)
    values (coalesce(v_spec,(payload->>'specialist_id')::uuid), payload->>'title_es', payload->>'title_en',
      payload->>'desc_es', payload->>'desc_en', nullif(payload->>'duration_min','')::int,
      coalesce((payload->>'modality')::vpa_modality,'online'), coalesce((payload->>'price_cents')::int,0),
      coalesce(payload->>'currency','MXN'), payload->>'cover_url',
      coalesce((payload->>'network_shareable')::boolean,false),
      case when v_role='super_admin' then coalesce((payload->>'status')::vpa_pub_status,'published') else 'pending' end,
      coalesce((payload->>'sort_order')::int,0))
    returning id into v_id;
  else
    update app_vpa_services set
      title_es = coalesce(payload->>'title_es', title_es), title_en = coalesce(payload->>'title_en', title_en),
      desc_es = payload->>'desc_es', desc_en = payload->>'desc_en',
      duration_min = nullif(payload->>'duration_min','')::int,
      modality = coalesce((payload->>'modality')::vpa_modality, modality),
      price_cents = coalesce((payload->>'price_cents')::int, price_cents),
      currency = coalesce(payload->>'currency', currency), cover_url = coalesce(payload->>'cover_url', cover_url),
      network_shareable = coalesce((payload->>'network_shareable')::boolean, network_shareable),
      status = case when v_role='super_admin' and payload ? 'status' then (payload->>'status')::vpa_pub_status else status end,
      sort_order = coalesce((payload->>'sort_order')::int, sort_order)
    where id = v_id;
  end if;
  perform vpa__audit('upsert','service',v_id,payload);
  return v_id;
end; $$;

-- Testimonio (admin)
create or replace function vpa_upsert_testimonial(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(payload->>'id','')::uuid;
begin
  perform vpa_require(auth.uid(),'super_admin');
  if v_id is null then
    insert into app_vpa_testimonials (quote_es, quote_en, author, loc_es, loc_en, avatar_url, sort_order, status)
    values (payload->>'quote_es', payload->>'quote_en', payload->>'author', payload->>'loc_es', payload->>'loc_en',
            payload->>'avatar_url', coalesce((payload->>'sort_order')::int,0), coalesce((payload->>'status')::vpa_pub_status,'published'))
    returning id into v_id;
  else
    update app_vpa_testimonials set
      quote_es = coalesce(payload->>'quote_es', quote_es), quote_en = coalesce(payload->>'quote_en', quote_en),
      author = coalesce(payload->>'author', author), loc_es = payload->>'loc_es', loc_en = payload->>'loc_en',
      avatar_url = coalesce(payload->>'avatar_url', avatar_url),
      sort_order = coalesce((payload->>'sort_order')::int, sort_order),
      status = coalesce((payload->>'status')::vpa_pub_status, status)
    where id = v_id;
  end if;
  perform vpa__audit('upsert','testimonial',v_id,payload);
  return v_id;
end; $$;

-- Publicar/ocultar genérico (admin) — entidad ∈ category|workshop|product|service|testimonial
create or replace function vpa_set_status(p_entity text, p_id uuid, p_status vpa_pub_status)
returns void language plpgsql security definer set search_path = public as $$
declare v_tbl text;
begin
  perform vpa_require(auth.uid(),'super_admin');
  v_tbl := case p_entity
    when 'category' then 'app_vpa_categories' when 'workshop' then 'app_vpa_workshops'
    when 'product' then 'app_vpa_products' when 'service' then 'app_vpa_services'
    when 'testimonial' then 'app_vpa_testimonials' else null end;
  if v_tbl is null then raise exception 'bad entity'; end if;
  execute format('update %I set status=$1 where id=$2', v_tbl) using p_status, p_id;
  perform vpa__audit('set_status',p_entity,p_id, jsonb_build_object('status',p_status));
end; $$;

-- Reordenar (admin) — drag & drop sort_order
create or replace function vpa_reorder(p_entity text, p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare v_tbl text; i int;
begin
  perform vpa_require(auth.uid(),'super_admin');
  v_tbl := case p_entity
    when 'category' then 'app_vpa_categories' when 'specialist' then 'app_vpa_specialists'
    when 'service' then 'app_vpa_services' when 'testimonial' then 'app_vpa_testimonials' else null end;
  if v_tbl is null then raise exception 'bad entity'; end if;
  for i in 1 .. array_length(p_ids,1) loop
    execute format('update %I set sort_order=$1 where id=$2', v_tbl) using i, p_ids[i];
  end loop;
  perform vpa__audit('reorder',p_entity,null, to_jsonb(p_ids));
end; $$;

-- Inquiry pública (contacto + postulación). Rate-limit básico por email.
create or replace function vpa_submit_inquiry(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_recent int;
begin
  select count(*) into v_recent from app_vpa_inquiries
   where email = lower(payload->>'email') and created_at > now() - interval '2 minutes';
  if v_recent >= 3 then raise exception 'rate limited'; end if;
  insert into app_vpa_inquiries (kind, name, email, discipline, message)
  values (coalesce((payload->>'kind')::vpa_inquiry_kind,'general'),
          payload->>'name', lower(payload->>'email'), payload->>'discipline', payload->>'message')
  returning id into v_id;
  return v_id;
end; $$;

-- Cambiar rol de un miembro (admin)
create or replace function vpa_set_member_role(p_fbid uuid, p_role vpa_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform vpa_require(auth.uid(),'super_admin');
  insert into app_vpa_members (fbid_user, role) values (p_fbid, p_role)
  on conflict (fbid_user) do update set role = p_role;
  perform vpa__audit('set_member_role','member',p_fbid, jsonb_build_object('role',p_role));
end; $$;

-- Editar settings (copy de inicio / redes) (admin)
create or replace function vpa_update_settings(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform vpa_require(auth.uid(),'super_admin');
  insert into app_vpa_settings (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = p_value, updated_at = now();
  perform vpa__audit('update_settings','settings',null, jsonb_build_object('key',p_key));
end; $$;

-- Marcar inquiry como atendida (admin)
create or replace function vpa_handle_inquiry(p_id uuid, p_handled boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform vpa_require(auth.uid(),'super_admin');
  update app_vpa_inquiries set handled = p_handled where id = p_id;
  perform vpa__audit('handle_inquiry','inquiry',p_id, jsonb_build_object('handled',p_handled));
end; $$;

-- Promover inquiry de postulación a especialista (admin): crea perfil borrador
create or replace function vpa_promote_inquiry(p_id uuid, p_category_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_spec uuid; v_name text;
begin
  perform vpa_require(auth.uid(),'super_admin');
  select name into v_name from app_vpa_inquiries where id = p_id;
  if v_name is null then raise exception 'not found'; end if;
  insert into app_vpa_specialists (category_id, name, status)
  values (p_category_id, v_name, 'pending') returning id into v_spec;
  update app_vpa_inquiries set handled = true where id = p_id;
  perform vpa__audit('promote_inquiry','specialist',v_spec, jsonb_build_object('inquiry',p_id));
  return v_spec;
end; $$;

-- Registrar orden pagada (service role, webhook Stripe)
create or replace function vpa_record_order(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not vpa__is_service() then raise exception 'forbidden'; end if;
  insert into app_vpa_orders (buyer_fbid, buyer_email, kind, ref_id, amount_cents, currency,
    flowshare_ref, stripe_session, status)
  values (nullif(payload->>'buyer_fbid','')::uuid, lower(payload->>'buyer_email'),
    (payload->>'kind')::vpa_order_kind, (payload->>'ref_id')::uuid, (payload->>'amount_cents')::int,
    coalesce(payload->>'currency','MXN'), payload->>'flowshare_ref', payload->>'stripe_session',
    coalesce((payload->>'status')::vpa_order_status,'paid'))
  returning id into v_id;
  return v_id;
end; $$;

-- Cumplir orden (service role): confirma asiento de taller; productos los entrega el route con URL firmada
create or replace function vpa_fulfill_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order app_vpa_orders; v_asset text;
begin
  if not vpa__is_service() then raise exception 'forbidden'; end if;
  select * into v_order from app_vpa_orders where id = p_order_id;
  if v_order.id is null then raise exception 'not found'; end if;

  if v_order.kind = 'workshop' then
    update app_vpa_workshops set seats_taken = seats_taken + 1 where id = v_order.ref_id;
  elsif v_order.kind = 'product' then
    select asset_path into v_asset from app_vpa_products where id = v_order.ref_id;
  end if;

  update app_vpa_orders set status = 'fulfilled', fulfilled_at = now() where id = p_order_id;
  return jsonb_build_object('kind', v_order.kind, 'ref_id', v_order.ref_id,
    'buyer_email', v_order.buyer_email, 'asset_path', v_asset);
end; $$;

-- ---------- Grants de ejecución ----------
grant execute on function vpa_my_role(), vpa_ensure_member(text), vpa_submit_inquiry(jsonb) to anon, authenticated;
grant execute on function vpa_reveal_contact(uuid) to authenticated;
grant execute on function
  vpa_upsert_specialist(jsonb), vpa_set_specialist_status(uuid, vpa_spec_status),
  vpa_upsert_category(jsonb), vpa_upsert_workshop(jsonb), vpa_upsert_product(jsonb),
  vpa_upsert_service(jsonb), vpa_upsert_testimonial(jsonb), vpa_set_status(text, uuid, vpa_pub_status),
  vpa_reorder(text, uuid[]), vpa_set_member_role(uuid, vpa_role), vpa_update_settings(text, jsonb),
  vpa_handle_inquiry(uuid, boolean), vpa_promote_inquiry(uuid, uuid)
  to authenticated;
