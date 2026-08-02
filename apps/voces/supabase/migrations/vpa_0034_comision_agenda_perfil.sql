-- ============================================================================
-- vpa_0034 — Comisión por especialista + aceptación · Agenda pública por oferta
--            · País y LinkedIn en el alta
-- Documento de Mónica "Ajustes para desarrollo · 1-ago-2026" (temas 2, 3 y 4).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TEMA 2.1 — Comisión configurable POR ESPECIALISTA (default 20%)
-- Antes vivía sólo en app_vpa_deals (histórico) y había TRES defaults distintos
-- (50 en el split del checkout, 15 en el de MercadoPago, el del plan en medio).
-- Ahora hay UNA fuente de verdad: la columna del especialista → plan → ajuste
-- global → 20. Los deals se conservan como historial firmado.
-- ---------------------------------------------------------------------------
alter table app_vpa_specialists add column if not exists commission_pct int;
alter table app_vpa_specialists drop constraint if exists app_vpa_specialists_commission_pct_chk;
alter table app_vpa_specialists add constraint app_vpa_specialists_commission_pct_chk
  check (commission_pct is null or (commission_pct between 0 and 100));

comment on column app_vpa_specialists.commission_pct is
  'Comisión que retiene Voces en las ventas de esta voz. NULL = usa el plan o el default global (20%).';

-- Backfill: lo ya negociado (Mónica 10%, etc.) NO cambia de comportamiento.
update app_vpa_specialists s
   set commission_pct = d.pct
  from (select distinct on (specialist_id)
               specialist_id, 100 - specialist_pct as pct
          from app_vpa_deals
         where status = 'agreed'
         order by specialist_id, coalesce(agreed_at, created_at) desc) d
 where d.specialist_id = s.id and s.commission_pct is null;

-- Default editable por Mónica sin tocar código.
insert into app_vpa_settings(key, value) values ('default_commission_pct', '20'::jsonb)
on conflict (key) do nothing;

create or replace function public.vpa__commission_pct(p_spec uuid)
returns integer language sql stable security definer set search_path to 'public' as $$
  select coalesce(
    -- 1) lo que Mónica fijó para esta voz
    (select s.commission_pct from app_vpa_specialists s where s.id = p_spec),
    -- 2) la comisión de su plan de membresía vigente
    (select p.commission_pct
       from app_vpa_subscriptions sub
       join app_vpa_plans p on p.id = sub.plan_id
      where sub.specialist_id = p_spec and sub.status = 'active'
        and (sub.current_period_end is null or sub.current_period_end > now())
      order by sub.created_at desc limit 1),
    -- 3) el default global configurable
    (select (value #>> '{}')::int from app_vpa_settings where key = 'default_commission_pct'),
    -- 4) el default del documento
    20)
$$;

create or replace function public.vpa__specialist_share_pct(p_spec uuid)
returns integer language sql stable security definer set search_path to 'public' as $$
  select 100 - vpa__commission_pct(p_spec)
$$;

create or replace function public.vpa_mp_commission_pct(p_specialist uuid)
returns numeric language sql stable security definer set search_path to 'public' as $$
  select vpa__commission_pct(p_specialist)::numeric
$$;

-- El panel sigue mostrando "asignada" vs "sin asignar" (= hereda el default).
create or replace function public.vpa_mp_commissions()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare r jsonb;
begin
  perform vpa_require(auth.uid(),'super_admin');
  select coalesce(jsonb_object_agg(id, commission_pct), '{}'::jsonb) into r
    from app_vpa_specialists where commission_pct is not null;
  return r;
end $$;

-- Guarda en la columna (fuente de verdad) y deja el trato firmado como historial.
create or replace function public.vpa_mp_set_commission(p_specialist uuid, p_commission_pct integer)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  perform vpa_require(auth.uid(),'super_admin');
  if p_commission_pct is null or p_commission_pct < 0 or p_commission_pct > 100 then
    raise exception 'commission 0-100';
  end if;
  update app_vpa_specialists set commission_pct = p_commission_pct, updated_at = now()
   where id = p_specialist;
  update app_vpa_deals set status = 'superseded'
   where specialist_id = p_specialist and status = 'agreed';
  insert into app_vpa_deals(specialist_id, specialist_pct, status, proposed_by, agreed_by, agreed_at, created_at)
  values (p_specialist, 100 - p_commission_pct, 'agreed', auth.uid(), auth.uid(), now(), now());
  perform vpa__audit('set_commission','specialist',p_specialist,
                     jsonb_build_object('commission_pct',p_commission_pct));
