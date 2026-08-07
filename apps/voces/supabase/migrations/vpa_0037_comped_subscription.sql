-- ============================================================================
-- vpa_0037_comped_subscription — arregla las membresías con 100% de descuento
--
-- BUG (vivo desde 2026-07-30, 3 personas atoradas): un código de 100% deja
-- `price_cents = 0`. `vpa_start_subscription` devuelve ok:true, pero tanto
-- `vpa-stripe-subscribe` como `vpa-subscribe` rechazan con `zero_amount` (no se
-- puede cobrar 0) → el front muestra "No se pudo abrir el pago" y la persona
-- queda con una suscripción 'pending' que NUNCA se puede pagar.
-- Afectados: ARTUROCIMA100, URI100, LAURA100 (y STEPH100 sin usar).
--
-- FIX: si no hay nada que cobrar, no se manda a ninguna pasarela — se activa
-- directo. Se REUSA `vpa__subscription_event_by_system` (la misma ruta que usa
-- el webhook al cobrar) para no duplicar lógica de dinero: así el comped hereda
-- exactamente lo mismo — compuerta a 'pending' (NUNCA publica solo), correo de
-- aviso a Mónica, redención del código, créditos del plan, puntos y
-- `members.subscription_status`.
--
-- Cambio 1: aceptar el kind 'comped' en la lista de estados que activan.
--           Es ADITIVO: no toca ninguna rama existente.
-- Cambio 2: RPC `vpa_activate_free_subscription` para el front, con guardas:
--           sólo la dueña de la suscripción (o super_admin), sólo 'pending',
--           y sólo si de verdad el total es 0 (server-authoritative: el cliente
--           no puede pedir que le regalen una membresía que sí cuesta).
-- ============================================================================

