-- =====================================================================
-- VOCES PARA EL ALMA — Migración 0006 — marketplace engine
-- Feedback Mónica/Steph 2026-07-12. Todo aditivo. Piezas:
--  1. Temática nueva "Historias de Transformación" (la sección se renombra
--     a "Temáticas" en el frontend; el modelo no cambia)
--  2. Slugs de especialista → enlace directo compartible /?voz=slug
--  3. Perfiles reclamables: Mónica genera un enlace único; la voz lo abre,
--     crea su acceso (sin depender del correo del proyecto) y el perfil
--     queda ligado a su cuenta
--  4. Moderación total: comentarios/sugerencias de Mónica sobre cualquier
--     campo, notificaciones a la voz, hilo de respuestas, y NADA se
--     publica hasta que ella aprueba (o la voz acepta lo que ella propuso)
--  5. Membresías ON $11/111 · Amplified $44/444 · Global $144/1440 (USD)
--     con comisión de venta 50/30/20/10 y créditos de marketing
--  6. Códigos de descuento y referidos con libertad total para Mónica
--     (monto o %, comisión al referidor, límites, expiración)
--  7. Voces Points (gamificación, append-only) + créditos
--  8. Carrito/checkout real: order_groups + order_items con split de
--     comisión calculado por membresía del especialista
--  9. Cuenta bancaria del especialista para depósitos (privada)
-- 10. Cuestionario "ayuda de Voces" específico por oferta
-- 11. Outbox de correo transaccional (Resend vía edge fn vpa-mailer;
--     el SMTP del proyecto sigue sin configurarse — gap conocido)
-- =====================================================================

-- ============ 1. NUEVA TEMÁTICA ============
insert into app_vpa_categories (slug, icon, name_es, name_en, desc_es, desc_en, sort_order, status)
select 'historias-transformacion',
  '<path d="M12 5c-1.8-2.8-6.4-2.8-7.4 0-.8 2 .9 4.6 3.7 4.6-2.8 0-4.5 2.6-3.7 4.6 1 2.8 5.6 2.8 7.4 0"/><path d="M12 5c1.8-2.8 6.4-2.8 7.4 0 .8 2-.9 4.6-3.7 4.6 2.8 0 4.5 2.6 3.7 4.6-1 2.8-5.6 2.8-7.4 0"/><path d="M12 4v16"/>',
  'Historias de Transformación','Transformation Stories',
  'Voces que ya cruzaron el umbral y comparten cómo cambió su vida.',
  'Voices who crossed the threshold and share how their life changed.',
  9,'published'
where not exists (select 1 from app_vpa_categories where slug='historias-transformacion');

-- ============ 2. SLUGS (enlace compartible) ============
alter table app_vpa_specialists add column if not exists slug text unique;

create or replace function vpa__slugify(p text) returns text
language sql stable set search_path = public, extensions as $$
  select trim(both '-' from lower(regexp_replace(extensions.unaccent(coalesce(p,'')),'[^a-zA-Z0-9]+','-','g')))
$$;

create or replace function vpa__ensure_spec_slug() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := vpa__slugify(new.name);
    if new.slug = '' then new.slug := null; end if;
    if new.slug is not null and exists (select 1 from app_vpa_specialists where slug=new.slug and id<>new.id) then
      new.slug := new.slug || '-' || left(replace(new.id::text,'-',''),6);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists vpa_spec_slug on app_vpa_specialists;
create trigger vpa_spec_slug before insert or update of name, slug on app_vpa_specialists
  for each row execute function vpa__ensure_spec_slug();

-- backfill
update app_vpa_specialists set slug = null where slug = '';
update app_vpa_specialists s set slug = sub.s2 from (
  select id, case when count(*) over (partition by vpa__slugify(name)) > 1
                  then vpa__slugify(name) || '-' || left(replace(id::text,'-',''),6)
                  else vpa__slugify(name) end as s2
  from app_vpa_specialists where slug is null) sub
where s.id = sub.id and sub.s2 <> '';

-- vistas públicas ahora exponen slug (mismo orden de columnas + slug al final —
-- create or replace view sólo permite añadir al final)
create or replace view app_vpa_specialists_public as
  select id, category_id, name, role_es, role_en, bio_es, bio_en,
         focus_es, focus_en, certs_es, certs_en, photo_url, langs, modalities,
         available_now, sort_order, slug
  from app_vpa_specialists where status in ('published','verified');

create or replace view app_vpa_offerings_public as
  select o.id, o.specialist_id, o.kind, o.title, o.description, o.price_cents, o.currency,
         o.external_url, o.sell_via_voces, o.in_progress, o.cover_url, o.sort_order,
         s.name as specialist_name, s.slug as specialist_slug
  from app_vpa_offerings o
  join app_vpa_specialists s on s.id = o.specialist_id
  where o.status = 'published' and s.status in ('published','verified');
grant select on app_vpa_offerings_public to anon, authenticated;

-- ============ 10. CUESTIONARIO "AYUDA DE VOCES" ============
alter table app_vpa_offerings add column if not exists help_types text[] not null default '{}';
alter table app_vpa_offerings add column if not exists help_other text;
alter table app_vpa_applications add column if not exists ref_code text;

