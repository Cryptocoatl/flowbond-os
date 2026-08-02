-- vpa_0029 — Enlaces limpios, píldora de estado y agenda obligatoria en sesiones
-- Pedido de Mónica 2026-07-31, puntos 1, 2, 4, 6 y 8.
--
--  1) Slug del perfil sin sufijo aleatorio  → monica-salgado (no monica-salgado-89cd4c)
--  2) Slug por oferta                        → /oferta/monica-salgado/comenzar-de-nuevo
--  4) Píldora de estado elegible por la voz  → disponible | reserva | proximamente
--  6) Sesión individual/grupal = enlace de agenda OBLIGATORIO para publicar
--  6.3.2) Correo a la voz al pagarse una sesión (trazabilidad del pago vs. Calendly)
--
-- Todo aditivo. No borra ni renombra nada existente.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · SLUGS DE PERFIL LIMPIOS
-- El trigger vpa__ensure_spec_slug ya sólo agrega sufijo cuando hay choque real;
-- Mónica y ALVERA lo arrastran de cuando existía su perfil duplicado (ya borrado).
-- Se limpia el sufijo de todo perfil cuyo slug base esté libre.
-- ─────────────────────────────────────────────────────────────────────────────
update app_vpa_specialists s
   set slug = vpa__slugify(s.name)
 where vpa__slugify(s.name) <> ''
   and s.slug is distinct from vpa__slugify(s.name)
   and not exists (
     select 1 from app_vpa_specialists o
      where o.id <> s.id and o.slug = vpa__slugify(s.name)
   );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · SLUG POR OFERTA
-- Único por especialista: dos voces distintas SÍ pueden tener "Comenzar de Nuevo"
-- porque el enlace completo es /oferta/<voz>/<oferta>. El desempate (-2, -3…)
-- sólo entra si la MISMA voz repite el nombre exacto del producto.
-- ─────────────────────────────────────────────────────────────────────────────
alter table app_vpa_offerings add column if not exists slug text;

create or replace function public.vpa__ensure_offering_slug()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare base text; cand text; n int := 1;
begin
  if new.slug is null or new.slug = '' or (tg_op = 'UPDATE' and new.title is distinct from old.title and new.slug = old.slug) then
    base := vpa__slugify(coalesce(new.title,''));
    if base = '' then base := 'oferta'; end if;
    base := left(base, 80);
    cand := base;
    while exists (
      select 1 from app_vpa_offerings o
       where o.specialist_id = new.specialist_id and o.slug = cand and o.id <> new.id
    ) loop
      n := n + 1;
      cand := base || '-' || n;
    end loop;
    new.slug := cand;
  end if;
  return new;
end $$;

drop trigger if exists vpa_offering_slug on app_vpa_offerings;
create trigger vpa_offering_slug
  before insert or update on app_vpa_offerings
  for each row execute function public.vpa__ensure_offering_slug();

-- Backfill determinista (ordenado por creación para que el desempate sea estable)
do $$
declare r record; base text; cand text; n int;
begin
  for r in select id, specialist_id, title from app_vpa_offerings where slug is null or slug = '' order by created_at loop
    base := left(nullif(vpa__slugify(coalesce(r.title,'')),''), 80);
    if base is null then base := 'oferta'; end if;
    cand := base; n := 1;
    while exists (select 1 from app_vpa_offerings o where o.specialist_id = r.specialist_id and o.slug = cand and o.id <> r.id) loop
      n := n + 1; cand := base || '-' || n;
    end loop;
    update app_vpa_offerings set slug = cand where id = r.id;
  end loop;
end $$;

