-- ============================================================================
-- VOCES PARA EL ALMA — Migración 0009 — Registro instantáneo (modelo A)
-- ----------------------------------------------------------------------------
--  El usuario se registra y paga en un solo hilo; Mónica cura DESPUÉS.
--   1. vpa_register_specialist(p_user, payload) — crea el perfil de especialista
--      ligado a una cuenta ya creada (por el edge fn vpa-register), en status
--      'hidden'. Idempotente: si el usuario ya tiene perfil, lo devuelve.
--   2. vpa__subscription_event_by_system — al activarse el pago, PUBLICA el perfil
--      (hidden/pending → published). Así "formulario + pago" = perfil visible.
--   Aditivo. La RPC es service_role (la llama el edge fn); nada público la ejecuta.
-- ============================================================================

-- ============ 1. Registro instantáneo del especialista ============
create or replace function vpa_register_specialist(p_user uuid, payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name  text := trim(payload->>'name');
  v_email text := lower(trim(payload->>'email'));
  v_cat   uuid := nullif(payload->>'category_id','')::uuid;
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

  -- idempotente: si este usuario ya tiene perfil, devolverlo
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
     langs, modalities, contact_email, contact_phone, contact_web, contact_socials, status, sort_order)
  values
    (p_user, v_cat, v_name, left(payload->>'headline',160), left(payload->>'headline',160),
     v_bio, v_bio, left(payload->>'certifications',2000), left(payload->>'certifications',2000), v_photo,
     coalesce((select array_agg(x) from (select left(value,5) x from jsonb_array_elements_text(payload->'langs') limit 4) t),'{es}'),
     coalesce((select array_agg(value::vpa_modality) from jsonb_array_elements_text(payload->'modalities')),'{online}'),
     v_email, left(payload->>'phone',40), left(payload->>'website',300),
     case when jsonb_typeof(payload->'socials')='object' then payload->'socials' else '{}'::jsonb end,
     'hidden', 999)
  returning id, slug into v_spec, v_slug;

  -- rol especialista (no degradar a un super_admin)
  insert into app_vpa_members (fbid_user, role) values (p_user, 'specialist')
    on conflict (fbid_user) do update set
      role = case when app_vpa_members.role='super_admin' then 'super_admin' else 'specialist' end;

  -- ofertas opcionales (quedan 'pending' hasta que Mónica las publique)
  if jsonb_typeof(payload->'offerings') = 'array' then
    for o in select * from jsonb_array_elements(payload->'offerings') limit 20 loop
      if coalesce(trim(o->>'title'),'') <> '' then
        begin v_kind := (o->>'kind')::vpa_offering_type; exception when others then v_kind := 'otro'; end;
        v_price := case when (o->>'price_mxn') ~ '^[0-9]+(\.[0-9]+)?$'
                        then round((o->>'price_mxn')::numeric*100)::int else null end;
        insert into app_vpa_offerings
          (specialist_id, kind, title, description, price_cents, currency, external_url,
           sell_via_voces, in_progress, wants_help, status)
        values
          (v_spec, v_kind, left(trim(o->>'title'),200), nullif(left(coalesce(o->>'description',''),2000),''),
           v_price, 'MXN', nullif(left(coalesce(o->>'external_url',''),500),''),
           coalesce((o->>'sell_via_voces')::boolean,false), coalesce((o->>'in_progress')::boolean,false),
           coalesce((o->>'wants_help')::boolean,false), 'pending');
      end if;
    end loop;
  end if;

  perform vpa__audit('register_specialist','specialist', v_spec, jsonb_build_object('user',p_user,'email',v_email));
  return jsonb_build_object('ok', true, 'specialist_id', v_spec, 'slug', v_slug, 'existed', false);
end $$;
revoke execute on function vpa_register_specialist(uuid, jsonb) from public, anon, authenticated;