-- ============ HELPERS internos ============
create or replace function vpa__notify(p_recipient uuid, p_specialist uuid, p_request uuid,
  p_kind text, p_title text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_recipient is null then return; end if;
  insert into app_vpa_notifications (recipient, specialist_id, request_id, kind, title, body)
  values (p_recipient, p_specialist, p_request, p_kind, left(p_title,200), left(coalesce(p_body,''),2000));
end $$;

create or replace function vpa__notify_admins(p_specialist uuid, p_request uuid,
  p_kind text, p_title text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select fbid_user from app_vpa_members where role='super_admin' loop
    perform vpa__notify(r.fbid_user, p_specialist, p_request, p_kind, p_title, p_body);
  end loop;
end $$;

create or replace function vpa__award_points(p_member uuid, p_points int, p_reason text, p_ref jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_member is null or coalesce(p_points,0) = 0 then return; end if;
  insert into app_vpa_points (member, points, reason, ref) values (p_member, p_points, left(p_reason,120), coalesce(p_ref,'{}'::jsonb));
end $$;

create or replace function vpa__points_rule(p_key text) returns int
language sql stable set search_path = public as $$
  select coalesce((select (value->>p_key)::int from app_vpa_settings where key='points_rules'), 0)
$$;

create or replace function vpa__queue_email(p_to text, p_name text, p_template text, p_payload jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_to is null or p_to !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return; end if;
  insert into app_vpa_email_outbox (to_email, to_name, template, payload)
  values (lower(p_to), left(coalesce(p_name,''),120), p_template, coalesce(p_payload,'{}'::jsonb));
end $$;

-- ============ 11. EMAIL OUTBOX ============
create table if not exists app_vpa_email_outbox (
  id         uuid primary key default gen_random_uuid(),
  to_email   text not null,
  to_name    text,
  template   text not null,
  payload    jsonb not null default '{}'::jsonb,
  status     text not null default 'queued' check (status in ('queued','sent','failed','skipped')),
  attempts   int not null default 0,
  error      text,
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);
create index if not exists app_vpa_email_outbox_status_idx on app_vpa_email_outbox (status, created_at);
alter table app_vpa_email_outbox enable row level security;
drop policy if exists vpa_outbox_sel on app_vpa_email_outbox;
create policy vpa_outbox_sel on app_vpa_email_outbox for select using (vpa_role_of(auth.uid())='super_admin');

-- correo de confirmación al recibir una solicitud de perfil
create or replace function vpa__on_application_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform vpa__queue_email(new.email, new.name, 'application_received',
    jsonb_build_object('name', new.name, 'locale', new.locale));
  return new;
end $$;
drop trigger if exists vpa_app_welcome on app_vpa_applications;
create trigger vpa_app_welcome after insert on app_vpa_applications
  for each row execute function vpa__on_application_insert();

-- ============ 3. PERFILES RECLAMABLES ============
create table if not exists app_vpa_profile_claims (
  id            uuid primary key default gen_random_uuid(),   -- el token del enlace
  specialist_id uuid not null references app_vpa_specialists(id) on delete cascade,
  status        text not null default 'active' check (status in ('active','claimed','revoked')),
  created_by    uuid references public.flowbond_users(id),
  claimed_by    uuid references public.flowbond_users(id),
  claimed_at    timestamptz,
  expires_at    timestamptz not null default now() + interval '90 days',
  created_at    timestamptz not null default now()
);
create index if not exists app_vpa_profile_claims_spec_idx on app_vpa_profile_claims (specialist_id, status);
alter table app_vpa_profile_claims enable row level security;
drop policy if exists vpa_claims_sel on app_vpa_profile_claims;
create policy vpa_claims_sel on app_vpa_profile_claims for select using (vpa_role_of(auth.uid())='super_admin');

create or replace function vpa_create_claim(p_specialist_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform vpa_require(auth.uid(),'super_admin');
  if not exists (select 1 from app_vpa_specialists where id=p_specialist_id) then raise exception 'not found'; end if;
  update app_vpa_profile_claims set status='revoked' where specialist_id=p_specialist_id and status='active';
  insert into app_vpa_profile_claims (specialist_id, created_by) values (p_specialist_id, auth.uid()) returning id into v_id;
  perform vpa__audit('create_claim','specialist',p_specialist_id, jsonb_build_object('claim',v_id));
  return v_id;
end $$;

-- info pública mínima para la página de reclamo (anon)
create or replace function vpa_claim_info(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c app_vpa_profile_claims; s app_vpa_specialists;
begin
  select * into c from app_vpa_profile_claims where id = p_token;
  if c.id is null or c.status <> 'active' or c.expires_at < now() then
    return jsonb_build_object('valid', false);
  end if;
  select * into s from app_vpa_specialists where id = c.specialist_id;
  if s.id is null or s.fbid_user is not null then return jsonb_build_object('valid', false); end if;
  return jsonb_build_object('valid', true, 'name', s.name, 'role_es', s.role_es, 'photo_url', s.photo_url, 'slug', s.slug);
end $$;

-- ejecutado SOLO por la edge function vpa-claim (service_role) tras crear la cuenta
create or replace function vpa_complete_claim(p_token uuid, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c app_vpa_profile_claims; s app_vpa_specialists;
begin
  select * into c from app_vpa_profile_claims where id = p_token for update;
  if c.id is null or c.status <> 'active' or c.expires_at < now() then raise exception 'invalid claim'; end if;
  select * into s from app_vpa_specialists where id = c.specialist_id for update;
  if s.id is null then raise exception 'invalid claim'; end if;
  if s.fbid_user is not null and s.fbid_user <> p_user then raise exception 'already claimed'; end if;

  update app_vpa_specialists set fbid_user = p_user where id = s.id;
  insert into app_vpa_members (fbid_user, role) values (p_user, 'specialist')
    on conflict (fbid_user) do update set role = case when app_vpa_members.role='super_admin' then 'super_admin' else 'specialist' end;
  update app_vpa_profile_claims set status='claimed', claimed_by=p_user, claimed_at=now() where id = p_token;
  perform vpa__award_points(p_user, vpa__points_rule('claim'), 'claim_profile', jsonb_build_object('specialist', s.id));
  perform vpa__queue_email(s.contact_email, s.name, 'welcome',
    jsonb_build_object('name', s.name, 'slug', s.slug));
  perform vpa__audit('complete_claim','specialist',s.id, jsonb_build_object('user',p_user,'claim',p_token));
  return jsonb_build_object('ok', true, 'specialist_id', s.id, 'slug', s.slug);
end $$;

-- ============ 4. MODERACIÓN: cambios, comentarios, notificaciones ============
create table if not exists app_vpa_change_requests (
  id            uuid primary key default gen_random_uuid(),
  specialist_id uuid not null references app_vpa_specialists(id) on delete cascade,
  offering_id   uuid references app_vpa_offerings(id) on delete cascade,
  kind          text not null check (kind in ('comment','suggestion','edit')),
  changes       jsonb not null default '{}'::jsonb,
  status        text not null default 'open' check (status in ('open','applied','rejected','withdrawn')),
  opened_by     uuid not null references public.flowbond_users(id),
  opened_role   vpa_role not null,
  resolved_by   uuid references public.flowbond_users(id),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists app_vpa_change_requests_spec_idx on app_vpa_change_requests (specialist_id, status, created_at desc);

create table if not exists app_vpa_change_messages (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references app_vpa_change_requests(id) on delete cascade,
  author      uuid not null references public.flowbond_users(id),
  author_role vpa_role not null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists app_vpa_change_messages_req_idx on app_vpa_change_messages (request_id, created_at);

create table if not exists app_vpa_notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient     uuid not null references public.flowbond_users(id) on delete cascade,
  specialist_id uuid references app_vpa_specialists(id) on delete cascade,
  request_id    uuid references app_vpa_change_requests(id) on delete cascade,
  kind          text not null,
  title         text not null,
  body          text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists app_vpa_notifications_rcpt_idx on app_vpa_notifications (recipient, read_at, created_at desc);

alter table app_vpa_change_requests  enable row level security;
alter table app_vpa_change_messages  enable row level security;
alter table app_vpa_notifications    enable row level security;
drop policy if exists vpa_chreq_sel on app_vpa_change_requests;
create policy vpa_chreq_sel on app_vpa_change_requests for select using (
  vpa_role_of(auth.uid())='super_admin'
  or exists (select 1 from app_vpa_specialists s where s.id=specialist_id and s.fbid_user=auth.uid()));
drop policy if exists vpa_chmsg_sel on app_vpa_change_messages;
create policy vpa_chmsg_sel on app_vpa_change_messages for select using (
  exists (select 1 from app_vpa_change_requests r where r.id=request_id and (
    vpa_role_of(auth.uid())='super_admin'
    or exists (select 1 from app_vpa_specialists s where s.id=r.specialist_id and s.fbid_user=auth.uid()))));
drop policy if exists vpa_notif_sel on app_vpa_notifications;
create policy vpa_notif_sel on app_vpa_notifications for select using (recipient = auth.uid());

-- columnas que un cambio puede tocar (lista blanca)
create or replace function vpa__apply_changes(p_spec uuid, p_offering uuid, p_changes jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  spec_cols  text[] := array['name','role_es','role_en','bio_es','bio_en','certs_es','certs_en',
                             'photo_url','contact_email','contact_phone','contact_web','category_id',
                             'available_now','sort_order'];
  spec_arrs  text[] := array['focus_es','focus_en','langs'];
  off_cols   text[] := array['kind','title','description','price_cents','currency','external_url',
                             'sell_via_voces','in_progress','cover_url','sort_order'];
  k text; sets text := ''; args jsonb := '{}'::jsonb;
begin
  if p_changes is null or p_changes = '{}'::jsonb then return; end if;
  if p_offering is not null then
    for k in select jsonb_object_keys(p_changes) loop
      if k = any(off_cols) then
        sets := sets || format('%I = (%L)::%s,', k, p_changes->>k,
          case k when 'price_cents' then 'int' when 'sort_order' then 'int'
                 when 'sell_via_voces' then 'boolean' when 'in_progress' then 'boolean'
                 when 'kind' then 'vpa_offering_type' else 'text' end);
      end if;
    end loop;
    if sets <> '' then
      execute 'update app_vpa_offerings set ' || left(sets, length(sets)-1) || ' where id = $1' using p_offering;
    end if;
  else
    for k in select jsonb_object_keys(p_changes) loop
      if k = any(spec_cols) then
        sets := sets || format('%I = (%L)::%s,', k, p_changes->>k,
          case k when 'category_id' then 'uuid' when 'available_now' then 'boolean'
                 when 'sort_order' then 'int' else 'text' end);
      elsif k = any(spec_arrs) then
        sets := sets || format('%I = (select coalesce(array_agg(x),''{}'') from jsonb_array_elements_text(%L::jsonb) t(x)),', k, p_changes->k);
      elsif k = 'modalities' then
        sets := sets || format('modalities = (select coalesce(array_agg(x::vpa_modality),''{online}'') from jsonb_array_elements_text(%L::jsonb) t(x)),', p_changes->k);
      end if;
    end loop;
    if sets <> '' then
      execute 'update app_vpa_specialists set ' || left(sets, length(sets)-1) || ' where id = $1' using p_spec;
    end if;
  end if;
end $$;

-- abrir comentario / sugerencia (admin) o edición propuesta (la voz)
create or replace function vpa_open_change(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_role vpa_role := vpa_role_of(auth.uid());
  v_spec uuid := nullif(payload->>'specialist_id','')::uuid;
  v_off  uuid := nullif(payload->>'offering_id','')::uuid;
  v_kind text := coalesce(payload->>'kind','comment');
  v_changes jsonb := coalesce(payload->'changes','{}'::jsonb);
  v_msg text := trim(coalesce(payload->>'message',''));
  v_id uuid; v_owner uuid; v_name text;
begin
  if v_role not in ('specialist','super_admin') then raise exception 'forbidden'; end if;
  if v_kind not in ('comment','suggestion','edit') then raise exception 'bad kind'; end if;
  if v_role = 'specialist' then
    select id, fbid_user into v_spec, v_owner from app_vpa_specialists where fbid_user = v_uid limit 1;
    if v_spec is null then raise exception 'no specialist profile'; end if;
    if v_kind = 'suggestion' then v_kind := 'edit'; end if;
  else
    if v_spec is null then raise exception 'specialist required'; end if;
    select fbid_user, name into v_owner, v_name from app_vpa_specialists where id = v_spec;
    if v_name is null then raise exception 'not found'; end if;
  end if;
  if v_off is not null and not exists (select 1 from app_vpa_offerings where id=v_off and specialist_id=v_spec) then
    raise exception 'offering mismatch';
  end if;
  if jsonb_typeof(v_changes) <> 'object' then v_changes := '{}'::jsonb; end if;
  if v_msg = '' and v_changes = '{}'::jsonb then raise exception 'empty'; end if;

  insert into app_vpa_change_requests (specialist_id, offering_id, kind, changes, opened_by, opened_role)
  values (v_spec, v_off, v_kind, v_changes, v_uid, v_role) returning id into v_id;
  if v_msg <> '' then
    insert into app_vpa_change_messages (request_id, author, author_role, body) values (v_id, v_uid, v_role, left(v_msg,4000));
  end if;

  select name into v_name from app_vpa_specialists where id = v_spec;
  if v_role = 'super_admin' then
    perform vpa__notify(v_owner, v_spec, v_id, 'change_'||v_kind,
      case when v_kind='comment' then 'Nuevo comentario de Voces en tu perfil' else 'Voces sugiere un cambio en tu perfil' end, v_msg);
    -- si la voz aún no reclama su perfil, avísale por correo
    if v_owner is null then
      perform vpa__queue_email((select contact_email from app_vpa_specialists where id=v_spec), v_name,
        'admin_note', jsonb_build_object('name', v_name, 'message', left(v_msg,500)));
    end if;
  else
    perform vpa__notify_admins(v_spec, v_id, 'change_edit', v_name || ' propone cambios en su perfil', v_msg);
  end if;
  perform vpa__audit('open_change','specialist',v_spec, jsonb_build_object('request',v_id,'kind',v_kind));
  return v_id;
end $$;

create or replace function vpa_reply_change(p_request uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare r app_vpa_change_requests; v_uid uuid := auth.uid(); v_role vpa_role := vpa_role_of(auth.uid());
        v_owner uuid; v_name text;
begin
  select * into r from app_vpa_change_requests where id = p_request;
  if r.id is null then raise exception 'not found'; end if;
  select fbid_user, name into v_owner, v_name from app_vpa_specialists where id = r.specialist_id;
  if v_role <> 'super_admin' and (v_owner is null or v_owner <> v_uid) then raise exception 'forbidden'; end if;
  if trim(coalesce(p_body,'')) = '' then raise exception 'empty'; end if;
  insert into app_vpa_change_messages (request_id, author, author_role, body) values (p_request, v_uid, v_role, left(trim(p_body),4000));
  if v_role = 'super_admin' then
    perform vpa__notify(v_owner, r.specialist_id, r.id, 'reply', 'Voces respondió en la conversación de tu perfil', left(p_body,300));
  else
    perform vpa__notify_admins(r.specialist_id, r.id, 'reply', v_name || ' respondió', left(p_body,300));
  end if;
end $$;

-- resolver: approve (aplica cambios), accept (la voz acepta sugerencia de Mónica → aplica),
-- reject, withdraw. Regla: los cambios propuestos por la voz SOLO se aplican cuando
-- Mónica aprueba; los que propone Mónica se aplican cuando la voz acepta (o Mónica fuerza).
create or replace function vpa_resolve_change(p_request uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare r app_vpa_change_requests; v_uid uuid := auth.uid(); v_role vpa_role := vpa_role_of(auth.uid());
        v_owner uuid; v_name text; v_new text;
begin
  select * into r from app_vpa_change_requests where id = p_request for update;
  if r.id is null then raise exception 'not found'; end if;
  if r.status <> 'open' then raise exception 'already resolved'; end if;
  select fbid_user, name into v_owner, v_name from app_vpa_specialists where id = r.specialist_id;
  if v_role <> 'super_admin' and (v_owner is null or v_owner <> v_uid) then raise exception 'forbidden'; end if;

  if p_action = 'approve' then
    perform vpa_require(auth.uid(),'super_admin');
    perform vpa__apply_changes(r.specialist_id, r.offering_id, r.changes);
    v_new := 'applied';
    perform vpa__notify(v_owner, r.specialist_id, r.id, 'approved', 'Voces aprobó y publicó los cambios', null);
  elsif p_action = 'accept' then
    if v_role = 'super_admin' then raise exception 'accept is for the specialist'; end if;
    if r.opened_role <> 'super_admin' then raise exception 'only suggestions can be accepted'; end if;
    perform vpa__apply_changes(r.specialist_id, r.offering_id, r.changes);
    v_new := 'applied';
    perform vpa__notify_admins(r.specialist_id, r.id, 'accepted', v_name || ' aceptó la sugerencia — cambios publicados', null);
  elsif p_action = 'reject' then
    v_new := 'rejected';
    if v_role = 'super_admin' then
      perform vpa__notify(v_owner, r.specialist_id, r.id, 'rejected', 'Voces no aprobó los cambios propuestos', null);
    else
      perform vpa__notify_admins(r.specialist_id, r.id, 'rejected', v_name || ' declinó la sugerencia', null);
    end if;
  elsif p_action = 'withdraw' then
    if r.opened_by <> v_uid then raise exception 'only author withdraws'; end if;
    v_new := 'withdrawn';
  else
    raise exception 'bad action';
  end if;

  update app_vpa_change_requests set status = v_new, resolved_by = v_uid, resolved_at = now() where id = p_request;
  perform vpa__audit('resolve_change','specialist',r.specialist_id, jsonb_build_object('request',p_request,'action',p_action));
end $$;

create or replace function vpa_mark_notifications_read(p_ids uuid[] default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update app_vpa_notifications set read_at = now()
  where recipient = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids));
end $$;

-- borrar perfil (Mónica tiene libertad total; cascada a ofertas/claims/hilos)
create or replace function vpa_delete_specialist(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  perform vpa_require(auth.uid(),'super_admin');
  select name into v_name from app_vpa_specialists where id = p_id;
  if v_name is null then raise exception 'not found'; end if;
  perform vpa__audit('delete_specialist','specialist',p_id, jsonb_build_object('name',v_name));
  delete from app_vpa_specialists where id = p_id;
end $$;

-- ============ 5. MEMBRESÍAS ============
create table if not exists app_vpa_plans (
  id             text primary key,
  name_es        text not null, name_en text not null,
  monthly_cents  int not null default 0,
  yearly_cents   int not null default 0,
  currency       text not null default 'USD',
  commission_pct int not null check (commission_pct between 0 and 100),
  monthly_credits_cents int not null default 0,
  perks_es       text[] not null default '{}',
  perks_en       text[] not null default '{}',
  sort_order     int not null default 0,
  active         boolean not null default true
);
alter table app_vpa_plans enable row level security;
drop policy if exists vpa_plans_sel on app_vpa_plans;
create policy vpa_plans_sel on app_vpa_plans for select using (true);
grant select on app_vpa_plans to anon, authenticated;

insert into app_vpa_plans (id,name_es,name_en,monthly_cents,yearly_cents,commission_pct,monthly_credits_cents,perks_es,perks_en,sort_order) values
 ('free','Comunidad','Community',0,0,50,0,
   array['Presencia en la plataforma','Comisión de venta 50%'],
   array['Presence on the platform','50% sales commission'],0),
 ('on','ON','ON',1100,11100,30,1100,
   array['Presencia destacada','Marketing dirigido a la red','Comisión de venta 30%','Créditos de marketing'],
   array['Featured presence','Targeted network marketing','30% sales commission','Marketing credits'],1),
 ('amplified','Amplified','Amplified',4400,44400,20,4400,
   array['Presencia amplificada','Campañas personalizadas','Comisión de venta 20%','Más créditos y material profesional'],
   array['Amplified presence','Personalized campaigns','20% sales commission','More credits & pro material'],2),
 ('global','Global Exposure','Global Exposure',14400,144000,10,14400,
   array['Exposición global','Marketing dirigido premium','Comisión de venta 10%','Créditos máximos y campañas regaladas'],
   array['Global exposure','Premium targeted marketing','10% sales commission','Max credits & gifted campaigns'],3)
on conflict (id) do nothing;

create or replace function vpa_upsert_plan(payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform vpa_require(auth.uid(),'super_admin');
  insert into app_vpa_plans (id,name_es,name_en,monthly_cents,yearly_cents,commission_pct,monthly_credits_cents,perks_es,perks_en,sort_order,active)
  values (payload->>'id', payload->>'name_es', payload->>'name_en',
    coalesce((payload->>'monthly_cents')::int,0), coalesce((payload->>'yearly_cents')::int,0),
    coalesce((payload->>'commission_pct')::int,50), coalesce((payload->>'monthly_credits_cents')::int,0),
    coalesce((select array_agg(x) from jsonb_array_elements_text(payload->'perks_es') t(x)),'{}'),
    coalesce((select array_agg(x) from jsonb_array_elements_text(payload->'perks_en') t(x)),'{}'),
    coalesce((payload->>'sort_order')::int,0), coalesce((payload->>'active')::boolean,true))
  on conflict (id) do update set
    name_es=excluded.name_es, name_en=excluded.name_en, monthly_cents=excluded.monthly_cents,
    yearly_cents=excluded.yearly_cents, commission_pct=excluded.commission_pct,
    monthly_credits_cents=excluded.monthly_credits_cents, perks_es=excluded.perks_es,
    perks_en=excluded.perks_en, sort_order=excluded.sort_order, active=excluded.active;
  perform vpa__audit('upsert_plan','plan',null, payload);
end $$;

create table if not exists app_vpa_subscriptions (
  id             uuid primary key default gen_random_uuid(),
  specialist_id  uuid not null references app_vpa_specialists(id) on delete cascade,
  member         uuid references public.flowbond_users(id),
  plan_id        text not null references app_vpa_plans(id),
  period         text not null default 'monthly' check (period in ('monthly','yearly')),
  status         text not null default 'pending' check (status in ('pending','active','past_due','canceled')),
  price_cents    int not null default 0,
  currency       text not null default 'USD',
  code           text,
  started_at     timestamptz,
  current_period_end timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists app_vpa_subscriptions_spec_idx on app_vpa_subscriptions (specialist_id, status);
alter table app_vpa_subscriptions enable row level security;
drop policy if exists vpa_subs_sel on app_vpa_subscriptions;
create policy vpa_subs_sel on app_vpa_subscriptions for select using (
  vpa_role_of(auth.uid())='super_admin'
  or exists (select 1 from app_vpa_specialists s where s.id=specialist_id and s.fbid_user=auth.uid()));

-- comisión efectiva de un especialista según membresía activa (default free/50)
create or replace function vpa__commission_pct(p_spec uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((
    select p.commission_pct from app_vpa_subscriptions sub
    join app_vpa_plans p on p.id = sub.plan_id
    where sub.specialist_id = p_spec and sub.status = 'active'
      and (sub.current_period_end is null or sub.current_period_end > now())
    order by sub.created_at desc limit 1), 50)
$$;

-- ============ 6. CÓDIGOS (descuento + referidos, libertad total) ============
create table if not exists app_vpa_codes (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  discount_type text not null default 'amount' check (discount_type in ('amount','percent')),
  discount_value int not null default 0 check (discount_value >= 0),
  applies_plans text[] not null default '{on,amplified,global}',
  applies_orders boolean not null default false,   -- también válido en el checkout de la tienda
  referrer      uuid references public.flowbond_users(id),
  referrer_specialist uuid references app_vpa_specialists(id) on delete set null,
  referrer_commission_type text not null default 'percent' check (referrer_commission_type in ('amount','percent')),
  referrer_commission_value int not null default 0,
  points_per_use int not null default 0,
  max_uses      int,
  uses          int not null default 0,
  expires_at    timestamptz,
  notes         text,
  active        boolean not null default true,
  created_by    uuid references public.flowbond_users(id),
  created_at    timestamptz not null default now()
);
alter table app_vpa_codes enable row level security;
drop policy if exists vpa_codes_sel on app_vpa_codes;
create policy vpa_codes_sel on app_vpa_codes for select using (
  vpa_role_of(auth.uid())='super_admin' or referrer = auth.uid()
  or exists (select 1 from app_vpa_specialists s where s.id=referrer_specialist and s.fbid_user=auth.uid()));

create table if not exists app_vpa_referral_events (
  id         uuid primary key default gen_random_uuid(),
  code_id    uuid not null references app_vpa_codes(id) on delete cascade,
  kind       text not null check (kind in ('signup','subscription','order')),
  referred_email text,
  referred   uuid references public.flowbond_users(id),
  ref_id     uuid,
  commission_cents int not null default 0,
  currency   text not null default 'USD',
  status     text not null default 'pending' check (status in ('pending','approved','paid','void')),
  created_at timestamptz not null default now()
);
alter table app_vpa_referral_events enable row level security;
drop policy if exists vpa_refev_sel on app_vpa_referral_events;
create policy vpa_refev_sel on app_vpa_referral_events for select using (
  vpa_role_of(auth.uid())='super_admin'
  or exists (select 1 from app_vpa_codes c where c.id=code_id and (c.referrer=auth.uid()
       or exists (select 1 from app_vpa_specialists s where s.id=c.referrer_specialist and s.fbid_user=auth.uid()))));

create or replace function vpa_upsert_code(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(payload->>'id','')::uuid;
begin
  perform vpa_require(auth.uid(),'super_admin');
  if v_id is null then
    insert into app_vpa_codes (code, discount_type, discount_value, applies_plans, applies_orders,
      referrer, referrer_specialist, referrer_commission_type, referrer_commission_value,
      points_per_use, max_uses, expires_at, notes, active, created_by)
    values (upper(trim(payload->>'code')),
      coalesce(payload->>'discount_type','amount'), coalesce((payload->>'discount_value')::int,0),
      coalesce((select array_agg(x) from jsonb_array_elements_text(payload->'applies_plans') t(x)),'{on,amplified,global}'),
      coalesce((payload->>'applies_orders')::boolean,false),
      nullif(payload->>'referrer','')::uuid, nullif(payload->>'referrer_specialist','')::uuid,
      coalesce(payload->>'referrer_commission_type','percent'), coalesce((payload->>'referrer_commission_value')::int,0),
      coalesce((payload->>'points_per_use')::int,0),
      nullif(payload->>'max_uses','')::int, nullif(payload->>'expires_at','')::timestamptz,
      payload->>'notes', coalesce((payload->>'active')::boolean,true), auth.uid())
    returning id into v_id;
  else
    update app_vpa_codes set
      code = coalesce(upper(trim(payload->>'code')), code),
      discount_type = coalesce(payload->>'discount_type', discount_type),
      discount_value = coalesce((payload->>'discount_value')::int, discount_value),
      applies_plans = coalesce((select array_agg(x) from jsonb_array_elements_text(payload->'applies_plans') t(x)), applies_plans),
      applies_orders = coalesce((payload->>'applies_orders')::boolean, applies_orders),
      referrer = nullif(payload->>'referrer','')::uuid,
      referrer_specialist = nullif(payload->>'referrer_specialist','')::uuid,
      referrer_commission_type = coalesce(payload->>'referrer_commission_type', referrer_commission_type),
      referrer_commission_value = coalesce((payload->>'referrer_commission_value')::int, referrer_commission_value),
      points_per_use = coalesce((payload->>'points_per_use')::int, points_per_use),
      max_uses = nullif(payload->>'max_uses','')::int,
      expires_at = nullif(payload->>'expires_at','')::timestamptz,
      notes = coalesce(payload->>'notes', notes),
      active = coalesce((payload->>'active')::boolean, active)
    where id = v_id;
  end if;
  perform vpa__audit('upsert_code','code',v_id, payload - 'referrer');
  return v_id;
end $$;

-- validación pública de un código (checkout / membresía). No incrementa usos.
create or replace function vpa_check_code(p_code text, p_context text default 'plan', p_plan text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c app_vpa_codes;
begin
  select * into c from app_vpa_codes where code = upper(trim(p_code)) and active;
  if c.id is null or (c.expires_at is not null and c.expires_at < now())
     or (c.max_uses is not null and c.uses >= c.max_uses) then
    return jsonb_build_object('valid', false);
  end if;
  if p_context = 'order' and not c.applies_orders then return jsonb_build_object('valid', false); end if;
  if p_context = 'plan' and p_plan is not null and not (p_plan = any(c.applies_plans)) then
    return jsonb_build_object('valid', false);
  end if;
  return jsonb_build_object('valid', true, 'discount_type', c.discount_type, 'discount_value', c.discount_value);
end $$;

-- registrar uso (interno)
create or replace function vpa__redeem_code(p_code text, p_kind text, p_ref uuid, p_referred uuid,
  p_referred_email text, p_base_cents int, p_currency text)
returns int language plpgsql security definer set search_path = public as $$
declare c app_vpa_codes; v_disc int := 0; v_comm int := 0;
begin
  if coalesce(trim(p_code),'') = '' then return 0; end if;
  select * into c from app_vpa_codes where code = upper(trim(p_code)) and active for update;
  if c.id is null or (c.expires_at is not null and c.expires_at < now())
     or (c.max_uses is not null and c.uses >= c.max_uses) then return 0; end if;
  v_disc := case when c.discount_type='percent'
                 then least(p_base_cents, (p_base_cents * least(c.discount_value,100)) / 100)
                 else least(p_base_cents, c.discount_value) end;
  update app_vpa_codes set uses = uses + 1 where id = c.id;
  if c.referrer is not null or c.referrer_specialist is not null then
    v_comm := case when c.referrer_commission_type='percent'
                   then ((p_base_cents - v_disc) * least(c.referrer_commission_value,100)) / 100
                   else c.referrer_commission_value end;
    insert into app_vpa_referral_events (code_id, kind, referred, referred_email, ref_id, commission_cents, currency)
    values (c.id, p_kind, p_referred, p_referred_email, p_ref, v_comm, coalesce(p_currency,'USD'));
    perform vpa__award_points(c.referrer, c.points_per_use, 'referral_'||p_kind, jsonb_build_object('code',c.code,'ref',p_ref));
  end if;
  return v_disc;
end $$;

-- ============ 7. PUNTOS + CRÉDITOS (append-only) ============
create table if not exists app_vpa_points (
  id         uuid primary key default gen_random_uuid(),
  member     uuid not null references public.flowbond_users(id) on delete cascade,
  points     int not null,
  reason     text,
  ref        jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists app_vpa_points_member_idx on app_vpa_points (member, created_at desc);
do $$ begin
  create rule app_vpa_points_no_update as on update to app_vpa_points do instead nothing;
  create rule app_vpa_points_no_delete as on delete to app_vpa_points do instead nothing;
exception when duplicate_object then null; end $$;

create table if not exists app_vpa_credits (
  id          uuid primary key default gen_random_uuid(),
  member      uuid references public.flowbond_users(id) on delete cascade,
  specialist_id uuid references app_vpa_specialists(id) on delete cascade,
  delta_cents int not null,
  currency    text not null default 'USD',
  reason      text,
  ref         jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
do $$ begin
  create rule app_vpa_credits_no_update as on update to app_vpa_credits do instead nothing;
  create rule app_vpa_credits_no_delete as on delete to app_vpa_credits do instead nothing;
exception when duplicate_object then null; end $$;

alter table app_vpa_points  enable row level security;
alter table app_vpa_credits enable row level security;
drop policy if exists vpa_points_sel on app_vpa_points;
create policy vpa_points_sel on app_vpa_points for select using (member = auth.uid() or vpa_role_of(auth.uid())='super_admin');
drop policy if exists vpa_credits_sel on app_vpa_credits;
create policy vpa_credits_sel on app_vpa_credits for select using (
  member = auth.uid() or vpa_role_of(auth.uid())='super_admin'
  or exists (select 1 from app_vpa_specialists s where s.id=specialist_id and s.fbid_user=auth.uid()));

create or replace function vpa_award_points(p_member uuid, p_points int, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform vpa_require(auth.uid(),'super_admin');
  perform vpa__award_points(p_member, p_points, coalesce(p_reason,'admin_award'), jsonb_build_object('by',auth.uid()));
end $$;

create or replace function vpa_grant_credits(p_specialist uuid, p_delta_cents int, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform vpa_require(auth.uid(),'super_admin');
  insert into app_vpa_credits (specialist_id, member, delta_cents, reason, ref)
  select p_specialist, s.fbid_user, p_delta_cents, coalesce(p_reason,'admin_grant'), jsonb_build_object('by',auth.uid())
  from app_vpa_specialists s where s.id = p_specialist;
  perform vpa__audit('grant_credits','specialist',p_specialist, jsonb_build_object('delta',p_delta_cents,'reason',p_reason));
end $$;

-- reglas de puntos editables por Mónica (vpa_update_settings key 'points_rules')
insert into app_vpa_settings (key, value)
values ('points_rules', '{"claim":111,"application":33,"order_paid_per_100mxn":1,"referral_signup":55,"subscription_active":222}'::jsonb)
on conflict (key) do nothing;

-- activar / gestionar membresía (Mónica; el cobro llega después con FlowShare)
create or replace function vpa_admin_set_subscription(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(payload->>'id','')::uuid;
        v_spec uuid := nullif(payload->>'specialist_id','')::uuid;
        v_plan text := payload->>'plan_id';
        v_period text := coalesce(payload->>'period','monthly');
        v_status text := coalesce(payload->>'status','active');
        v_code text := payload->>'code';
        v_price int; v_disc int := 0; v_member uuid; v_plan_row app_vpa_plans;
begin
  perform vpa_require(auth.uid(),'super_admin');
  select * into v_plan_row from app_vpa_plans where id = v_plan;
  if v_plan_row.id is null then raise exception 'bad plan'; end if;
  if v_period not in ('monthly','yearly') then raise exception 'bad period'; end if;
  v_price := case when v_period='yearly' then v_plan_row.yearly_cents else v_plan_row.monthly_cents end;
  select fbid_user into v_member from app_vpa_specialists where id = v_spec;

  if v_id is null then
    if v_spec is null then raise exception 'specialist required'; end if;
    update app_vpa_subscriptions set status='canceled' where specialist_id=v_spec and status in ('pending','active');
    insert into app_vpa_subscriptions (specialist_id, member, plan_id, period, status, price_cents, code,
      started_at, current_period_end)
    values (v_spec, v_member, v_plan, v_period, v_status, v_price, nullif(v_code,''),
      case when v_status='active' then now() end,
      case when v_status='active' then now() + case when v_period='yearly' then interval '1 year' else interval '1 month' end end)
    returning id into v_id;
    if v_status = 'active' then
      v_disc := vpa__redeem_code(v_code, 'subscription', v_id, v_member,
        (select contact_email from app_vpa_specialists where id=v_spec), v_price, 'USD');
      if v_disc > 0 then update app_vpa_subscriptions set price_cents = greatest(0, v_price - v_disc) where id = v_id; end if;
      if v_plan_row.monthly_credits_cents > 0 then
        insert into app_vpa_credits (specialist_id, member, delta_cents, reason, ref)
        values (v_spec, v_member, v_plan_row.monthly_credits_cents * case when v_period='yearly' then 12 else 1 end,
                'plan_grant', jsonb_build_object('subscription',v_id,'plan',v_plan));
      end if;
      perform vpa__award_points(v_member, vpa__points_rule('subscription_active'), 'subscription_active', jsonb_build_object('plan',v_plan));
      if v_member is not null then update app_vpa_members set subscription_status='active' where fbid_user=v_member; end if;
    end if;
  else
    update app_vpa_subscriptions set status = v_status,
      current_period_end = case when v_status='active' and current_period_end is null
        then now() + case when period='yearly' then interval '1 year' else interval '1 month' end
        else current_period_end end
    where id = v_id returning specialist_id into v_spec;
  end if;
  perform vpa__audit('set_subscription','specialist',v_spec, payload);
  return v_id;
end $$;

-- ============ 8. CHECKOUT (carrito real, split por comisión) ============
create table if not exists app_vpa_order_groups (
  id             uuid primary key default gen_random_uuid(),
  buyer_fbid     uuid references public.flowbond_users(id),
  buyer_email    text not null,
  buyer_name     text,
  subtotal_cents int not null default 0,
  discount_cents int not null default 0,
  total_cents    int not null default 0,
  currency       text not null default 'MXN',
  code           text,
  status         text not null default 'awaiting_payment'
                 check (status in ('awaiting_payment','paid','fulfilled','canceled','refunded')),
  payment_ref    text,
  notes          text,
  created_at     timestamptz not null default now()
);
do $$ begin
  create rule app_vpa_order_groups_no_delete as on delete to app_vpa_order_groups do instead nothing;
exception when duplicate_object then null; end $$;

create table if not exists app_vpa_order_items (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references app_vpa_order_groups(id) on delete cascade,
  item_type        text not null check (item_type in ('product','offering','workshop')),
  item_id          uuid not null,
  title            text not null,
  qty              int not null default 1 check (qty > 0),
  unit_cents       int not null check (unit_cents >= 0),
  specialist_id    uuid references app_vpa_specialists(id) on delete set null,
  commission_pct   int not null default 50,
  platform_cents   int not null default 0,
  specialist_cents int not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists app_vpa_order_items_group_idx on app_vpa_order_items (group_id);
create index if not exists app_vpa_order_items_spec_idx on app_vpa_order_items (specialist_id);

alter table app_vpa_order_groups enable row level security;
alter table app_vpa_order_items  enable row level security;
drop policy if exists vpa_ogroups_sel on app_vpa_order_groups;
create policy vpa_ogroups_sel on app_vpa_order_groups for select using (
  vpa_role_of(auth.uid())='super_admin' or buyer_fbid = auth.uid());
drop policy if exists vpa_oitems_sel on app_vpa_order_items;
create policy vpa_oitems_sel on app_vpa_order_items for select using (
  vpa_role_of(auth.uid())='super_admin'
  or exists (select 1 from app_vpa_order_groups g where g.id=group_id and g.buyer_fbid=auth.uid())
  or exists (select 1 from app_vpa_specialists s where s.id=specialist_id and s.fbid_user=auth.uid()));

create or replace function vpa_checkout(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(payload->>'email'));
  v_name  text := left(trim(coalesce(payload->>'name','')),120);
  v_code  text := payload->>'code';
  v_group uuid; v_sub int := 0; v_disc int := 0;
  it jsonb; v_qty int; v_type text; v_iid uuid;
  v_title text; v_price int; v_spec uuid; v_pct int; v_recent int; v_total int;
  n_items int := 0;
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  if jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') = 0 then
    raise exception 'empty cart'; end if;
  if jsonb_array_length(payload->'items') > 30 then raise exception 'too many items'; end if;

  -- rate limit (endpoint anónimo)
  select count(*) into v_recent from app_vpa_order_groups
   where buyer_email = v_email and created_at > now() - interval '10 minutes';
  if v_recent >= 3 then raise exception 'rate limited'; end if;
  select count(*) into v_total from app_vpa_order_groups where created_at > now() - interval '1 hour';
  if v_total >= 60 then raise exception 'rate limited'; end if;

  insert into app_vpa_order_groups (buyer_fbid, buyer_email, buyer_name)
  values (auth.uid(), v_email, v_name) returning id into v_group;

  for it in select * from jsonb_array_elements(payload->'items') loop
    v_type := it->>'type'; v_iid := nullif(it->>'id','')::uuid;
    v_qty := least(greatest(coalesce((it->>'qty')::int,1),1),20);
    if v_iid is null then raise exception 'bad item'; end if;
    if v_type = 'product' then
      select title_es, price_cents, specialist_id into v_title, v_price, v_spec
      from app_vpa_products where id = v_iid and status = 'published';
    elsif v_type = 'offering' then
      select o.title, o.price_cents, o.specialist_id into v_title, v_price, v_spec
      from app_vpa_offerings o join app_vpa_specialists s on s.id=o.specialist_id
      where o.id = v_iid and o.status='published' and s.status in ('published','verified')
        and o.sell_via_voces and not o.in_progress;
    elsif v_type = 'workshop' then
      select title_es, price_cents, specialist_id into v_title, v_price, v_spec
      from app_vpa_workshops where id = v_iid and status = 'published';
    else
      raise exception 'bad item type';
    end if;
    if v_title is null or v_price is null then raise exception 'item unavailable'; end if;
    v_pct := case when v_spec is null then 100 else vpa__commission_pct(v_spec) end;
    insert into app_vpa_order_items (group_id, item_type, item_id, title, qty, unit_cents,
      specialist_id, commission_pct, platform_cents, specialist_cents)
    values (v_group, v_type, v_iid, v_title, v_qty, v_price, v_spec, v_pct,
      (v_price * v_qty * v_pct) / 100, (v_price * v_qty) - (v_price * v_qty * v_pct) / 100);
    v_sub := v_sub + v_price * v_qty;
    n_items := n_items + 1;
    v_title := null; v_price := null; v_spec := null;
  end loop;

  v_disc := vpa__redeem_code(v_code, 'order', v_group, auth.uid(), v_email, v_sub, 'MXN');
  update app_vpa_order_groups
     set subtotal_cents = v_sub, discount_cents = v_disc, total_cents = greatest(0, v_sub - v_disc),
         code = case when v_disc > 0 then upper(trim(v_code)) end
   where id = v_group;

  perform vpa__queue_email(v_email, v_name, 'order_received',
    jsonb_build_object('order_id', v_group, 'total_cents', v_sub - v_disc, 'items', n_items));
  perform vpa__audit('checkout','order',v_group, jsonb_build_object('items',n_items,'total',v_sub - v_disc));
  return jsonb_build_object('order_id', v_group, 'subtotal_cents', v_sub,
    'discount_cents', v_disc, 'total_cents', greatest(0, v_sub - v_disc), 'currency', 'MXN');
end $$;

create or replace function vpa_set_order_status(p_id uuid, p_status text, p_payment_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
declare g app_vpa_order_groups;
begin
  perform vpa_require(auth.uid(),'super_admin');
  if p_status not in ('awaiting_payment','paid','fulfilled','canceled','refunded') then raise exception 'bad status'; end if;
  select * into g from app_vpa_order_groups where id = p_id for update;
  if g.id is null then raise exception 'not found'; end if;
  update app_vpa_order_groups set status = p_status, payment_ref = coalesce(p_payment_ref, payment_ref) where id = p_id;
  if p_status = 'paid' and g.status <> 'paid' then
    perform vpa__award_points(g.buyer_fbid, (g.total_cents / 10000) * vpa__points_rule('order_paid_per_100mxn'),
      'order_paid', jsonb_build_object('order', p_id));
    perform vpa__queue_email(g.buyer_email, g.buyer_name, 'order_paid',
      jsonb_build_object('order_id', p_id, 'total_cents', g.total_cents));
    -- avisa a cada voz con ítems en el pedido
    perform vpa__notify(s.fbid_user, s.id, null, 'sale', 'Tienes una venta en Voces',
        'Pedido ' || left(p_id::text,8) || ' pagado — tu parte se calcula según tu membresía.')
    from (select distinct oi.specialist_id from app_vpa_order_items oi where oi.group_id = p_id and oi.specialist_id is not null) x
    join app_vpa_specialists s on s.id = x.specialist_id where s.fbid_user is not null;
  end if;
  perform vpa__audit('set_order_status','order',p_id, jsonb_build_object('status',p_status));
end $$;

-- ============ 9. CUENTA BANCARIA (privada) ============
create table if not exists app_vpa_payout_accounts (
  specialist_id uuid primary key references app_vpa_specialists(id) on delete cascade,
  holder_name   text,
  bank_name     text,
  clabe         text,
  swift         text,
  paypal_email  text,
  country       text not null default 'MX',
  currency      text not null default 'MXN',
  notes         text,
  updated_by    uuid,
  updated_at    timestamptz not null default now()
);
alter table app_vpa_payout_accounts enable row level security;
drop policy if exists vpa_payout_sel on app_vpa_payout_accounts;
create policy vpa_payout_sel on app_vpa_payout_accounts for select using (
  vpa_role_of(auth.uid())='super_admin'
  or exists (select 1 from app_vpa_specialists s where s.id=specialist_id and s.fbid_user=auth.uid()));

create or replace function vpa_set_payout_account(payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_spec uuid := nullif(payload->>'specialist_id','')::uuid; v_role vpa_role := vpa_role_of(auth.uid());
begin
  if v_role = 'specialist' then
    select id into v_spec from app_vpa_specialists where fbid_user = auth.uid() limit 1;
    if v_spec is null then raise exception 'no specialist profile'; end if;
  elsif v_role <> 'super_admin' then
    raise exception 'forbidden';
  end if;
  if v_spec is null then raise exception 'specialist required'; end if;
  insert into app_vpa_payout_accounts (specialist_id, holder_name, bank_name, clabe, swift, paypal_email, country, currency, notes, updated_by)
  values (v_spec, left(payload->>'holder_name',160), left(payload->>'bank_name',120),
    left(regexp_replace(coalesce(payload->>'clabe',''),'[^0-9]','','g'),18),
    left(payload->>'swift',20), left(payload->>'paypal_email',200),
    coalesce(nullif(payload->>'country',''),'MX'), coalesce(nullif(payload->>'currency',''),'MXN'),
    left(payload->>'notes',500), auth.uid())
  on conflict (specialist_id) do update set
    holder_name=excluded.holder_name, bank_name=excluded.bank_name, clabe=excluded.clabe,
    swift=excluded.swift, paypal_email=excluded.paypal_email, country=excluded.country,
    currency=excluded.currency, notes=excluded.notes, updated_by=excluded.updated_by, updated_at=now();
  perform vpa__audit('set_payout_account','specialist',v_spec, jsonb_build_object('by',auth.uid()));
end $$;

-- ============ RPC de "mi perfil" para /mi-voz ============
create or replace function vpa_my_profile()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s app_vpa_specialists; v jsonb;
begin
  select * into s from app_vpa_specialists where fbid_user = auth.uid() limit 1;
  if s.id is null then return null; end if;
  v := to_jsonb(s) - 'verified_by';
  v := v || jsonb_build_object(
    'offerings', coalesce((select jsonb_agg(to_jsonb(o) order by o.sort_order) from app_vpa_offerings o where o.specialist_id = s.id),'[]'::jsonb),
    'payout', (select to_jsonb(p) from app_vpa_payout_accounts p where p.specialist_id = s.id),
    'subscription', (select jsonb_build_object('plan_id',sub.plan_id,'status',sub.status,'period',sub.period,'current_period_end',sub.current_period_end)
                     from app_vpa_subscriptions sub where sub.specialist_id = s.id and sub.status in ('pending','active')
                     order by sub.created_at desc limit 1),
    'points', coalesce((select sum(points) from app_vpa_points where member = auth.uid()),0),
    'credits_cents', coalesce((select sum(delta_cents) from app_vpa_credits where specialist_id = s.id),0));
  return v;
end $$;

-- ============ vpa_submit_application v2: help_types + ref_code ============
create or replace function vpa_submit_application(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_recent int; v_total int;
  v_email text := lower(trim(payload->>'email'));
  v_name  text := trim(payload->>'name');
  v_off jsonb := '[]'::jsonb; o jsonb; v_help jsonb;
begin
  if v_name is null or length(v_name) < 2 or length(v_name) > 120 then raise exception 'invalid name'; end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then raise exception 'invalid email'; end if;
  if coalesce(trim(payload->>'what_do'),'') = '' then raise exception 'what_do required'; end if;

  select count(*) into v_recent from app_vpa_applications
   where email = v_email and created_at > now() - interval '10 minutes';
  if v_recent >= 2 then raise exception 'rate limited'; end if;
  select count(*) into v_total from app_vpa_applications where created_at > now() - interval '1 hour';
  if v_total >= 30 then raise exception 'rate limited'; end if;

  if coalesce(payload->>'photo_path','') <> ''
     and payload->>'photo_path' !~ '^applications/[A-Za-z0-9._-]{1,120}$' then
    raise exception 'invalid photo path';
  end if;

  if jsonb_typeof(payload->'offerings') = 'array' then
    for o in select * from jsonb_array_elements(payload->'offerings') limit 20 loop
      if coalesce(trim(o->>'title'),'') <> '' then
        select coalesce(jsonb_agg(x),'[]'::jsonb) into v_help
        from (select value as x from jsonb_array_elements_text(o->'help_types')
              where value in ('maquetacion','publicacion','registro_autor','estructura_taller','otro') limit 5) t;
        v_off := v_off || jsonb_build_array(jsonb_build_object(
          'kind',           left(coalesce(o->>'kind','otro'), 30),
          'title',          left(trim(o->>'title'), 200),
          'description',    left(coalesce(o->>'description',''), 2000),
          'price_mxn',      case when (o->>'price_mxn') ~ '^[0-9]{1,7}(\.[0-9]{1,2})?$' then o->>'price_mxn' else null end,
          'external_url',   left(coalesce(o->>'external_url',''), 500),
          'sell_via_voces', coalesce((o->>'sell_via_voces')::boolean, false),
          'in_progress',    coalesce((o->>'in_progress')::boolean, false),
          'wants_help',     coalesce((o->>'wants_help')::boolean, false),
          'help_types',     v_help,
          'help_other',     left(coalesce(o->>'help_other',''), 500)));
      end if;
    end loop;
  end if;

  insert into app_vpa_applications
    (name, email, phone, category_id, headline, what_do, mission, website, socials,
     certifications, langs, modalities, photo_path, offerings, locale, ref_code)
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
     case when payload->>'locale' = 'en' then 'en' else 'es' end,
     left(upper(trim(coalesce(payload->>'ref_code',''))), 40))
  returning id into v_id;
  return v_id;
end $$;

-- ============ vpa_review_application v2: help fields + referral + correo ============
create or replace function vpa_review_application(
  p_id uuid, p_approve boolean,
  p_category_id uuid default null, p_sort_order int default null, p_notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a app_vpa_applications; v_spec uuid; v_cat uuid;
  o jsonb; v_kind vpa_offering_type; v_price int; v_bio text; v_photo text; v_slug text;
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
  returning id, slug into v_spec, v_slug;

  for o in select * from jsonb_array_elements(coalesce(a.offerings,'[]'::jsonb)) loop
    if coalesce(o->>'title','') <> '' then
      begin v_kind := (o->>'kind')::vpa_offering_type; exception when others then v_kind := 'otro'; end;
      v_price := case when (o->>'price_mxn') ~ '^[0-9]+(\.[0-9]+)?$'
                 then round((o->>'price_mxn')::numeric * 100)::int else null end;
      insert into app_vpa_offerings
        (specialist_id, kind, title, description, price_cents, external_url,
         sell_via_voces, in_progress, wants_help, help_types, help_other, status)
      values
        (v_spec, v_kind, o->>'title', nullif(o->>'description',''), v_price, nullif(o->>'external_url',''),
         coalesce((o->>'sell_via_voces')::boolean,false), coalesce((o->>'in_progress')::boolean,false),
         coalesce((o->>'wants_help')::boolean,false),
         coalesce((select array_agg(x) from jsonb_array_elements_text(o->'help_types') t(x)),'{}'),
         nullif(o->>'help_other',''), 'published');
    end if;
  end loop;

  update app_vpa_applications
     set status = 'approved', specialist_id = v_spec, admin_notes = coalesce(p_notes, admin_notes),
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_id;

  -- referido en el alta + puntos + correo de bienvenida con su enlace
  perform vpa__redeem_code(a.ref_code, 'signup', v_spec, null, a.email, 0, 'USD');
  perform vpa__queue_email(a.email, a.name, 'profile_published',
    jsonb_build_object('name', a.name, 'slug', v_slug, 'locale', a.locale));
  perform vpa__audit('approve_application','specialist',v_spec, jsonb_build_object('application',p_id));
  return v_spec;
end $$;

-- ============ Config del mailer (solo service_role) ============
create or replace function vpa__mailer_config()
returns jsonb language plpgsql stable security definer set search_path = public, vault as $$
begin
  return (select jsonb_object_agg(name, decrypted_secret)
          from vault.decrypted_secrets where name in ('vpa_resend_api_key','vpa_mail_from'));
end $$;

create or replace function vpa__store_secret(p_name text, p_value text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = p_name;
  if v_id is null then perform vault.create_secret(p_value, p_name);
  else perform vault.update_secret(v_id, p_value); end if;
end $$;

-- ============ marcar correos (solo service_role, desde vpa-mailer) ============
create or replace function vpa__outbox_take(p_limit int default 20)
returns setof app_vpa_email_outbox language plpgsql security definer set search_path = public as $$
begin
  return query
  update app_vpa_email_outbox set status='sent', attempts = attempts + 1, sent_at = now()
  where id in (select id from app_vpa_email_outbox where status='queued' and attempts < 5
               order by created_at limit p_limit for update skip locked)
  returning *;
end $$;

create or replace function vpa__outbox_fail(p_id uuid, p_error text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update app_vpa_email_outbox
     set status = case when attempts >= 5 then 'failed' else 'queued' end,
         sent_at = null, error = left(p_error, 500)
   where id = p_id;
end $$;

-- ============ GRANTS ============
-- públicos (anon): sólo lectura de claim, validación de código y checkout
grant execute on function vpa_claim_info(uuid) to anon, authenticated;
grant execute on function vpa_check_code(text, text, text) to anon, authenticated;
grant execute on function vpa_checkout(jsonb) to anon, authenticated;
grant execute on function vpa_submit_application(jsonb) to anon, authenticated;

-- autenticados (rol validado dentro)
grant execute on function vpa_open_change(jsonb) to authenticated;
grant execute on function vpa_reply_change(uuid, text) to authenticated;
grant execute on function vpa_resolve_change(uuid, text) to authenticated;
grant execute on function vpa_mark_notifications_read(uuid[]) to authenticated;
grant execute on function vpa_set_payout_account(jsonb) to authenticated;
grant execute on function vpa_my_profile() to authenticated;
grant execute on function vpa_create_claim(uuid) to authenticated;
grant execute on function vpa_delete_specialist(uuid) to authenticated;
grant execute on function vpa_upsert_plan(jsonb) to authenticated;
grant execute on function vpa_admin_set_subscription(jsonb) to authenticated;
grant execute on function vpa_upsert_code(jsonb) to authenticated;
grant execute on function vpa_award_points(uuid, int, text) to authenticated;
grant execute on function vpa_grant_credits(uuid, int, text) to authenticated;
grant execute on function vpa_set_order_status(uuid, text, text) to authenticated;
grant execute on function vpa_review_application(uuid, boolean, uuid, int, text) to authenticated;

-- revocar el grant implícito a PUBLIC en TODO lo nuevo (defensa en profundidad)
revoke execute on function vpa__slugify(text) from public, anon;
revoke execute on function vpa__notify(uuid,uuid,uuid,text,text,text) from public, anon, authenticated;
revoke execute on function vpa__notify_admins(uuid,uuid,text,text,text) from public, anon, authenticated;
revoke execute on function vpa__award_points(uuid,int,text,jsonb) from public, anon, authenticated;
revoke execute on function vpa__points_rule(text) from public, anon, authenticated;
revoke execute on function vpa__queue_email(text,text,text,jsonb) from public, anon, authenticated;
revoke execute on function vpa__apply_changes(uuid,uuid,jsonb) from public, anon, authenticated;
revoke execute on function vpa__commission_pct(uuid) from public, anon;
revoke execute on function vpa__redeem_code(text,text,uuid,uuid,text,int,text) from public, anon, authenticated;
revoke execute on function vpa_complete_claim(uuid,uuid) from public, anon, authenticated;
revoke execute on function vpa__mailer_config() from public, anon, authenticated;
revoke execute on function vpa__store_secret(text,text) from public, anon, authenticated;
revoke execute on function vpa__outbox_take(int) from public, anon, authenticated;
revoke execute on function vpa__outbox_fail(uuid,text) from public, anon, authenticated;
revoke execute on function vpa_create_claim(uuid) from public, anon;
revoke execute on function vpa_open_change(jsonb) from public, anon;
revoke execute on function vpa_reply_change(uuid,text) from public, anon;
revoke execute on function vpa_resolve_change(uuid,text) from public, anon;
revoke execute on function vpa_mark_notifications_read(uuid[]) from public, anon;
revoke execute on function vpa_set_payout_account(jsonb) from public, anon;
revoke execute on function vpa_my_profile() from public, anon;
revoke execute on function vpa_delete_specialist(uuid) from public, anon;
revoke execute on function vpa_upsert_plan(jsonb) from public, anon;
revoke execute on function vpa_admin_set_subscription(jsonb) from public, anon;
revoke execute on function vpa_upsert_code(jsonb) from public, anon;
revoke execute on function vpa_award_points(uuid,int,text) from public, anon;
revoke execute on function vpa_grant_credits(uuid,int,text) from public, anon;
revoke execute on function vpa_set_order_status(uuid,text,text) from public, anon;