create unique index if not exists app_vpa_offerings_slug_uq
  on app_vpa_offerings (specialist_id, slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · PÍLDORA DE ESTADO ELEGIBLE
-- null = automático (conserva el comportamiento de hoy: "Próximamente" sólo si
-- la obra está marcada en proceso). La voz puede fijarla a mano.
-- ─────────────────────────────────────────────────────────────────────────────
alter table app_vpa_offerings add column if not exists status_pill text;

alter table app_vpa_offerings drop constraint if exists app_vpa_offerings_status_pill_ck;
alter table app_vpa_offerings add constraint app_vpa_offerings_status_pill_ck
  check (status_pill is null or status_pill in ('disponible','reserva','proximamente','ninguna'));

-- ─────────────────────────────────────────────────────────────────────────────
-- VISTA PÚBLICA — columnas nuevas SIEMPRE al final (CREATE OR REPLACE no reordena)
-- booking_url NUNCA sale aquí: es privado a propósito (sólo vpa_order_booking,
-- con orden pagada + correo que coincide). Se expone sólo el booleano.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.app_vpa_offerings_public as
 SELECT o.id,
    o.specialist_id,
    o.kind,
    o.title,
    o.description,
    o.price_cents,
    o.currency,
    o.external_url,
    o.sell_via_voces,
    o.in_progress,
    o.cover_url,
    o.sort_order,
    s.name AS specialist_name,
    s.slug AS specialist_slug,
    o.preview_url,
        CASE
            WHEN COALESCE(o.price_cents, 0) = 0 THEN o.file_url
            ELSE NULL::text
        END AS file_url,
        CASE
            WHEN COALESCE(o.price_cents, 0) = 0 THEN o.file_name
            ELSE NULL::text
        END AS file_name,
    o.slug,
    o.status_pill,
    (COALESCE(o.booking_url, '') <> '') AS has_booking
   FROM app_vpa_offerings o
     JOIN app_vpa_specialists s ON s.id = o.specialist_id
  WHERE o.status = 'published'::vpa_pub_status
    AND (s.status = ANY (ARRAY['published'::vpa_spec_status, 'verified'::vpa_spec_status]));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6 + 8 · AGENDA OBLIGATORIA EN SESIONES  +  píldora en el upsert
-- La oferta se puede GUARDAR sin enlace de agenda, pero NO se puede publicar.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.vpa_upsert_offering(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_uid uuid := auth.uid(); v_role vpa_role := vpa_role_of(auth.uid());
        v_id uuid := nullif(payload->>'id','')::uuid; v_spec uuid := nullif(payload->>'specialist_id','')::uuid;
        v_kind vpa_offering_type; v_booking text; v_status vpa_pub_status;
begin
  if v_role not in ('specialist','super_admin') then raise exception 'forbidden'; end if;
  if v_role = 'specialist' then
    select id into v_spec from app_vpa_specialists where fbid_user = v_uid limit 1;
    if v_spec is null then raise exception 'no specialist profile'; end if;
  end if;
  if v_id is not null and v_role = 'specialist'
     and not exists (select 1 from app_vpa_offerings where id=v_id and specialist_id=v_spec) then raise exception 'forbidden'; end if;

  -- Estado final que tendría la oferta, para validar la agenda contra él.
  if v_id is null then
    v_kind    := coalesce(nullif(payload->>'kind','')::vpa_offering_type,'otro');
    v_booking := nullif(payload->>'booking_url','');
    v_status  := case when v_role='super_admin' then coalesce((payload->>'status')::vpa_pub_status,'published') else 'pending'::vpa_pub_status end;
  else
    select coalesce(nullif(payload->>'kind','')::vpa_offering_type, o.kind),
           case when payload ? 'booking_url' then nullif(payload->>'booking_url','') else o.booking_url end,
           case when v_role='super_admin' and payload ? 'status' then (payload->>'status')::vpa_pub_status else o.status end
      into v_kind, v_booking, v_status
      from app_vpa_offerings o where o.id = v_id;
  end if;

  -- Punto 6/8: sesión individual o grupal SIN enlace de agenda no se publica.
  if v_kind in ('sesion_individual','sesion_grupal')
     and coalesce(v_booking,'') = ''
     and v_status = 'published' then
    raise exception 'booking_required'
      using hint = 'Las sesiones individuales y grupales necesitan tu enlace de agenda (Calendly) para poder publicarse.';
  end if;

  if v_id is null then
    insert into app_vpa_offerings (specialist_id, kind, title, description, price_cents, currency,
      external_url, sell_via_voces, in_progress, wants_help, cover_url, preview_url, file_url, file_name,
      booking_url, booking_label, status_pill, status, sort_order)
    values (v_spec, v_kind, payload->>'title',
      payload->>'description', nullif(payload->>'price_cents','')::int, coalesce(payload->>'currency','MXN'),
      payload->>'external_url', coalesce((payload->>'sell_via_voces')::boolean,false),
      coalesce((payload->>'in_progress')::boolean,false), coalesce((payload->>'wants_help')::boolean,false),
      payload->>'cover_url', payload->>'preview_url', payload->>'file_url', payload->>'file_name',
      v_booking, nullif(payload->>'booking_label',''), nullif(payload->>'status_pill',''),
      v_status, coalesce((payload->>'sort_order')::int,0))
    returning id into v_id;
  else
    update app_vpa_offerings set
      specialist_id = coalesce(v_spec, specialist_id),
      kind = v_kind,
      title = coalesce(payload->>'title', title),
      description = payload->>'description',
      price_cents = nullif(payload->>'price_cents','')::int,
      currency = coalesce(payload->>'currency', currency),
      external_url = payload->>'external_url',
      sell_via_voces = coalesce((payload->>'sell_via_voces')::boolean, sell_via_voces),
      in_progress = coalesce((payload->>'in_progress')::boolean, in_progress),
      wants_help = coalesce((payload->>'wants_help')::boolean, wants_help),
      cover_url = payload->>'cover_url',
      preview_url = payload->>'preview_url',
      file_url = payload->>'file_url',
      file_name = payload->>'file_name',
      booking_url   = v_booking,
      booking_label = case when payload ? 'booking_label' then nullif(payload->>'booking_label','') else booking_label end,
      status_pill   = case when payload ? 'status_pill'   then nullif(payload->>'status_pill','')   else status_pill   end,
      status = v_status,
      sort_order = coalesce((payload->>'sort_order')::int, sort_order)
    where id = v_id;
  end if;
  perform vpa__audit('upsert','offering',v_id,payload);
  return v_id;
end; $$;

-- La voz también puede fijar la píldora por el camino de "proponer cambio".
create or replace function public.vpa__apply_changes(p_spec uuid, p_offering uuid, p_changes jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  spec_cols  text[] := array['name','role_es','role_en','bio_es','bio_en','certs_es','certs_en',
                             'photo_url','badge_url','raw_photo_url','contact_email','contact_phone','contact_web','category_id',
                             'available_now','sort_order'];
  spec_arrs  text[] := array['focus_es','focus_en','langs'];
  off_cols   text[] := array['kind','title','description','price_cents','currency','external_url',
                             'sell_via_voces','in_progress','cover_url','preview_url','file_url','file_name',
                             'booking_url','booking_label','status_pill','sort_order'];
  k text; sets text := '';
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 6.3.2 · DOBLE NOTIFICACIÓN
-- Calendly ya le avisa a la voz el día y la hora. Esto es el OTRO correo: le
-- confirma que el pago entró por Voces, con nombre del comprador y monto, para
-- que pueda conciliar reserva ↔ pago real (comisión y contabilidad).
-- Idempotente: no re-encola si ya se mandó para esa orden.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.vpa__queue_booking_sale_notices(p_order uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare g app_vpa_order_groups; r record;
begin
  select * into g from app_vpa_order_groups where id = p_order;
  if g.id is null then return; end if;

  for r in
    select s.id as spec_id, s.name as spec_name, s.contact_email,
           string_agg(distinct coalesce(i.title, o.title), ', ') as titles,
           sum(i.unit_cents * coalesce(i.qty,1)) as items_cents
      from app_vpa_order_items i
      join app_vpa_offerings o on o.id = i.item_id and i.item_type = 'offering'
      join app_vpa_specialists s on s.id = o.specialist_id
     where i.group_id = p_order
       and coalesce(o.booking_url,'') <> ''
     group by s.id, s.name, s.contact_email
  loop
    if coalesce(r.contact_email,'') <> ''
       and not exists (
         select 1 from app_vpa_email_outbox e
          where e.template = 'booking_paid'
            and e.payload->>'order_id' = p_order::text
            and e.payload->>'specialist_id' = r.spec_id::text
       ) then
      perform vpa__queue_email(r.contact_email, r.spec_name, 'booking_paid',
        jsonb_build_object(
          'order_id',      p_order,
          'specialist_id', r.spec_id,
          'buyer_name',    coalesce(g.buyer_name,''),
          'buyer_email',   coalesce(g.buyer_email,''),
          'titles',        coalesce(r.titles,''),
          'amount_cents',  coalesce(r.items_cents, 0)
        ));
    end if;
  end loop;
end $$;

revoke execute on function public.vpa__queue_booking_sale_notices(uuid) from public, anon, authenticated;

-- Enganchado en los DOS caminos que marcan una orden como pagada.
create or replace function public.vpa__order_paid_by_system(p_order uuid, p_payment_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare g app_vpa_order_groups;
begin
  select * into g from app_vpa_order_groups where id=p_order for update;
  if g.id is null then return; end if;
  if g.status='paid' or g.status='fulfilled' then return; end if;
  update app_vpa_order_groups set status='paid', mp_payment_id=p_payment_id, payment_ref=p_payment_id where id=p_order;
  perform vpa__award_points(g.buyer_fbid, (g.total_cents/10000)*vpa__points_rule('order_paid_per_100mxn'), 'order_paid', jsonb_build_object('order',p_order));
  perform vpa__queue_email(g.buyer_email, g.buyer_name, 'order_paid', jsonb_build_object('order_id',p_order,'total_cents',g.total_cents));
  perform vpa__notify(s.fbid_user, s.id, null, 'sale', 'Tienes una venta en Voces',
      'Pedido '||left(p_order::text,8)||' pagado — tu parte según tu acuerdo se registró en tu perfil.')
  from (select distinct oi.specialist_id from app_vpa_order_items oi where oi.group_id=p_order and oi.specialist_id is not null) x
  join app_vpa_specialists s on s.id=x.specialist_id where s.fbid_user is not null;
  perform vpa__queue_booking_sale_notices(p_order);
  perform vpa__audit('order_paid_mp','order',p_order, jsonb_build_object('payment',p_payment_id));
end $$;

create or replace function public.vpa_set_order_status(p_id uuid, p_status text, p_payment_ref text default null::text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare g app_vpa_order_groups;
begin
  perform vpa_require(auth.uid(), 'super_admin');
  if p_status not in ('awaiting_payment','awaiting_review','paid','fulfilled','canceled','refunded')
    then raise exception 'bad status'; end if;
  select * into g from app_vpa_order_groups where id = p_id for update;
  if g.id is null then raise exception 'not found'; end if;
  update app_vpa_order_groups set status = p_status, payment_ref = coalesce(p_payment_ref, payment_ref) where id = p_id;
  if p_status = 'paid' and g.status <> 'paid' then
    perform vpa__award_points(g.buyer_fbid, (g.total_cents / 10000) * vpa__points_rule('order_paid_per_100mxn'),
      'order_paid', jsonb_build_object('order', p_id));
    perform vpa__queue_email(g.buyer_email, g.buyer_name, 'order_paid',
      jsonb_build_object('order_id', p_id, 'total_cents', g.total_cents));
    perform vpa__notify(s.fbid_user, s.id, null, 'sale', 'Tienes una venta en Voces',
        'Pedido ' || left(p_id::text,8) || ' pagado — tu parte se calcula segun su membresia.')
    from (select distinct oi.specialist_id from app_vpa_order_items oi where oi.group_id = p_id and oi.specialist_id is not null) x
    join app_vpa_specialists s on s.id = x.specialist_id where s.fbid_user is not null;
    perform vpa__queue_booking_sale_notices(p_id);
  end if;
  perform vpa__audit('set_order_status','order',p_id, jsonb_build_object('status',p_status));
end $$;