-- ============ 2. Publicar el perfil al activarse el pago ============
-- (re-emisión de vpa__subscription_event_by_system de vpa_0008 con UNA línea nueva:
--  al primer pago, hidden/pending → published)
create or replace function vpa__subscription_event_by_system(
  p_ref uuid, p_preapproval_id text, p_kind text, p_mp_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s        app_vpa_subscriptions;
  p        app_vpa_plans;
  v_int    interval;
  v_activated boolean := false;
begin
  if p_ref is not null then
    select * into s from app_vpa_subscriptions where id = p_ref for update;
  end if;
  if s.id is null and nullif(p_preapproval_id,'') is not null then
    select * into s from app_vpa_subscriptions where mp_preapproval_id = p_preapproval_id for update;
  end if;
  if s.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  select * into p from app_vpa_plans where id = s.plan_id;
  v_int := case when s.period='yearly' then interval '1 year' else interval '1 month' end;

  if nullif(p_preapproval_id,'') is not null and coalesce(s.mp_preapproval_id,'') = '' then
    update app_vpa_subscriptions set mp_preapproval_id = p_preapproval_id where id = s.id;
  end if;
  update app_vpa_subscriptions set mp_status = nullif(p_mp_status,'') where id = s.id;

  if p_kind = 'preapproval' and p_mp_status in ('cancelled','paused') then
    update app_vpa_subscriptions
       set status = case when p_mp_status='cancelled' then 'canceled' else 'past_due' end
     where id = s.id;
    if s.member is not null and p_mp_status='cancelled' then
      update app_vpa_members set subscription_status='canceled' where fbid_user=s.member;
    end if;
    perform vpa__audit('subscription_'||p_mp_status,'subscription', s.id, jsonb_build_object('mp',p_mp_status));
    return jsonb_build_object('ok', true, 'status', p_mp_status);
  end if;

  if not ((p_kind='preapproval' and p_mp_status in ('authorized','active'))
          or (p_kind='authorized_payment' and p_mp_status in ('approved','processed'))) then
    return jsonb_build_object('ok', true, 'noop', p_kind||'/'||coalesce(p_mp_status,''));
  end if;

  if s.status <> 'active' then
    v_activated := true;
    update app_vpa_subscriptions
       set status='canceled'
     where specialist_id = s.specialist_id and id <> s.id and status in ('pending','active','past_due');

    update app_vpa_subscriptions
       set status='active',
           started_at = coalesce(started_at, now()),
           current_period_end = now() + v_int,
           revert_at = case when coalesce(s.discount_months,0) > 0 and s.discount_cents > 0
                            then now() + (s.discount_months || ' months')::interval end
     where id = s.id;

    -- NUEVO (0009): al pagar, el perfil se publica (curación de Mónica después)
    update app_vpa_specialists set status='published'
     where id = s.specialist_id and status in ('pending','hidden');

    if s.code is not null then
      perform vpa__redeem_code(s.code, 'subscription', s.id, s.member,
        s.buyer_email, s.base_price_cents, 'MXN');
    end if;

    if p.monthly_credits_cents > 0 then
      insert into app_vpa_credits (specialist_id, member, delta_cents, reason, ref)
      values (s.specialist_id, s.member,
              p.monthly_credits_cents * case when s.period='yearly' then 12 else 1 end,
              'plan_grant', jsonb_build_object('subscription', s.id, 'plan', s.plan_id));
    end if;
    perform vpa__award_points(s.member, vpa__points_rule('subscription_active'),
      'subscription_active', jsonb_build_object('plan', s.plan_id));
    if s.member is not null then
      update app_vpa_members set subscription_status='active' where fbid_user=s.member;
    end if;

  elsif p_kind='authorized_payment' then
    update app_vpa_subscriptions
       set current_period_end = greatest(coalesce(current_period_end, now()), now()) + v_int
     where id = s.id;
  end if;

  perform vpa__audit('subscription_'||(case when v_activated then 'active' else 'renewed' end),
    'subscription', s.id, jsonb_build_object('kind',p_kind,'mp',p_mp_status));
  return jsonb_build_object('ok', true, 'activated', v_activated, 'subscription_id', s.id);
end $$;
revoke execute on function vpa__subscription_event_by_system(uuid, text, text, text) from public, anon, authenticated;
