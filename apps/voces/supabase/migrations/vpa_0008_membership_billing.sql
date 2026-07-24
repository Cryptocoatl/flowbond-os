-- ============================================================================
-- VOCES PARA EL ALMA — Migración 0008 — Membresía recurrente (MercadoPago) +
--                       descuentos con duración definida por Mónica
-- ----------------------------------------------------------------------------
--  Cambios:
--   1. Planes → 2 tiers en MXN: Basic $299/mes, Pro $499/mes (+ anual 2 meses
--      gratis). Se DESACTIVAN los tiers viejos en USD (free/on/amplified/global),
--      no se borran para no romper suscripciones existentes.
--   2. app_vpa_codes.duration_months: null/0 = descuento para SIEMPRE;
--      N = el precio acordado sólo los primeros N meses, luego sube al lleno.
--   3. app_vpa_subscriptions: columnas para el ciclo MercadoPago (preapproval)
--      + base_price_cents / discount_cents / revert_at para el "sube tras X meses".
--   4. RPCs:
--      · vpa_start_subscription  (authenticated) — crea la sub 'pending' con el
--        precio ya descontado; la consume el edge fn vpa-subscribe.
--      · vpa__subscription_for_payment / vpa__set_preapproval (service_role)
--      · vpa__subscription_event_by_system (service_role) — alta + renovaciones
--        desde el webhook de MercadoPago (idempotente).
--      · vpa__subs_pending_revert / vpa__apply_revert (service_role) — rutina que
--        restaura el precio lleno cuando vence la ventana de descuento.
--   Todo aditivo / idempotente. El cobro real depende del token de PRODUCCIÓN
--   de MercadoPago ya cargado en el Vault (mismo del ebook).
-- ============================================================================

-- ============ 1. PLANES: 2 tiers MXN (Basic / Pro) ============
-- Desactivar los tiers viejos en USD (siguen existiendo por FK de subs pasadas).
update app_vpa_plans set active = false
where id in ('free','on','amplified','global');

-- Basic $299/mes · Pro $499/mes · anual = 2 meses gratis (10 × mensual).
-- commission_pct, monthly_credits_cents y perks son PLACEHOLDERS editables por
-- Mónica desde /admin (vpa_upsert_plan). currency = MXN.
insert into app_vpa_plans
  (id, name_es, name_en, monthly_cents, yearly_cents, currency, commission_pct,
   monthly_credits_cents, perks_es, perks_en, sort_order, active)
values
 ('basic','Basic','Basic', 29900, 299000, 'MXN', 20, 0,
   array['Perfil publicado en Voces','Presencia en el directorio','Contacto directo sin intermediación'],
   array['Published profile on Voces','Directory presence','Direct contact, no middleman'], 1, true),
 ('pro','Pro','Pro', 49900, 499000, 'MXN', 10, 0,
   array['Todo lo de Basic','Presencia destacada y campañas','Menor comisión de venta','Material y créditos profesionales'],
   array['Everything in Basic','Featured presence & campaigns','Lower sales commission','Pro material & credits'], 2, true)
on conflict (id) do update set
  name_es=excluded.name_es, name_en=excluded.name_en,
  monthly_cents=excluded.monthly_cents, yearly_cents=excluded.yearly_cents,
  currency=excluded.currency, sort_order=excluded.sort_order, active=true;

-- ============ 2. CÓDIGOS: duración del descuento ============
alter table app_vpa_codes
  add column if not exists duration_months int
    check (duration_months is null or duration_months > 0);
comment on column app_vpa_codes.duration_months is
  'null = descuento permanente; N = el precio con descuento sólo los primeros N meses, luego sube al lleno';

-- Los códigos nuevos aplican a los tiers vigentes por default.
alter table app_vpa_codes alter column applies_plans set default '{basic,pro}';

-- ============ 3. SUSCRIPCIONES: ciclo MercadoPago + ventana de descuento ======
alter table app_vpa_subscriptions
  add column if not exists mp_preapproval_id text,
  add column if not exists mp_status         text,
  add column if not exists base_price_cents  int not null default 0,
  add column if not exists discount_cents    int not null default 0,
  add column if not exists discount_months   int,
  add column if not exists revert_at         timestamptz,
  add column if not exists buyer_email       text;
create index if not exists app_vpa_subscriptions_mp_idx
  on app_vpa_subscriptions (mp_preapproval_id);
create index if not exists app_vpa_subscriptions_revert_idx
  on app_vpa_subscriptions (revert_at) where revert_at is not null;