end $$;

-- ---------------------------------------------------------------------------
-- TEMA 2.3 — Aceptación explícita de la comisión (respaldo formal)
-- Append-only: queda quién aceptó, cuándo y bajo qué porcentaje.
-- ---------------------------------------------------------------------------
create table if not exists public.app_vpa_commission_terms (
  id             uuid primary key default gen_random_uuid(),
  specialist_id  uuid not null references app_vpa_specialists(id) on delete no action,
  fbid_user      uuid,
  commission_pct int  not null check (commission_pct between 0 and 100),
  source         text,
  accepted_at    timestamptz not null default now()
);
create index if not exists app_vpa_commission_terms_spec_idx
  on app_vpa_commission_terms(specialist_id, accepted_at desc);

alter table public.app_vpa_commission_terms enable row level security;
revoke all on public.app_vpa_commission_terms from anon, authenticated;

drop rule if exists app_vpa_commission_terms_no_delete on public.app_vpa_commission_terms;
create rule app_vpa_commission_terms_no_delete as on delete to public.app_vpa_commission_terms do instead nothing;
drop rule if exists app_vpa_commission_terms_no_update on public.app_vpa_commission_terms;
create rule app_vpa_commission_terms_no_update as on update to public.app_vpa_commission_terms do instead nothing;

-- La voz consulta SU comisión y si ya la aceptó.
create or replace function public.vpa_my_commission()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_spec uuid; v_name text; v_pct int;
        v_acc_pct int; v_acc_at timestamptz;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select id, name into v_spec, v_name from app_vpa_specialists where fbid_user = v_uid limit 1;
  if v_spec is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  v_pct := vpa__commission_pct(v_spec);
  select commission_pct, accepted_at into v_acc_pct, v_acc_at
    from app_vpa_commission_terms where specialist_id = v_spec
    order by accepted_at desc limit 1;
  return jsonb_build_object(
    'ok', true, 'specialist_id', v_spec, 'name', v_name,
    'commission_pct', v_pct, 'accepted_pct', v_acc_pct, 'accepted_at', v_acc_at,
    'accepted', (v_acc_pct is not null and v_acc_pct = v_pct));
end $$;

