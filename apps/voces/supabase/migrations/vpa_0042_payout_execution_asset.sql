-- vpa_0042_payout_execution_asset — 2026-08-04
--
-- El verificador on-chain (edge fn vpa-payout-tools) elige el CONTRATO del token
-- según (asset, red). Hasta ahora `vpa__payout_for_execution` no devolvía `asset`,
-- así que la función sólo podía asumir USDC: con la wallet de USDT de una voz
-- habría buscado el contrato equivocado y ningún pago se habría podido cerrar.
--
-- Esta migración expone `asset` (+ el aviso de token/red y la comisión de red) en
-- la vista de ejecución, que es la que leen tanto el verificador como las
-- instrucciones manuales de `vpa-payout`. Todo lo demás queda idéntico.

create or replace function public.vpa__payout_for_execution(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p public.app_vpa_payouts; m public.app_vpa_payout_methods; s public.app_vpa_specialists;
  v_target text; v_amt numeric; v_rate numeric;
begin
  select * into p from public.app_vpa_payouts where id = p_id;
  if p.id is null then return null; end if;
  select * into m from public.app_vpa_payout_methods where id = p.method_id;
  select * into s from public.app_vpa_specialists where id = p.specialist_id;

  v_target := upper(coalesce(public.vpa__payout_target_currency(m), p.currency, 'MXN'));
  v_amt  := public.vpa_fx_convert(p.amount_cents / 100.0, p.currency, v_target);
  v_rate := public.vpa_fx_convert(1, p.currency, v_target);

  return jsonb_build_object(
    'id',p.id,'status',p.status,'kind',p.kind,'provider',p.provider,
    'amount_cents',p.amount_cents,'currency',p.currency,'specialist_name',s.name,
    'email', m.email, 'account_id', m.account_id, 'holder_name', m.holder_name,
    'country', m.country, 'currency_target', v_target,
    'pay_amount', round(coalesce(v_amt, p.amount_cents/100.0), 2),
    'pay_currency', case when v_amt is null then p.currency else v_target end,
    'fx_rate', v_rate,
    'fx_ok', (v_amt is not null),
    'clabe', m.clabe, 'clabe_last4', right(m.clabe,4), 'bank_name', m.bank_name,
    'swift', m.swift, 'iban', m.iban, 'iban_last4', right(m.iban,4),
    'account_number', m.account_number, 'account_last4', right(m.account_number,4),
    'routing', m.routing, 'wallet_address', m.wallet_address, 'chain', m.chain,
    -- NUEVO: qué token exactamente, para no verificar contra el contrato equivocado
    'asset', m.asset,
    'asset_warning', case when m.asset is not null
      then 'Envía EXACTAMENTE '||m.asset||' en la red '||upper(coalesce(m.chain,'?'))||
           '. Token equivocado o red equivocada = dinero perdido.' end,
    'network_fee_usd', public.vpa__crypto_network_fee_usd(m.chain),
    'network_note',    public.vpa__crypto_network_note(m.chain)
  );
end $$;

comment on function public.vpa__payout_for_execution(uuid) is
  'Datos de ejecución de un pago (service_role). Incluye asset/red para que el verificador on-chain elija el contrato correcto del token.';
