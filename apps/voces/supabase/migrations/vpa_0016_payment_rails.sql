-- vpa_0016_payment_rails
-- Causa raíz: el `marketplace_fee` (split por autor) hace que MercadoPago OCULTE
-- métodos de pago en Checkout Pro (OXXO/SPEI/saldo y varias tarjetas). Verificado
-- 2026-07-25 comparando dos preferencias sobre el MISMO collector: con split ofrece
-- menos métodos que sin split.
-- Solución: el comprador elige el riel. 'card' conserva el split (probado, funciona);
-- 'other' cobra por la cuenta plataforma SIN split (todos los métodos disponibles);
-- 'transfer' es SPEI manual a la cuenta de Voces (sin procesador, no se puede bloquear).

-- 1) Nuevo estado: el comprador declaró una transferencia, falta que Mónica confirme.
alter table public.app_vpa_order_groups drop constraint if exists app_vpa_order_groups_status_check;
alter table public.app_vpa_order_groups add constraint app_vpa_order_groups_status_check
  check (status = any (array['awaiting_payment','awaiting_review','paid','fulfilled','canceled','refunded']));

-- 2) Riel elegido por el comprador.
alter table public.app_vpa_order_groups add column if not exists pay_method text;
alter table public.app_vpa_order_groups drop constraint if exists app_vpa_order_groups_pay_method_check;
alter table public.app_vpa_order_groups add constraint app_vpa_order_groups_pay_method_check
  check (pay_method is null or pay_method = any (array['card','other','transfer']));

-- 3) Datos bancarios para la transferencia directa (los edita Mónica en /admin → Pagos).
insert into public.app_vpa_settings (key, value)
values ('payments_transfer', jsonb_build_object(
  'enabled', false, 'bank', '', 'clabe', '', 'beneficiary', '', 'note', ''))
on conflict (key) do nothing;

-- Lectura pública: sólo devuelve los datos si Mónica activó el riel.
create or replace function public.vpa_transfer_info()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v jsonb;
begin
  select value into v from app_vpa_settings where key = 'payments_transfer';
  if v is null or not coalesce((v->>'enabled')::boolean, false)
     or coalesce(v->>'clabe','') = '' then
    return jsonb_build_object('enabled', false);
  end if;
  return jsonb_build_object('enabled', true,
    'bank', v->>'bank', 'clabe', v->>'clabe',
    'beneficiary', v->>'beneficiary', 'note', v->>'note');
end $$;
revoke execute on function public.vpa_transfer_info() from public;
grant execute on function public.vpa_transfer_info() to anon, authenticated;

-- 4) El comprador declara que ya transfirió. NO marca pagado: deja la orden en
--    awaiting_review y avisa a Mónica; ella confirma en /admin y ahí se libera todo.
create or replace function public.vpa_declare_transfer(
  p_order uuid, p_email text, p_reference text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare g app_vpa_order_groups; v_ref text; v_notify text;
begin
  select * into g from app_vpa_order_groups where id = p_order for update;
  if g.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if lower(coalesce(p_email, '')) <> lower(g.buyer_email) then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch');
  end if;
  if g.status in ('paid', 'fulfilled') then
    return jsonb_build_object('ok', true, 'status', g.status);
  end if;
  if g.status not in ('awaiting_payment', 'awaiting_review') then
    return jsonb_build_object('ok', false, 'error', 'not_payable');
  end if;

  v_ref := nullif(left(regexp_replace(coalesce(p_reference, ''), '[^A-Za-z0-9 ._/-]', '', 'g'), 120), '');
  update app_vpa_order_groups
     set status = 'awaiting_review',
         pay_method = 'transfer',
         payment_ref = coalesce(v_ref, payment_ref),
         notes = coalesce(notes || E'\n', '') ||
                 '[transferencia declarada ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || '] ' ||
                 coalesce(v_ref, 'sin referencia')
   where id = p_order;

  select value #>> '{}' into v_notify from app_vpa_settings where key = 'notify_email';
  perform vpa__queue_email(coalesce(v_notify, 'voces.world@gmail.com'), 'Voces', 'contacto',
    jsonb_build_object(
      'name', coalesce(nullif(g.buyer_name, ''), g.buyer_email),
      'email', g.buyer_email,
      'reply_to', g.buyer_email,
      'message', 'TRANSFERENCIA DECLARADA — pedido ' || left(p_order::text, 8) ||
                 ' por $' || to_char(g.total_cents / 100.0, 'FM999999.00') || ' MXN. ' ||
                 'Referencia: ' || coalesce(v_ref, '(no la escribió)') || '. ' ||
                 'Verifica el depósito y marca el pedido como PAGADO en /admin → Pedidos ' ||
                 'para liberar la entrega al comprador.'));

  perform vpa__audit('declare_transfer', 'order', p_order, jsonb_build_object('ref', v_ref));
  return jsonb_build_object('ok', true, 'status', 'awaiting_review');
end $$;
revoke execute on function public.vpa_declare_transfer(uuid, text, text) from public;
grant execute on function public.vpa_declare_transfer(uuid, text, text) to anon, authenticated;

-- 5) La edge fn vpa-pay registra el riel usado (service_role).
create or replace function public.vpa__order_set_method(p_order uuid, p_method text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if p_method not in ('card', 'other', 'transfer') then return; end if;
  update app_vpa_order_groups set pay_method = p_method where id = p_order;
end $$;
revoke execute on function public.vpa__order_set_method(uuid, text) from public, anon, authenticated;
grant execute on function public.vpa__order_set_method(uuid, text) to service_role;

-- 6) vpa_set_order_status debe aceptar el estado nuevo (idéntica al original + awaiting_review).
create or replace function public.vpa_set_order_status(
  p_id uuid, p_status text, p_payment_ref text default null::text)
returns void language plpgsql security definer set search_path to 'public' as $$
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
        'Pedido ' || left(p_id::text,8) || ' pagado — tu parte se calcula según tu membresía.')
    from (select distinct oi.specialist_id from app_vpa_order_items oi where oi.group_id = p_id and oi.specialist_id is not null) x
    join app_vpa_specialists s on s.id = x.specialist_id where s.fbid_user is not null;
  end if;
  perform vpa__audit('set_order_status','order',p_id, jsonb_build_object('status',p_status));
end $$;