create or replace function public.vpa_accept_commission(p_pct int, p_source text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_spec uuid; v_pct int;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select id into v_spec from app_vpa_specialists where fbid_user = v_uid limit 1;
  if v_spec is null then raise exception 'no specialist profile'; end if;
  v_pct := vpa__commission_pct(v_spec);
  -- Se acepta el porcentaje VIGENTE, nunca uno que mande el navegador.
  if p_pct is not null and p_pct <> v_pct then
    raise exception 'commission_changed'
      using hint = 'El porcentaje cambió mientras leías. Vuelve a cargar la página.';
  end if;
  insert into app_vpa_commission_terms(specialist_id, fbid_user, commission_pct, source)
  values (v_spec, v_uid, v_pct, left(coalesce(p_source,'panel'), 60));
  perform vpa__audit('accept_commission','specialist', v_spec,
                     jsonb_build_object('commission_pct', v_pct, 'source', p_source));
  return jsonb_build_object('ok', true, 'commission_pct', v_pct);
end $$;

-- Trazabilidad para Mónica.
create or replace function public.vpa_commission_acceptances()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare r jsonb;
begin
  perform vpa_require(auth.uid(),'super_admin');
  select coalesce(jsonb_agg(x order by x->>'accepted_at' desc), '[]'::jsonb) into r
  from (
    select jsonb_build_object(
             'specialist_id', t.specialist_id, 'name', s.name,
             'commission_pct', t.commission_pct, 'accepted_at', t.accepted_at,
             'source', t.source, 'current_pct', vpa__commission_pct(t.specialist_id)) as x
      from app_vpa_commission_terms t
      left join app_vpa_specialists s on s.id = t.specialist_id
  ) q;
  return r;
end $$;

revoke all on function public.vpa_my_commission()          from public, anon;
revoke all on function public.vpa_accept_commission(int,text) from public, anon;
revoke all on function public.vpa_commission_acceptances()  from public, anon;
grant execute on function public.vpa_my_commission()          to authenticated;
grant execute on function public.vpa_accept_commission(int,text) to authenticated;
grant execute on function public.vpa_commission_acceptances()  to authenticated;

-- ---------------------------------------------------------------------------
-- TEMA 3 — Fecha de evento por oferta (alimenta el calendario público)
-- ---------------------------------------------------------------------------
alter table app_vpa_offerings add column if not exists event_at       timestamptz;
alter table app_vpa_offerings add column if not exists event_ends_at  timestamptz;
alter table app_vpa_offerings add column if not exists event_location text;

comment on column app_vpa_offerings.event_at is
  'Fecha y hora del taller/conferencia. Sólo con fecha entra al calendario público.';

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
    COALESCE(o.booking_url, ''::text) <> ''::text AS has_booking,
    o.event_at,
    o.event_ends_at,
    o.event_location
   FROM app_vpa_offerings o
     JOIN app_vpa_specialists s ON s.id = o.specialist_id
  WHERE o.status = 'published'::vpa_pub_status
    AND (s.status = ANY (ARRAY['published'::vpa_spec_status, 'verified'::vpa_spec_status]));

-- ---------------------------------------------------------------------------
-- vpa_upsert_offering — comisión aceptada + fecha de evento
-- ---------------------------------------------------------------------------
create or replace function public.vpa_upsert_offering(payload jsonb)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_role vpa_role := vpa_role_of(auth.uid());
        v_id uuid := nullif(payload->>'id','')::uuid; v_spec uuid := nullif(payload->>'specialist_id','')::uuid;
        v_kind vpa_offering_type; v_booking text; v_status vpa_pub_status; v_sell boolean;
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
  else
    select coalesce(nullif(payload->>'kind','')::vpa_offering_type, o.kind),
           case when payload ? 'booking_url' then nullif(payload->>'booking_url','') else o.booking_url end,
           case when v_role='super_admin' and payload ? 'status' then (payload->>'status')::vpa_pub_status else o.status end,
           coalesce((payload->>'sell_via_voces')::boolean, o.sell_via_voces)
      into v_kind, v_booking, v_status, v_sell
      from app_vpa_offerings o where o.id = v_id;
  end if;

  if v_kind in ('sesion_individual','sesion_grupal') and coalesce(v_booking,'') = '' and v_status = 'published' then
    raise exception 'booking_required'
      using hint = 'Las sesiones individuales y grupales necesitan tu enlace de agenda (Calendly) para poder publicarse.';
  end if;

  -- Nada se vende por Voces sin que la voz haya aceptado su comisión vigente.
  -- (Mónica, como super_admin, edita en nombre de otros y no queda bloqueada.)
  if v_role = 'specialist' and v_sell then
    if not exists (select 1 from app_vpa_commission_terms t
                    where t.specialist_id = v_spec
                      and t.commission_pct = vpa__commission_pct(v_spec)) then
      raise exception 'commission_terms_required'
        using hint = 'Falta aceptar la comisión vigente de Voces para poder vender en la plataforma.';
    end if;
  end if;

  if v_id is null then
    insert into app_vpa_offerings (specialist_id, kind, title, description, price_cents, currency,
      external_url, sell_via_voces, in_progress, wants_help, cover_url, preview_url, file_url, file_name,
      booking_url, booking_label, status_pill, status, sort_order, event_at, event_ends_at, event_location)
    values (v_spec, v_kind, payload->>'title', payload->>'description',
      nullif(payload->>'price_cents','')::int, coalesce(payload->>'currency','MXN'),
      payload->>'external_url', v_sell,
      coalesce((payload->>'in_progress')::boolean,false), coalesce((payload->>'wants_help')::boolean,false),
      payload->>'cover_url', payload->>'preview_url', payload->>'file_url', payload->>'file_name',
      v_booking, nullif(payload->>'booking_label',''), nullif(payload->>'status_pill',''),
      v_status, coalesce((payload->>'sort_order')::int,0),
      nullif(payload->>'event_at','')::timestamptz, nullif(payload->>'event_ends_at','')::timestamptz,
      nullif(payload->>'event_location',''))
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
      sell_via_voces = v_sell,
      in_progress = coalesce((payload->>'in_progress')::boolean, in_progress),
      wants_help = coalesce((payload->>'wants_help')::boolean, wants_help),
      cover_url = payload->>'cover_url',
      preview_url = payload->>'preview_url',
      file_url = payload->>'file_url',
      file_name = payload->>'file_name',
      booking_url   = v_booking,
      booking_label = case when payload ? 'booking_label' then nullif(payload->>'booking_label','') else booking_label end,
      status_pill   = case when payload ? 'status_pill'   then nullif(payload->>'status_pill','')   else status_pill   end,
      event_at       = case when payload ? 'event_at'       then nullif(payload->>'event_at','')::timestamptz      else event_at end,
      event_ends_at  = case when payload ? 'event_ends_at'  then nullif(payload->>'event_ends_at','')::timestamptz else event_ends_at end,
      event_location = case when payload ? 'event_location' then nullif(payload->>'event_location','')            else event_location end,
      status = v_status,
      sort_order = coalesce((payload->>'sort_order')::int, sort_order)
    where id = v_id;
  end if;
  perform vpa__audit('upsert','offering',v_id,payload);
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- TEMA 4 — País de residencia y LinkedIn en el perfil del especialista
-- (country ya existía en la tabla; faltaba poder editarlo y guardarlo)
-- ---------------------------------------------------------------------------
create or replace function public.vpa_upsert_specialist(payload jsonb)
returns uuid language plpgsql security definer set search_path to 'public' as $$
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
      focus_es, focus_en, certs_es, certs_en, photo_url, badge_url, raw_photo_url, langs, modalities, available_now,
      contact_email, contact_phone, contact_web, contact_socials, status, sort_order, country, commission_pct)
    values (
      case when v_role = 'super_admin' then nullif(payload->>'fbid_user','')::uuid else v_uid end,
      (payload->>'category_id')::uuid, payload->>'name',
      payload->>'role_es', payload->>'role_en', payload->>'bio_es', payload->>'bio_en',
      coalesce((select array_agg(value) from jsonb_array_elements_text(payload->'focus_es')),'{}'),
      coalesce((select array_agg(value) from jsonb_array_elements_text(payload->'focus_en')),'{}'),
      payload->>'certs_es', payload->>'certs_en', payload->>'photo_url', payload->>'badge_url', payload->>'raw_photo_url',
      coalesce((select array_agg(value) from jsonb_array_elements_text(payload->'langs')),'{es}'),
      coalesce((select array_agg(value::vpa_modality) from jsonb_array_elements_text(payload->'modalities')),'{online}'),
      coalesce((payload->>'available_now')::boolean, true),
      payload->>'contact_email', payload->>'contact_phone', payload->>'contact_web',
      coalesce(payload->'contact_socials','{}'::jsonb),
      case when v_role = 'super_admin' then coalesce((payload->>'status')::vpa_spec_status,'published') else 'pending' end,
      coalesce((payload->>'sort_order')::int, 0),
      coalesce(upper(nullif(trim(payload->>'country'),'')), 'MX'),
      case when v_role = 'super_admin' then nullif(payload->>'commission_pct','')::int else null end)
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
      badge_url = coalesce(payload->>'badge_url', badge_url),
      raw_photo_url = coalesce(payload->>'raw_photo_url', raw_photo_url),
      langs = coalesce((select array_agg(value) from jsonb_array_elements_text(payload->'langs')), langs),
      modalities = coalesce((select array_agg(value::vpa_modality) from jsonb_array_elements_text(payload->'modalities')), modalities),
      available_now = coalesce((payload->>'available_now')::boolean, available_now),
      contact_email = coalesce(payload->>'contact_email', contact_email),
      contact_phone = coalesce(payload->>'contact_phone', contact_phone),
      contact_web = coalesce(payload->>'contact_web', contact_web),
      contact_socials = coalesce(payload->'contact_socials', contact_socials),
      country = coalesce(upper(nullif(trim(payload->>'country'),'')), country),
      -- Sólo Mónica mueve la comisión; la voz nunca se la puede cambiar.
      commission_pct = case when v_role = 'super_admin' and payload ? 'commission_pct'
                            then nullif(payload->>'commission_pct','')::int else commission_pct end,
      status = case when v_role = 'super_admin' and payload ? 'status' then (payload->>'status')::vpa_spec_status else status end,
      sort_order = coalesce((payload->>'sort_order')::int, sort_order),
      updated_at = now()
    where id = v_id;
  end if;
  perform vpa__audit('upsert','specialist',v_id,payload);
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Sugerencias/ediciones moderadas: país, LinkedIn y fecha de evento también
-- pueden proponerse. La comisión NUNCA entra por aquí.
-- ---------------------------------------------------------------------------
create or replace function public.vpa__apply_changes(p_spec uuid, p_offering uuid, p_changes jsonb)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  spec_cols  text[] := array['name','role_es','role_en','bio_es','bio_en','certs_es','certs_en',
                             'photo_url','badge_url','raw_photo_url','contact_email','contact_phone','contact_web','category_id',
                             'available_now','sort_order','country'];
  spec_arrs  text[] := array['focus_es','focus_en','langs'];
  off_cols   text[] := array['kind','title','description','price_cents','currency','external_url',
                             'sell_via_voces','in_progress','cover_url','preview_url','file_url','file_name',
                             'booking_url','booking_label','status_pill','sort_order',
                             'event_at','event_ends_at','event_location'];
  k text; sets text := '';
