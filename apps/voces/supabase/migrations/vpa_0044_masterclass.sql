-- ============================================================================
-- vpa_0044 · Documento de Mónica del 5-ago-2026 (3 temas)
--
--  TEMA 1 · Masterclass: tipo de oferta nuevo, sólo para membresía Pro, siempre
--           gratuita, que promociona un producto YA publicado de la misma voz,
--           con enlace de reunión (ahora o después), inscripción por correo,
--           avisos a la persona y a la voz, y estadística de inscritos.
--           La estadística de asistentes se extiende también a las conferencias
--           de pago (quien compró queda en la misma lista).
--  TEMA 2 · Se elimina el precio "a convenir": toda oferta lleva precio fijo.
--  TEMA 3 · "Nota importante": recuadro destacado, aparte de la descripción.
--
-- Depende de vpa_0043_masterclass_enum.sql (el valor 'masterclass' del enum).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1 · Columnas nuevas de la oferta
-- ---------------------------------------------------------------------------
alter table public.app_vpa_offerings
  add column if not exists promotes_offering_id uuid references public.app_vpa_offerings(id) on delete set null,
  add column if not exists meeting_url          text,
  add column if not exists meeting_link_later   boolean not null default false,
  add column if not exists note_important       text;

comment on column public.app_vpa_offerings.promotes_offering_id is
  'Masterclass: el producto publicado de la misma voz que se promociona. Obligatorio en kind=masterclass.';
comment on column public.app_vpa_offerings.meeting_url is
  'Masterclass: enlace de la reunión virtual. Nunca sale en la vista pública: sólo lo recibe quien se inscribe.';
comment on column public.app_vpa_offerings.meeting_link_later is
  'Masterclass: la voz eligió mandar el enlace después, a los ya inscritos.';
comment on column public.app_vpa_offerings.note_important is
  'Nota importante de la oferta: se muestra en un recuadro destacado y en negritas, aparte de la descripción.';

-- ---------------------------------------------------------------------------
-- 2 · Inscripciones (masterclass gratuita)
--     RLS deny-all: se lee y escribe SÓLO por los RPC de abajo.
-- ---------------------------------------------------------------------------
create table if not exists public.app_vpa_enrollments (
  id            uuid primary key default gen_random_uuid(),
  offering_id   uuid not null references public.app_vpa_offerings(id)   on delete cascade,
  specialist_id uuid not null references public.app_vpa_specialists(id) on delete cascade,
  email         text not null,
  name          text,
  member        uuid,
  source        text not null default 'masterclass',
  link_sent_at  timestamptz,
  created_at    timestamptz not null default now()
);
create unique index if not exists app_vpa_enrollments_uq
  on public.app_vpa_enrollments (offering_id, lower(email));
create index if not exists app_vpa_enrollments_spec_idx
  on public.app_vpa_enrollments (specialist_id, created_at desc);