-- ============ 4a. vpa_start_subscription (authenticated) ======================
-- El especialista autenticado inicia su membresía. Calcula el precio ya
-- descontado (respetando applies_plans y la ventana de duración) y crea la sub
-- 'pending'. NO redime el código todavía (eso ocurre al activarse por webhook).
create or replace function vpa_start_subscription(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_plan   text := payload->>'plan_id';
  v_period text := coalesce(payload->>'period','monthly');
  v_code   text := nullif(trim(payload->>'code'),'');
  v_email  text := nullif(trim(payload->>'email'),'');
  v_spec   uuid;
  v_member uuid;
  p        app_vpa_plans;
  c        app_vpa_codes;
  v_base   int;
  v_disc   int := 0;
  v_months int := null;
  v_sub    uuid;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  if v_period not in ('monthly','yearly') then raise exception 'bad period'; end if;

  -- La membresía es del perfil de especialista del usuario.
  select id, fbid_user, coalesce(contact_email, v_email)
    into v_spec, v_member, v_email
  from app_vpa_specialists where fbid_user = v_uid limit 1;
  if v_spec is null then
    return jsonb_build_object('ok', false, 'error', 'need_profile');
  end if;

  select * into p from app_vpa_plans where id = v_plan and active;
  if p.id is null then raise exception 'bad plan'; end if;
  v_base := case when v_period='yearly' then p.yearly_cents else p.monthly_cents end;
  if v_base <= 0 then raise exception 'plan not payable'; end if;

  -- Descuento (opcional). Debe estar activo, no vencido, con usos disponibles y
  -- aplicar al plan elegido. Mismo cálculo que vpa__redeem_code.
  if v_code is not null then
    select * into c from app_vpa_codes where code = upper(v_code) and active;
    if c.id is not null
       and (c.expires_at is null or c.expires_at > now())
       and (c.max_uses is null or c.uses < c.max_uses)
       and (v_plan = any(c.applies_plans)) then
      v_disc := case when c.discount_type='percent'
                     then least(v_base, (v_base * least(c.discount_value,100)) / 100)
                     else least(v_base, c.discount_value) end;
      v_months := c.duration_months;   -- null = para siempre
    else
      v_code := null;                  -- código inválido → se ignora, sin error
    end if;
  end if;

  insert into app_vpa_subscriptions
    (specialist_id, member, plan_id, period, status, price_cents, base_price_cents,
     discount_cents, discount_months, currency, code, buyer_email)
  values
    (v_spec, v_member, v_plan, v_period, 'pending', greatest(0, v_base - v_disc),
     v_base, v_disc, v_months, 'MXN', upper(v_code), v_email)
  returning id into v_sub;

  perform vpa__audit('start_subscription','specialist', v_spec,
    jsonb_build_object('sub', v_sub, 'plan', v_plan, 'period', v_period,
                       'amount', greatest(0, v_base - v_disc), 'code', upper(v_code)));

  return jsonb_build_object(
    'ok', true, 'subscription_id', v_sub, 'plan_id', v_plan, 'plan_name', p.name_es,
    'period', v_period, 'currency', 'MXN',
    'base_cents', v_base, 'discount_cents', v_disc,
    'amount_cents', greatest(0, v_base - v_disc),
    'discount_months', v_months);
end $$;
revoke execute on function vpa_start_subscription(jsonb) from public;
grant  execute on function vpa_start_subscription(jsonb) to authenticated;

-- ============ 4b. vpa__subscription_for_payment (service_role) ================
-- El edge fn vpa-subscribe lee aquí lo necesario para crear el preapproval.
create or replace function vpa__subscription_for_payment(p_sub uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s app_vpa_subscriptions; p app_vpa_plans;
begin
  select * into s from app_vpa_subscriptions where id = p_sub;
  if s.id is null then return null; end if;
  select * into p from app_vpa_plans where id = s.plan_id;
  return jsonb_build_object(
    'subscription_id', s.id, 'status', s.status,
    'plan_id', s.plan_id, 'plan_name', p.name_es,
    'period', s.period, 'amount_cents', s.price_cents, 'currency', coalesce(s.currency,'MXN'),
    'buyer_email', s.buyer_email,
    'frequency', 1,
    'frequency_type', case when s.period='yearly' then 'months' else 'months' end,
    'frequency_value', case when s.period='yearly' then 12 else 1 end);
end $$;
revoke execute on function vpa__subscription_for_payment(uuid) from public, anon, authenticated;

-- ============ 4c. vpa__set_preapproval (service_role) =========================
create or replace function vpa__set_preapproval(p_sub uuid, p_preapproval_id text, p_status text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update app_vpa_subscriptions
     set mp_preapproval_id = nullif(p_preapproval_id,''),
         mp_status = coalesce(nullif(p_status,''), mp_status)
   where id = p_sub;
  perform vpa__audit('set_preapproval','subscription', p_sub,
    jsonb_build_object('preapproval', p_preapproval_id, 'status', p_status));
end $$;
revoke execute on function vpa__set_preapproval(uuid, text, text) from public, anon, authenticated;

-- ============ 4d. vpa__subscription_event_by_system (service_role) ============
-- Llamada por el webhook de MercadoPago. Idempotente.
--   p_kind = 'preapproval'        → alta / cambio de estado de la suscripción
--   p_kind = 'authorized_payment' → un cobro recurrente aprobado (extiende ciclo)
-- p_ref = external_reference (= subscription_id). Fallback: mp_preapproval_id.
create or replace function vpa__subscription_event_by_system(
  p_ref uuid, p_preapproval_id text, p_kind text, p_mp_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s        app_vpa_subscriptions;
  p        app_vpa_plans;
  v_int    interval;
  v_activated boolean := false;
begin
  -- localizar la suscripción (por id de referencia o por preapproval)
  if p_ref is not null then
    select * into s from app_vpa_subscriptions where id = p_ref for update;
  end if;
  if s.id is null and nullif(p_preapproval_id,'') is not null then
    select * into s from app_vpa_subscriptions
      where mp_preapproval_id = p_preapproval_id for update;
  end if;
  if s.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  select * into p from app_vpa_plans where id = s.plan_id;
  v_int := case when s.period='yearly' then interval '1 year' else interval '1 month' end;

  -- guardar el preapproval id si aún no lo teníamos
  if nullif(p_preapproval_id,'') is not null and coalesce(s.mp_preapproval_id,'') = '' then
    update app_vpa_subscriptions set mp_preapproval_id = p_preapproval_id where id = s.id;
  end if;
  update app_vpa_subscriptions set mp_status = nullif(p_mp_status,'') where id = s.id;

  -- Cancelación / pausa desde MercadoPago
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

  -- ¿Es una autorización/cobro válido? (preapproval authorized o pago aprobado)
  if not ((p_kind='preapproval' and p_mp_status in ('authorized','active'))
          or (p_kind='authorized_payment' and p_mp_status in ('approved','processed'))) then
    return jsonb_build_object('ok', true, 'noop', p_kind||'/'||coalesce(p_mp_status,''));
  end if;

  -- ---- ALTA (primera activación): sólo al pasar de pending → active ----
  if s.status <> 'active' then
    v_activated := true;
    -- cancelar cualquier otra suscripción vigente del mismo especialista
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

    -- redimir el código UNA sola vez (usos + referido + puntos)
    if s.code is not null then
      perform vpa__redeem_code(s.code, 'subscription', s.id, s.member,
        s.buyer_email, s.base_price_cents, 'MXN');
    end if;

    -- créditos del plan + puntos + estado del miembro
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

  -- ---- RENOVACIÓN: un cobro recurrente aprobado extiende el ciclo ----
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

-- ============ 4e. Rutina de reversión (service_role) =========================
-- Suscripciones cuya ventana de descuento venció y siguen cobrando el precio
-- reducido → el edge fn de reconciliación sube el monto en MercadoPago y llama
-- a vpa__apply_revert para dejar el precio lleno en la DB.
create or replace function vpa__subs_pending_revert()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'subscription_id', id, 'mp_preapproval_id', mp_preapproval_id,
           'base_price_cents', base_price_cents, 'currency', coalesce(currency,'MXN'))), '[]'::jsonb)
  from app_vpa_subscriptions
  where status='active' and revert_at is not null and revert_at <= now()
    and mp_preapproval_id is not null and price_cents < base_price_cents;
$$;
revoke execute on function vpa__subs_pending_revert() from public, anon, authenticated;

create or replace function vpa__apply_revert(p_sub uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update app_vpa_subscriptions
     set price_cents = base_price_cents, discount_cents = 0, revert_at = null
   where id = p_sub;
  perform vpa__audit('subscription_reverted','subscription', p_sub, '{}'::jsonb);
end $$;
revoke execute on function vpa__apply_revert(uuid) from public, anon, authenticated;

-- ============================================================================
-- FIN vpa_0008
-- ============================================================================
