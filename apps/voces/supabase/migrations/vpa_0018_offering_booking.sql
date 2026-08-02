-- ============================================================================
-- vpa_0018_offering_booking — agenda (Calendly u otro) por OFERTA
-- ----------------------------------------------------------------------------
-- Cada oferta puede llevar su propio enlace de agendado. Nace para la sesión
-- 1:1 de Mónica y para la sesión gratuita que regala el ebook "Más Allá del
-- Dolor", pero es un campo normal: cualquier voz puede poner el suyo desde
-- /mi-voz o desde el panel admin. Nada hardcodeado.
--
-- El enlace es PRIVADO a propósito: NO sale en app_vpa_offerings_public.
-- Sólo se entrega a quien ya pagó, vía vpa_order_booking(orden, correo).
-- Si viviera en la vista pública, cualquiera agendaría la sesión sin pagarla.
-- ============================================================================

alter table app_vpa_offerings add column if not exists booking_url   text;
alter table app_vpa_offerings add column if not exists booking_label text;

comment on column app_vpa_offerings.booking_url is
  'Enlace de agendado (Calendly u otro) que se muestra al comprador tras el pago. Privado: nunca en la vista pública.';
comment on column app_vpa_offerings.booking_label is
  'Leyenda opcional del botón de agenda. Vacío = leyenda por defecto del sitio.';

-- ---------------------------------------------------------------------------
-- 1) La voz y el admin pueden guardar el enlace (vpa_upsert_offering)
--    (misma función de 0005 + preview/file/booking; se reescribe completa)
-- ---------------------------------------------------------------------------
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
      external_url, sell_via_voces, in_progress, wants_help, cover_url, preview_url, file_url, file_name,
      booking_url, booking_label, status, sort_order)
    values (v_spec, coalesce(nullif(payload->>'kind','')::vpa_offering_type,'otro'), payload->>'title',
      payload->>'description', nullif(payload->>'price_cents','')::int, coalesce(payload->>'currency','MXN'),
      payload->>'external_url', coalesce((payload->>'sell_via_voces')::boolean,false),
      coalesce((payload->>'in_progress')::boolean,false), coalesce((payload->>'wants_help')::boolean,false),
      payload->>'cover_url', payload->>'preview_url', payload->>'file_url', payload->>'file_name',
      nullif(payload->>'booking_url',''), nullif(payload->>'booking_label',''),
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
      preview_url = payload->>'preview_url',
      file_url = payload->>'file_url',
      file_name = payload->>'file_name',
      -- sólo se toca si viene en el payload: así los formularios viejos no borran la agenda
      booking_url   = case when payload ? 'booking_url'   then nullif(payload->>'booking_url','')   else booking_url   end,
      booking_label = case when payload ? 'booking_label' then nullif(payload->>'booking_label','') else booking_label end,
      status = case when v_role='super_admin' and payload ? 'status' then (payload->>'status')::vpa_pub_status else status end,
      sort_order = coalesce((payload->>'sort_order')::int, sort_order)
    where id = v_id;
  end if;
  perform vpa__audit('upsert','offering',v_id,payload);
  return v_id;
end; $$;

revoke execute on function vpa_upsert_offering(jsonb) from public, anon;
grant  execute on function vpa_upsert_offering(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Lista blanca de columnas editables por "solicitud de cambio"
-- ---------------------------------------------------------------------------
create or replace function vpa__apply_changes(p_spec uuid, p_offering uuid, p_changes jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  spec_cols  text[] := array['name','role_es','role_en','bio_es','bio_en','certs_es','certs_en',
                             'photo_url','badge_url','raw_photo_url','contact_email','contact_phone','contact_web','category_id',
                             'available_now','sort_order'];
  spec_arrs  text[] := array['focus_es','focus_en','langs'];
  off_cols   text[] := array['kind','title','description','price_cents','currency','external_url',
                             'sell_via_voces','in_progress','cover_url','preview_url','file_url','file_name',
                             'booking_url','booking_label','sort_order'];
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

-- ---------------------------------------------------------------------------
-- 3) Entrega del enlace al comprador — misma puerta que vpa-descarga:
--    orden pagada + correo que coincide. Sin eso, no devuelve nada.
-- ---------------------------------------------------------------------------
create or replace function vpa_order_booking(p_order uuid, p_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ok boolean; v_items jsonb;
begin
  if p_order is null or coalesce(trim(p_email),'') = '' then
    return jsonb_build_object('ok', false, 'items', '[]'::jsonb);
  end if;

  select true into v_ok
    from app_vpa_order_groups g
   where g.id = p_order
     and g.status in ('paid','fulfilled')
     and lower(trim(coalesce(g.buyer_email,''))) = lower(trim(p_email))
   limit 1;

  if not coalesce(v_ok, false) then
    return jsonb_build_object('ok', false, 'items', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'offering_id', x.id, 'title', x.title, 'url', x.booking_url, 'label', x.booking_label)), '[]'::jsonb)
    into v_items
    from (
      select distinct o.id, coalesce(i.title, o.title) as title, o.booking_url, o.booking_label
        from app_vpa_order_items i
        join app_vpa_offerings o on o.id = i.item_id and i.item_type = 'offering'
       where i.group_id = p_order
         and coalesce(o.booking_url,'') <> ''
    ) x;

  return jsonb_build_object('ok', true, 'items', v_items);
end $$;

grant execute on function vpa_order_booking(uuid, text) to anon, authenticated;