alter table public.app_vpa_enrollments enable row level security;
revoke all on public.app_vpa_enrollments from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3 · vpa_upsert_offering — reglas de Masterclass + precio obligatorio
-- ---------------------------------------------------------------------------
create or replace function public.vpa_upsert_offering(payload jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_role vpa_role := vpa_role_of(auth.uid());
        v_id uuid := nullif(payload->>'id','')::uuid; v_spec uuid := nullif(payload->>'specialist_id','')::uuid;
        v_kind vpa_offering_type; v_booking text; v_status vpa_pub_status; v_sell boolean;
        v_owner uuid; v_promo uuid; v_price int; v_mc boolean;
        v_meet text; v_later boolean; v_file text; v_fname text;
begin
  if v_role not in ('specialist','super_admin') then raise exception 'forbidden'; end if;
  if v_role = 'specialist' then
    select id into v_spec from app_vpa_specialists where fbid_user = v_uid limit 1;
    if v_spec is null then raise exception 'no specialist profile'; end if;
  end if;
  if v_id is not null and v_role = 'specialist'
     and not exists (select 1 from app_vpa_offerings where id=v_id and specialist_id=v_spec) then raise exception 'forbidden'; end if;

  if v_id is null then
    v_kind    := coalesce(nullif(payload->>'kind','')::vpa_offering_type,'otro');
    v_booking := nullif(payload->>'booking_url','');
    v_status  := case when v_role='super_admin' then coalesce((payload->>'status')::vpa_pub_status,'published') else 'pending'::vpa_pub_status end;
    v_sell    := coalesce((payload->>'sell_via_voces')::boolean,false);
    v_price   := nullif(payload->>'price_cents','')::int;
    v_promo   := nullif(payload->>'promotes_offering_id','')::uuid;
    v_meet    := nullif(payload->>'meeting_url','');
    v_later   := coalesce((payload->>'meeting_link_later')::boolean,false);
    v_file    := payload->>'file_url';
    v_fname   := payload->>'file_name';
    v_owner   := v_spec;
  else
    select coalesce(nullif(payload->>'kind','')::vpa_offering_type, o.kind),
           case when payload ? 'booking_url' then nullif(payload->>'booking_url','') else o.booking_url end,
           case when v_role='super_admin' and payload ? 'status' then (payload->>'status')::vpa_pub_status else o.status end,
           coalesce((payload->>'sell_via_voces')::boolean, o.sell_via_voces),
           case when payload ? 'price_cents'          then nullif(payload->>'price_cents','')::int          else o.price_cents end,
           case when payload ? 'promotes_offering_id' then nullif(payload->>'promotes_offering_id','')::uuid else o.promotes_offering_id end,
           case when payload ? 'meeting_url'          then nullif(payload->>'meeting_url','')                else o.meeting_url end,
           case when payload ? 'meeting_link_later'   then coalesce((payload->>'meeting_link_later')::boolean,false) else o.meeting_link_later end,
           case when payload ? 'file_url'  then payload->>'file_url'  else o.file_url  end,
           case when payload ? 'file_name' then payload->>'file_name' else o.file_name end,
           coalesce(v_spec, o.specialist_id)
      into v_kind, v_booking, v_status, v_sell, v_price, v_promo, v_meet, v_later, v_file, v_fname, v_owner
      from app_vpa_offerings o where o.id = v_id;
  end if;

  v_mc := (v_kind = 'masterclass');

  /* ---- TEMA 1 · Masterclass ---------------------------------------------
     Sólo Pro. Siempre gratuita. Siempre promociona un producto que la voz ya
     tiene publicado y aprobado — sin ese producto, no hay Masterclass que
     publicar. No lleva precio, ni archivo descargable, ni enlace de agenda:
     es un evento en vivo, no un producto de pago.
     super_admin queda fuera del filtro de membresía a propósito: Mónica ES la
     compuerta de aprobación y necesita poder corregir cualquier perfil.      */
  if v_mc then
    if v_role = 'specialist' and not exists (
        select 1 from app_vpa_subscriptions s
         where s.specialist_id = v_owner and s.status = 'active' and s.plan_id = 'pro')
    then raise exception 'masterclass_requires_pro'
      using hint = 'No puedes crear este tipo de oferta en la membresia que tienes.'; end if;

    if v_promo is null or not exists (
        select 1 from app_vpa_offerings p
         where p.id = v_promo and p.specialist_id = v_owner
           and p.status = 'published' and p.kind <> 'masterclass')
    then raise exception 'masterclass_needs_product'
      using hint = 'Elige el producto que estas promocionando: tiene que ser una oferta tuya ya publicada y aprobada.'; end if;

    if coalesce(v_meet,'') <> '' and v_meet !~* '^https?://' then
      raise exception 'meeting_url_invalid'
        using hint = 'El enlace de la reunion debe empezar con https://'; end if;

    v_price := 0; v_sell := false; v_booking := null; v_file := null; v_fname := null;
    if coalesce(v_meet,'') <> '' then v_later := false; end if;
  else
    v_promo := null; v_meet := null; v_later := false;
    /* ---- TEMA 2 · se elimina el precio "a convenir" --------------------
       Voces sólo publica lo que se puede comprar con un precio claro. Quien
       necesite cotizar un proyecto a medida publica una "Sesión individual"
       con el costo de esa primera sesión de diagnóstico.                   */
    if v_price is null then
      raise exception 'price_required'
        using hint = 'Escribe el precio de tu oferta. Si tu servicio necesita cotizarse, publica una «Sesion individual» con el costo de esa primera sesion de diagnostico.';
    end if;
  end if;

  if v_kind in ('sesion_individual','sesion_grupal') and coalesce(v_booking,'') = '' and v_status = 'published' then
    raise exception 'booking_required'
      using hint = 'Las sesiones individuales y grupales necesitan tu enlace de agenda (Calendly) para poder publicarse.';
  end if;

  if v_role = 'specialist' and v_sell then
    if not exists (select 1 from app_vpa_commission_terms t
                    where t.specialist_id = v_owner
                      and t.commission_pct = vpa__commission_pct(v_owner)) then
      raise exception 'commission_terms_required'
        using hint = 'Falta aceptar la comision vigente de Voces para poder vender en la plataforma.';
    end if;
  end if;

  if v_id is null then
    insert into app_vpa_offerings (specialist_id, kind, title, description, price_cents, currency,
      external_url, sell_via_voces, in_progress, wants_help, cover_url, preview_url, file_url, file_name,
      booking_url, booking_label, status_pill, status, sort_order, event_at, event_ends_at, event_location,
      promotes_offering_id, meeting_url, meeting_link_later, note_important)
    values (v_spec, v_kind, payload->>'title', payload->>'description',
      v_price, coalesce(payload->>'currency','MXN'),
      payload->>'external_url', v_sell,
      coalesce((payload->>'in_progress')::boolean,false), coalesce((payload->>'wants_help')::boolean,false),
      payload->>'cover_url', payload->>'preview_url', v_file, v_fname,
      v_booking, nullif(payload->>'booking_label',''), nullif(payload->>'status_pill',''),
      v_status, coalesce((payload->>'sort_order')::int,0),
      nullif(payload->>'event_at','')::timestamptz, nullif(payload->>'event_ends_at','')::timestamptz,
      nullif(payload->>'event_location',''),
      v_promo, v_meet, v_later, nullif(payload->>'note_important',''))
    returning id into v_id;
  else
    update app_vpa_offerings set
      specialist_id = coalesce(v_spec, specialist_id),
      kind = v_kind,
      title = coalesce(payload->>'title', title),
      description = payload->>'description',
      price_cents = v_price,
      currency = coalesce(payload->>'currency', currency),
      external_url = payload->>'external_url',
      sell_via_voces = v_sell,
      in_progress = coalesce((payload->>'in_progress')::boolean, in_progress),
      wants_help = coalesce((payload->>'wants_help')::boolean, wants_help),
      cover_url = payload->>'cover_url',
      preview_url = payload->>'preview_url',
      file_url = v_file,
      file_name = v_fname,
      booking_url   = v_booking,
      booking_label = case when payload ? 'booking_label' then nullif(payload->>'booking_label','') else booking_label end,
      status_pill   = case when payload ? 'status_pill'   then nullif(payload->>'status_pill','')   else status_pill   end,
      event_at       = case when payload ? 'event_at'       then nullif(payload->>'event_at','')::timestamptz      else event_at end,
      event_ends_at  = case when payload ? 'event_ends_at'  then nullif(payload->>'event_ends_at','')::timestamptz else event_ends_at end,
      event_location = case when payload ? 'event_location' then nullif(payload->>'event_location','')            else event_location end,
      promotes_offering_id = v_promo,
      meeting_url          = v_meet,
      meeting_link_later   = v_later,
      note_important = case when payload ? 'note_important' then nullif(payload->>'note_important','') else note_important end,
      status = v_status,
      sort_order = coalesce((payload->>'sort_order')::int, sort_order)
    where id = v_id;
  end if;
  perform vpa__audit('upsert','offering',v_id,payload);
  return v_id;
end $function$;

-- ---------------------------------------------------------------------------
-- 4 · vpa__apply_changes — las columnas nuevas viajan por el carril de
--     moderación igual que el resto (nada se publica sin Mónica).
-- ---------------------------------------------------------------------------
create or replace function public.vpa__apply_changes(p_spec uuid, p_offering uuid, p_changes jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  spec_cols  text[] := array['name','role_es','role_en','bio_es','bio_en','certs_es','certs_en',
                             'photo_url','badge_url','raw_photo_url','contact_email','contact_phone','contact_web','category_id',
                             'available_now','sort_order','country'];
  spec_arrs  text[] := array['focus_es','focus_en','langs'];
  off_cols   text[] := array['kind','title','description','price_cents','currency','external_url',
                             'sell_via_voces','in_progress','cover_url','preview_url','file_url','file_name',
                             'booking_url','booking_label','status_pill','sort_order',
                             'event_at','event_ends_at','event_location',
                             'promotes_offering_id','meeting_url','meeting_link_later','note_important'];
  k text; sets text := ''; v_cats uuid[];
begin
  if p_changes is null or p_changes = '{}'::jsonb then return; end if;
  if p_offering is not null then
    for k in select jsonb_object_keys(p_changes) loop
      if k = any(off_cols) then
        sets := sets || format('%I = (%L)::%s,', k,
          case when k in ('event_at','event_ends_at','promotes_offering_id') then nullif(p_changes->>k,'') else p_changes->>k end,
          case k when 'price_cents' then 'int' when 'sort_order' then 'int'
                 when 'sell_via_voces' then 'boolean' when 'in_progress' then 'boolean'
                 when 'meeting_link_later' then 'boolean'
                 when 'promotes_offering_id' then 'uuid'
                 when 'kind' then 'vpa_offering_type'
                 when 'event_at' then 'timestamptz' when 'event_ends_at' then 'timestamptz'
                 else 'text' end);
      end if;
    end loop;
    if sets <> '' then
      execute 'update app_vpa_offerings set ' || left(sets, length(sets)-1) || ' where id = $1' using p_offering;
    end if;
  else
    -- temáticas múltiples: se aplican primero para que category_id quede sincronizado
    if p_changes ? 'category_ids' and jsonb_typeof(p_changes->'category_ids') = 'array' then
      select array_agg((x)::uuid) into v_cats
        from jsonb_array_elements_text(p_changes->'category_ids') t(x)
       where x ~ '^[0-9a-fA-F-]{36}$';
      if coalesce(array_length(v_cats,1),0) > 0 then
        perform vpa__set_spec_cats(p_spec, v_cats,
          nullif(p_changes->>'category_primary','')::uuid);
      end if;
    end if;
    for k in select jsonb_object_keys(p_changes) loop
      if k = any(spec_cols) then
        sets := sets || format('%I = (%L)::%s,', k, p_changes->>k,
          case k when 'category_id' then 'uuid' when 'available_now' then 'boolean'
                 when 'sort_order' then 'int' else 'text' end);
      elsif k = any(spec_arrs) then
        sets := sets || format('%I = (select coalesce(array_agg(x),''{}'') from jsonb_array_elements_text(%L::jsonb) t(x)),', k, p_changes->k);
      elsif k = 'modalities' then
        sets := sets || format('modalities = (select coalesce(array_agg(x::vpa_modality),''{online}'') from jsonb_array_elements_text(%L::jsonb) t(x)),', p_changes->k);
      elsif k = 'contact_socials' then
        sets := sets || format('contact_socials = coalesce(contact_socials,''{}''::jsonb) || (%L::jsonb),', p_changes->k);
      end if;
    end loop;
    if sets <> '' then
      execute 'update app_vpa_specialists set ' || left(sets, length(sets)-1) || ' where id = $1' using p_spec;
    end if;
  end if;
end $function$;

-- ---------------------------------------------------------------------------
-- 5 · Vista pública — el enlace de la reunión NUNCA sale aquí.
--     (Las columnas nuevas van al FINAL: CREATE OR REPLACE no reordena.)
-- ---------------------------------------------------------------------------
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
            WHEN (COALESCE(o.price_cents, 0) = 0 AND o.kind <> 'masterclass'::vpa_offering_type) THEN o.file_url
            ELSE NULL::text
        END AS file_url,
        CASE
            WHEN (COALESCE(o.price_cents, 0) = 0 AND o.kind <> 'masterclass'::vpa_offering_type) THEN o.file_name
            ELSE NULL::text
        END AS file_name,
    o.slug,
    o.status_pill,
    (COALESCE(o.booking_url, ''::text) <> ''::text) AS has_booking,
    o.event_at,
    o.event_ends_at,
    o.event_location,
    o.promotes_offering_id,
    o.note_important,
    (COALESCE(o.meeting_url, ''::text) <> ''::text) AS has_meeting
   FROM (app_vpa_offerings o
     JOIN app_vpa_specialists s ON ((s.id = o.specialist_id)))
  WHERE ((o.status = 'published'::vpa_pub_status) AND (s.status = ANY (ARRAY['published'::vpa_spec_status, 'verified'::vpa_spec_status])));

grant select on public.app_vpa_offerings_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6 · Inscripción a una Masterclass (público, sin login)
-- ---------------------------------------------------------------------------
create or replace function public.vpa_enroll_masterclass(p_offering uuid, p_email text, p_name text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare o app_vpa_offerings; s app_vpa_specialists;
        v_email text; v_name text; v_already boolean; v_count int;
begin
  v_email := lower(btrim(coalesce(p_email,'')));
  v_name  := nullif(btrim(coalesce(p_name,'')),'');
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'bad_email' using hint = 'Escribe un correo valido para recibir tu confirmacion.';
  end if;

  select * into o from app_vpa_offerings where id = p_offering;
  if o.id is null or o.kind <> 'masterclass' or o.status <> 'published' then
    raise exception 'not_available' using hint = 'Esta Masterclass ya no esta disponible.';
  end if;
  select * into s from app_vpa_specialists where id = o.specialist_id;
  if s.status not in ('published','verified') then
    raise exception 'not_available' using hint = 'Esta Masterclass ya no esta disponible.';
  end if;

  -- freno anti-abuso: un mismo correo no puede inscribirse a media plataforma
  if (select count(*) from app_vpa_enrollments
       where lower(email) = v_email and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'rate_limited' using hint = 'Demasiadas inscripciones seguidas. Intenta de nuevo en unos minutos.';
  end if;

  v_already := exists (select 1 from app_vpa_enrollments
                        where offering_id = o.id and lower(email) = v_email);

  insert into app_vpa_enrollments (offering_id, specialist_id, email, name, member, source)
  values (o.id, o.specialist_id, v_email, v_name, auth.uid(), 'masterclass')
  on conflict (offering_id, lower(email)) do update
    set name = coalesce(excluded.name, app_vpa_enrollments.name);

  select count(*) into v_count from app_vpa_enrollments where offering_id = o.id;

  if not v_already then
    -- confirmación a quien se inscribe
    perform vpa__queue_email(v_email, v_name, 'masterclass_signup', jsonb_build_object(
      'offering_id', o.id, 'title', o.title, 'specialist_name', s.name, 'slug', s.slug,
      'event_at', o.event_at, 'event_location', o.event_location,
      'meeting_url', coalesce(o.meeting_url,''), 'link_later', o.meeting_link_later));

    -- aviso a la voz: cada inscripción, para que pueda dar seguimiento
    if coalesce(s.contact_email,'') <> '' then
      perform vpa__queue_email(s.contact_email, s.name, 'masterclass_signup_specialist', jsonb_build_object(
        'offering_id', o.id, 'title', o.title,
        'attendee_name', coalesce(v_name,''), 'attendee_email', v_email,
        'total', v_count, 'event_at', o.event_at));
    end if;
    perform vpa__notify(s.fbid_user, s.id, null, 'enrollment',
      'Nueva inscripcion a tu Masterclass',
      coalesce(v_name, v_email) || ' se inscribio a «' || o.title || '». Ya van ' || v_count || '.');
  end if;

  return jsonb_build_object('ok', true, 'already', v_already, 'total', v_count,
    'title', o.title, 'event_at', o.event_at, 'link_later', o.meeting_link_later,
    'meeting_url', coalesce(o.meeting_url,''));
end $function$;

-- ---------------------------------------------------------------------------
-- 7 · Lista de asistentes — Masterclass gratuitas Y conferencias de pago.
--     La ve la dueña del perfil o Mónica; nadie más.
-- ---------------------------------------------------------------------------
create or replace function public.vpa_offering_attendees(p_offering uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare v_role vpa_role := vpa_role_of(auth.uid()); o app_vpa_offerings; v_rows jsonb;
begin
  select * into o from app_vpa_offerings where id = p_offering;
  if o.id is null then raise exception 'not_found'; end if;
  if v_role <> 'super_admin' and not exists (
      select 1 from app_vpa_specialists s
       where s.id = o.specialist_id and s.fbid_user = auth.uid())
  then raise exception 'forbidden'; end if;

  select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) into v_rows from (
    select jsonb_build_object('name', coalesce(e.name,''), 'email', e.email,
             'at', e.created_at, 'source', 'inscripcion', 'paid', false,
             'link_sent_at', e.link_sent_at) as x
      from app_vpa_enrollments e where e.offering_id = o.id
    union all
    -- quien compró una conferencia (o cualquier oferta de pago) también es asistente
    select jsonb_build_object('name', coalesce(g.buyer_name,''), 'email', coalesce(g.buyer_email,''),
             'at', g.created_at, 'source', 'compra', 'paid', true,
             'link_sent_at', null) as x
      from app_vpa_order_items i
      join app_vpa_order_groups g on g.id = i.group_id
     where i.item_type = 'offering' and i.item_id = o.id
       and g.status in ('paid','fulfilled') and coalesce(g.is_test,false) = false
       and coalesce(g.buyer_email,'') <> ''
  ) t;

  return jsonb_build_object('ok', true,
    'offering', jsonb_build_object('id', o.id, 'title', o.title, 'kind', o.kind,
      'event_at', o.event_at, 'meeting_url', coalesce(o.meeting_url,''),
      'meeting_link_later', o.meeting_link_later),
    'count', jsonb_array_length(v_rows),
    'attendees', v_rows);
end $function$;

-- ---------------------------------------------------------------------------
-- 8 · Enviar el enlace de la reunión a quienes ya se inscribieron
-- ---------------------------------------------------------------------------
create or replace function public.vpa_send_meeting_link(p_offering uuid, p_url text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_role vpa_role := vpa_role_of(auth.uid()); o app_vpa_offerings; s app_vpa_specialists;
        v_url text; v_changed boolean; r record; v_sent int := 0;
begin
  v_url := btrim(coalesce(p_url,''));
  if v_url !~* '^https?://' then
    raise exception 'meeting_url_invalid' using hint = 'El enlace de la reunion debe empezar con https://';
  end if;
  select * into o from app_vpa_offerings where id = p_offering;
  if o.id is null or o.kind <> 'masterclass' then raise exception 'not_found'; end if;
  if v_role <> 'super_admin' and not exists (
      select 1 from app_vpa_specialists x
       where x.id = o.specialist_id and x.fbid_user = auth.uid())
  then raise exception 'forbidden'; end if;
  select * into s from app_vpa_specialists where id = o.specialist_id;

  v_changed := coalesce(o.meeting_url,'') <> v_url;
  update app_vpa_offerings
     set meeting_url = v_url, meeting_link_later = false
   where id = o.id;
  -- si el enlace cambió, todos lo tienen que volver a recibir
  if v_changed then
    update app_vpa_enrollments set link_sent_at = null where offering_id = o.id;
  end if;

  for r in select * from app_vpa_enrollments where offering_id = o.id and link_sent_at is null loop
    perform vpa__queue_email(r.email, r.name, 'masterclass_link', jsonb_build_object(
      'offering_id', o.id, 'title', o.title, 'specialist_name', s.name,
      'event_at', o.event_at, 'meeting_url', v_url));
    update app_vpa_enrollments set link_sent_at = now() where id = r.id;
    v_sent := v_sent + 1;
  end loop;

  perform vpa__audit('meeting_link','offering',o.id, jsonb_build_object('sent', v_sent));
  return jsonb_build_object('ok', true, 'sent', v_sent);
end $function$;

-- ---------------------------------------------------------------------------
-- 9 · Permisos
-- ---------------------------------------------------------------------------
revoke all on function public.vpa_enroll_masterclass(uuid, text, text) from public;
grant  execute on function public.vpa_enroll_masterclass(uuid, text, text) to anon, authenticated;

revoke all on function public.vpa_offering_attendees(uuid) from public, anon;
grant  execute on function public.vpa_offering_attendees(uuid) to authenticated;

revoke all on function public.vpa_send_meeting_link(uuid, text) from public, anon;
grant  execute on function public.vpa_send_meeting_link(uuid, text) to authenticated;