begin
  if p_changes is null or p_changes = '{}'::jsonb then return; end if;
  if p_offering is not null then
    for k in select jsonb_object_keys(p_changes) loop
      if k = any(off_cols) then
        -- las fechas vacías tienen que llegar como NULL, no como '' (revienta el cast)
        sets := sets || format('%I = (%L)::%s,', k,
          case when k in ('event_at','event_ends_at') then nullif(p_changes->>k,'') else p_changes->>k end,
          case k when 'price_cents' then 'int' when 'sort_order' then 'int'
                 when 'sell_via_voces' then 'boolean' when 'in_progress' then 'boolean'
                 when 'kind' then 'vpa_offering_type'
                 when 'event_at' then 'timestamptz' when 'event_ends_at' then 'timestamptz'
                 else 'text' end);
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
      elsif k = 'contact_socials' then
        sets := sets || format('contact_socials = coalesce(contact_socials,''{}''::jsonb) || (%L::jsonb),', p_changes->k);
      end if;
    end loop;
    if sets <> '' then
      execute 'update app_vpa_specialists set ' || left(sets, length(sets)-1) || ' where id = $1' using p_spec;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Alta pública (/crear-perfil): guarda el país y las redes tal cual llegan,
-- y la fecha del evento cuando la oferta la trae.
-- ---------------------------------------------------------------------------
create or replace function public.vpa_register_specialist(p_user uuid, payload jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_name  text := trim(payload->>'name');
  v_email text := lower(trim(payload->>'email'));
  v_cat   uuid := nullif(payload->>'category_id','')::uuid;
  v_country text := upper(nullif(trim(payload->>'country'),''));
  v_bio   text;
  v_photo text;
  v_spec  uuid;
  v_slug  text;
  o jsonb; v_kind vpa_offering_type; v_price int;
begin
  if p_user is null then raise exception 'user required'; end if;
  if v_name is null or length(v_name) < 2 or length(v_name) > 120 then raise exception 'invalid name'; end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  if v_cat is null then raise exception 'category required'; end if;
  if v_country is null or v_country !~ '^[A-Z]{2}$' then v_country := 'MX'; end if;

  select id, slug into v_spec, v_slug from app_vpa_specialists where fbid_user = p_user limit 1;
  if v_spec is not null then
    return jsonb_build_object('ok', true, 'specialist_id', v_spec, 'slug', v_slug, 'existed', true);
  end if;

  v_bio := trim(both e'\n' from coalesce(payload->>'what_do','')
           || case when coalesce(payload->>'mission','') <> '' then e'\n\n' || (payload->>'mission') else '' end);
  if coalesce(payload->>'photo_path','') <> '' then
    v_photo := 'https://fgsrcxxccdjqyrpkitmk.supabase.co/storage/v1/object/public/vpa-photos/' || (payload->>'photo_path');
  end if;

  insert into app_vpa_specialists
    (fbid_user, category_id, name, role_es, role_en, bio_es, bio_en, certs_es, certs_en, photo_url,
     langs, modalities, contact_email, contact_phone, contact_web, contact_socials, status, sort_order, country)
  values
    (p_user, v_cat, v_name, left(payload->>'headline',160), left(payload->>'headline',160),
     v_bio, v_bio, left(payload->>'certifications',2000), left(payload->>'certifications',2000), v_photo,
     coalesce((select array_agg(x) from (select left(value,5) x from jsonb_array_elements_text(payload->'langs') limit 4) t),'{es}'),
     coalesce((select array_agg(value::vpa_modality) from jsonb_array_elements_text(payload->'modalities')),'{online}'),
     v_email, left(payload->>'phone',40), left(payload->>'website',300),
     case when jsonb_typeof(payload->'socials')='object' then payload->'socials' else '{}'::jsonb end,
     'hidden', 999, v_country)
  returning id, slug into v_spec, v_slug;

  insert into app_vpa_members (fbid_user, role) values (p_user, 'specialist'::vpa_role)
    on conflict (fbid_user) do update set
      role = case when app_vpa_members.role = 'super_admin'::vpa_role then 'super_admin'::vpa_role else 'specialist'::vpa_role end;

  if jsonb_typeof(payload->'offerings') = 'array' then
    for o in select * from jsonb_array_elements(payload->'offerings') limit 20 loop
      if coalesce(trim(o->>'title'),'') <> '' then
        begin v_kind := (o->>'kind')::vpa_offering_type; exception when others then v_kind := 'otro'; end;
        v_price := case when (o->>'price_mxn') ~ '^[0-9]+(\.[0-9]+)?$'
                        then round((o->>'price_mxn')::numeric*100)::int else null end;
        insert into app_vpa_offerings
          (specialist_id, kind, title, description, price_cents, currency, external_url,
           sell_via_voces, in_progress, wants_help, status, booking_url, status_pill,
           event_at, event_location)
        values
          (v_spec, v_kind, left(trim(o->>'title'),200), nullif(left(coalesce(o->>'description',''),2000),''),
           v_price, 'MXN', nullif(left(coalesce(o->>'external_url',''),500),''),
           coalesce((o->>'sell_via_voces')::boolean,false), coalesce((o->>'in_progress')::boolean,false),
           coalesce((o->>'wants_help')::boolean,false), 'pending', nullif(left(coalesce(o->>'booking_url',''),500),''),
           case when o->>'status_pill' in ('disponible','reserva','proximamente','ninguna') then o->>'status_pill' else null end,
           (case when (o->>'event_at') ~ '^\d{4}-\d{2}-\d{2}' then (o->>'event_at')::timestamptz else null end),
           nullif(left(coalesce(o->>'event_location',''),200),''));
      end if;
    end loop;
  end if;

  -- Aceptación de la comisión firmada en el propio alta (casilla obligatoria).
  if coalesce((payload->>'accept_commission')::boolean, false) then
    insert into app_vpa_commission_terms(specialist_id, fbid_user, commission_pct, source)
    values (v_spec, p_user, vpa__commission_pct(v_spec), 'alta');
  end if;

  perform vpa__audit('register_specialist','specialist', v_spec,
                     jsonb_build_object('user',p_user,'email',v_email,'country',v_country));
  return jsonb_build_object('ok', true, 'specialist_id', v_spec, 'slug', v_slug, 'existed', false);
end $$;

-- ---------------------------------------------------------------------------
-- Panel de Mónica: una vista de todas las comisiones y sus aceptaciones
-- ---------------------------------------------------------------------------
create or replace function public.vpa_commissions_overview()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare r jsonb;
begin
  perform vpa_require(auth.uid(),'super_admin');
  select coalesce(jsonb_agg(x order by x->>'name'), '[]'::jsonb) into r
  from (
    select jsonb_build_object(
      'specialist_id', s.id,
      'name',          s.name,
      'status',        s.status,
      'assigned_pct',  s.commission_pct,
      'effective_pct', vpa__commission_pct(s.id),
      'plan',          (select p.id from app_vpa_subscriptions sub
                          join app_vpa_plans p on p.id = sub.plan_id
                         where sub.specialist_id = s.id and sub.status='active'
                           and (sub.current_period_end is null or sub.current_period_end > now())
                         order by sub.created_at desc limit 1),
      'accepted_pct',  (select t.commission_pct from app_vpa_commission_terms t
                         where t.specialist_id = s.id order by t.accepted_at desc limit 1),
      'accepted_at',   (select t.accepted_at from app_vpa_commission_terms t
                         where t.specialist_id = s.id order by t.accepted_at desc limit 1),
      'sells',         exists(select 1 from app_vpa_offerings o
                               where o.specialist_id = s.id and o.sell_via_voces)
    ) as x
    from app_vpa_specialists s
  ) q;
  return r;
end $$;

revoke all on function public.vpa_commissions_overview() from public, anon;
grant execute on function public.vpa_commissions_overview() to authenticated;
