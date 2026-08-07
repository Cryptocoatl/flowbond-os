-- vpa_0017_stripe
-- Stripe como riel de MEMBRESÍAS (y pagos internacionales).
-- Motivo: MercadoPago rechaza las suscripciones con `cc_rejected_high_risk`
-- (antifraude sobre cargos recurrentes). Verificado 2026-07-25: las 6
-- suscripciones reales quedaron 'pending', ninguna activa. La API de preapproval
-- de MP sólo acepta payer_email — no hay palanca de código para bajar el score.
-- Stripe Billing no tiene ese problema y trae Apple Pay + tarjetas internacionales.
-- Decisión Steph: las membresías cobran a la cuenta de VOCES (sin Connect/split).

-- 1) El vault de pagos ahora guarda también las llaves de Stripe.
create or replace function public.vpa_set_payment_secret(p_provider text, p_token text)
returns void language plpgsql security definer set search_path to 'public', 'vault' as $$
declare v_mode text;
begin
  perform vpa_require(auth.uid(),'super_admin');
  if coalesce(trim(p_token),'') = '' then raise exception 'empty token'; end if;

  if p_provider = 'mercadopago' then
    perform vpa__store_secret('vpa_mp_access_token', trim(p_token));
    v_mode := case when p_token like 'TEST-%' then 'test' else 'live' end;
    update app_vpa_settings set value = coalesce(value,'{}'::jsonb) || jsonb_build_object(
        'provider','mercadopago','configured',true,'mode',v_mode,'updated_at',now())
      where key='payments';
    insert into app_vpa_settings (key, value)
      select 'payments', jsonb_build_object('provider','mercadopago','configured',true,'mode',v_mode)
      where not exists (select 1 from app_vpa_settings where key='payments');

  elsif p_provider = 'stripe' then
    if p_token not like 'sk_%' and p_token not like 'rk_%' then
      raise exception 'la secret key de Stripe empieza con sk_ (o rk_)';
    end if;
    perform vpa__store_secret('vpa_stripe_secret_key', trim(p_token));
    v_mode := case when p_token like 'sk_test_%' or p_token like 'rk_test_%' then 'test' else 'live' end;
    insert into app_vpa_settings (key, value)
      values ('payments_stripe', jsonb_build_object('configured',true,'mode',v_mode,'updated_at',now()))
      on conflict (key) do update set value = coalesce(app_vpa_settings.value,'{}'::jsonb)
        || jsonb_build_object('configured',true,'mode',v_mode,'updated_at',now());

  elsif p_provider = 'stripe_webhook' then
    perform vpa__store_secret('vpa_stripe_webhook_secret', trim(p_token));
    insert into app_vpa_settings (key, value)
      values ('payments_stripe', jsonb_build_object('webhook_configured',true))
      on conflict (key) do update set value = coalesce(app_vpa_settings.value,'{}'::jsonb)
        || jsonb_build_object('webhook_configured',true);

  elsif p_provider = 'stripe_publishable' then
    insert into app_vpa_settings (key, value)
      values ('payments_stripe', jsonb_build_object('publishable_key', trim(p_token)))
      on conflict (key) do update set value = coalesce(app_vpa_settings.value,'{}'::jsonb)
        || jsonb_build_object('publishable_key', trim(p_token));

  else raise exception 'unsupported provider';
  end if;

  perform vpa__audit('set_payment_secret','payments',null,
    jsonb_build_object('provider',p_provider,'mode',coalesce(v_mode,'n/a')));
end $$;

-- 2) Las edge fns leen ambos proveedores.
create or replace function public.vpa__payment_config()
returns jsonb language plpgsql stable security definer set search_path to 'public', 'vault' as $$
begin
  return coalesce((select jsonb_object_agg(name, decrypted_secret) from vault.decrypted_secrets
                   where name in ('vpa_mp_access_token','vpa_stripe_secret_key','vpa_stripe_webhook_secret')),
                  '{}'::jsonb);
end $$;

-- 3) Estado para /admin (sin exponer secretos).
create or replace function public.vpa_stripe_status()
returns jsonb language plpgsql stable security definer set search_path to 'public', 'vault' as $$
declare v_key boolean; v_hook boolean;
begin
  perform vpa_require(auth.uid(),'super_admin');
  select exists(select 1 from vault.secrets where name='vpa_stripe_secret_key') into v_key;
  select exists(select 1 from vault.secrets where name='vpa_stripe_webhook_secret') into v_hook;
  return coalesce((select value from app_vpa_settings where key='payments_stripe'),'{}'::jsonb)
    || jsonb_build_object('configured', v_key, 'webhook_configured', v_hook);
end $$;
revoke execute on function public.vpa_stripe_status() from public, anon;
grant execute on function public.vpa_stripe_status() to authenticated;

-- 4) La suscripción recuerda por qué riel se cobró.
alter table public.app_vpa_subscriptions add column if not exists provider text;
alter table public.app_vpa_subscriptions add column if not exists stripe_customer_id text;
alter table public.app_vpa_subscriptions add column if not exists stripe_subscription_id text;
alter table public.app_vpa_subscriptions add column if not exists stripe_session_id text;
alter table public.app_vpa_subscriptions drop constraint if exists app_vpa_subscriptions_provider_check;
alter table public.app_vpa_subscriptions add constraint app_vpa_subscriptions_provider_check
  check (provider is null or provider in ('mercadopago','stripe'));
create index if not exists app_vpa_subs_stripe_sub_idx on public.app_vpa_subscriptions (stripe_subscription_id);

-- 5) La edge fn de Stripe registra los ids (service_role).
create or replace function public.vpa__set_stripe_sub(
  p_sub uuid, p_session text default null, p_customer text default null,
  p_subscription text default null, p_status text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  update app_vpa_subscriptions
     set provider = 'stripe',
         stripe_session_id      = coalesce(nullif(p_session,''),      stripe_session_id),
         stripe_customer_id     = coalesce(nullif(p_customer,''),     stripe_customer_id),
         stripe_subscription_id = coalesce(nullif(p_subscription,''), stripe_subscription_id),
         mp_status              = coalesce(nullif(p_status,''),       mp_status)
   where id = p_sub;
end $$;
revoke execute on function public.vpa__set_stripe_sub(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.vpa__set_stripe_sub(uuid,text,text,text,text) to service_role;

-- 6) MISMO camino de activación para MP y Stripe (puntos, publicar perfil, redimir
--    código, créditos) — sólo se agregan la búsqueda por stripe_subscription_id y
--    los kinds de Stripe. La lógica de MP queda idéntica.
create or replace function public.vpa__subscription_event_by_system(
  p_ref uuid, p_preapproval_id text, p_kind text, p_mp_status text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  s        app_vpa_subscriptions;
  p        app_vpa_plans;
  v_int    interval;
  v_activated boolean := false;
  v_stripe boolean := p_kind in ('stripe_sub','stripe_invoice');
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

  -- Cancelaciones / pausas (ambos proveedores)
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
          or (p_kind='stripe_invoice' and p_mp_status in ('paid','succeeded'))) then
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

  elsif p_kind in ('authorized_payment','stripe_invoice') then
    update app_vpa_subscriptions
       set current_period_end = greatest(coalesce(current_period_end, now()), now()) + v_int
     where id = s.id;
  end if;

  perform vpa__audit('subscription_'||(case when v_activated then 'active' else 'renewed' end),
    'subscription', s.id, jsonb_build_object('kind',p_kind,'status',p_mp_status));
  return jsonb_build_object('ok', true, 'activated', v_activated, 'subscription_id', s.id);
end $$;