-- ── Cambio 1: 'comped' activa ───────────────────────────────────────────────
create or replace function public.vpa__subscription_event_by_system(
  p_ref uuid, p_preapproval_id text, p_kind text, p_mp_status text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  s        app_vpa_subscriptions;
  p        app_vpa_plans;
  v_int    interval;
  v_activated boolean := false;
  v_stripe boolean := p_kind in ('stripe_sub','stripe_invoice');
  v_name   text;
  v_prev   text;
  v_notify text;
begin
  if p_ref is not null then
    select * into s from app_vpa_subscriptions where id = p_ref for update;
  end if;
  if s.id is null and nullif(p_preapproval_id,'') is not null then
    if v_stripe then
      select * into s from app_vpa_subscriptions where stripe_subscription_id = p_preapproval_id for update;
    else
      select * into s from app_vpa_subscriptions where mp_preapproval_id = p_preapproval_id for update;
    end if;
  end if;
  if s.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  select * into p from app_vpa_plans where id = s.plan_id;
  v_int := case when s.period='yearly' then interval '1 year' else interval '1 month' end;

  if nullif(p_preapproval_id,'') is not null then
    if v_stripe then
      update app_vpa_subscriptions set stripe_subscription_id = p_preapproval_id, provider='stripe'
       where id = s.id and coalesce(stripe_subscription_id,'') = '';
    elsif coalesce(s.mp_preapproval_id,'') = '' then
      update app_vpa_subscriptions set mp_preapproval_id = p_preapproval_id where id = s.id;
    end if;
  end if;
  update app_vpa_subscriptions set mp_status = nullif(p_mp_status,'') where id = s.id;

  if (p_kind = 'preapproval' and p_mp_status in ('cancelled','paused'))
     or (p_kind = 'stripe_sub' and p_mp_status in ('canceled','unpaid','incomplete_expired')) then
    update app_vpa_subscriptions
       set status = case when p_mp_status in ('paused') then 'past_due' else 'canceled' end
     where id = s.id;
    if s.member is not null and p_mp_status <> 'paused' then
      update app_vpa_members set subscription_status='canceled' where fbid_user=s.member;
    end if;
    perform vpa__audit('subscription_'||p_mp_status,'subscription', s.id, jsonb_build_object('status',p_mp_status));
    return jsonb_build_object('ok', true, 'status', p_mp_status);
  end if;

  if not ((p_kind='preapproval' and p_mp_status in ('authorized','active'))
          or (p_kind='authorized_payment' and p_mp_status in ('approved','processed'))
          or (p_kind='stripe_sub' and p_mp_status in ('active','trialing'))
          or (p_kind='stripe_invoice' and p_mp_status in ('paid','succeeded'))
          or (p_kind='comped' and p_mp_status='comped')) then
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

    -- COMPUERTA: pagado -> 'pending' (en revisión). NUNCA publica solo.
    select status, name into v_prev, v_name from app_vpa_specialists where id = s.specialist_id;
    update app_vpa_specialists set status='pending'
     where id = s.specialist_id and status = 'hidden';

    if v_prev = 'hidden' then
      select value #>> '{}' into v_notify from app_vpa_settings where key='notify_email';
      perform vpa__queue_email(coalesce(v_notify,'voces.world@gmail.com'), 'Voces', 'contacto',
        jsonb_build_object(
          'name', coalesce(v_name,'Nueva voz'),
          'email', s.buyer_email,
          'reply_to', s.buyer_email,
          'message', case when p_kind='comped'
            then 'MEMBRESÍA DE CORTESÍA — ' || coalesce(v_name,'(sin nombre)') ||
                 ' activó su membresía ' || upper(coalesce(s.plan_id,'')) ||
                 ' con el código ' || coalesce(s.code,'(sin código)') ||
                 ' (100% de descuento, $0 a cobrar; valor de lista $' ||
                 to_char(s.base_price_cents/100.0,'FM999999.00') || ' MXN). ' ||
                 'Su perfil quedó EN REVISIÓN, todavía NO es público. ' ||
                 'Entra a /admin -> Aprobaciones para revisarlo y publicarlo.'
            else 'PAGO RECIBIDO — ' || coalesce(v_name,'(sin nombre)') ||
                 ' pagó su membresía ' || upper(coalesce(s.plan_id,'')) ||
                 ' ($' || to_char(s.price_cents/100.0,'FM999999.00') || ' MXN). ' ||
                 'Su perfil quedó EN REVISIÓN, todavía NO es público. ' ||
                 'Entra a /admin -> Aprobaciones para revisarlo y publicarlo.' end));
    end if;

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

  elsif p_kind in ('authorized_payment','stripe_invoice') then
    update app_vpa_subscriptions
       set current_period_end = greatest(coalesce(current_period_end, now()), now()) + v_int
     where id = s.id;
  end if;

  perform vpa__audit('subscription_'||(case when v_activated then 'active' else 'renewed' end),
    'subscription', s.id, jsonb_build_object('kind',p_kind,'status',p_mp_status,'gate','pending_review'));
  return jsonb_build_object('ok', true, 'activated', v_activated, 'subscription_id', s.id);
end $function$;

-- ── Cambio 2: el front activa una membresía de $0 ───────────────────────────
create or replace function public.vpa_activate_free_subscription(p_sub uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  s      app_vpa_subscriptions;
  v_role vpa_role := public.vpa_role_of(auth.uid());
  v_mine uuid := public.vpa__my_specialist();
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select * into s from app_vpa_subscriptions where id = p_sub;
  if s.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  -- sólo la dueña de la suscripción, o Mónica
  if v_role <> 'super_admin' and (v_mine is null or v_mine <> s.specialist_id) then
    raise exception 'forbidden';
  end if;

  if s.status = 'active' then
    return jsonb_build_object('ok', true, 'already_active', true, 'subscription_id', s.id);
  end if;
  if s.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_payable', 'status', s.status);
  end if;

  -- SERVER-AUTHORITATIVE: el total real lo decide la base, no el cliente.
  if coalesce(s.price_cents, -1) <> 0 then
    return jsonb_build_object('ok', false, 'error', 'not_free', 'price_cents', s.price_cents);
  end if;

  return public.vpa__subscription_event_by_system(s.id, null, 'comped', 'comped');
end $$;

revoke all on function public.vpa_activate_free_subscription(uuid) from public, anon;
grant execute on function public.vpa_activate_free_subscription(uuid) to authenticated;
