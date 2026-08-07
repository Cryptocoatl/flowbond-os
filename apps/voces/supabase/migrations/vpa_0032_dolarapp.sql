-- vpa_0032_dolarapp — cierra los huecos del riel DolarApp/ARQ (2026-08-01)
--
-- Contexto: DolarApp/ARQ no tiene API de payouts; en la práctica se le paga a su
-- CLABE (SPEI, en pesos) o a su dirección USDC (dólares digitales). El riel estaba
-- cableado pero con tres huecos:
--   1) 'dolarapp' NO validaba nada: aceptaba una "CLABE" de 5 dígitos o una
--      dirección USDC inventada (los kinds 'clabe' y 'usdc' sí validan). Un typo
--      en la dirección = dinero perdido para siempre.
--   2) El monto de un pago DolarApp se quedaba en MXN aunque el destino fuera una
--      dirección USDC -> la instrucción decía "envía $800 MXN a 0x…" y la
--      verificación on-chain comparaba 800 contra ~40 USDC recibidos: nunca
--      pasaba el umbral del 97% y el pago NO se podía cerrar con el hash.
--   3) (en la edge fn vpa-payout) la instrucción priorizaba el tag/correo sobre la
--      CLABE/dirección, al revés de lo que de verdad sirve para enviar.
--
-- Aquí van 1) y 2); 3) va en supabase/functions/vpa-payout/index.ts.

-- ---------------------------------------------------------------- 1) validación
create or replace function public.vpa__payout_clean(p_kind text, payload jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_email  text := lower(nullif(trim(payload->>'email'),''));
  v_clabe  text := nullif(regexp_replace(coalesce(payload->>'clabe',''),'[^0-9]','','g'),'');
  v_addr   text := nullif(trim(payload->>'wallet_address'),'');
  v_chain  text := lower(nullif(trim(payload->>'chain'),''));
  v_acct   text := nullif(trim(payload->>'account_id'),'');
  v_iban   text := upper(nullif(regexp_replace(coalesce(payload->>'iban',''),'[^A-Za-z0-9]','','g'),''));
  v_num    text := nullif(regexp_replace(coalesce(payload->>'account_number',''),'[^A-Za-z0-9]','','g'),'');
  v_swift  text := upper(nullif(regexp_replace(coalesce(payload->>'swift',''),'[^A-Za-z0-9]','','g'),''));
  v_holder text := nullif(trim(payload->>'holder_name'),'');
begin
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ese correo no parece válido';
  end if;

  if p_kind = 'mercadopago' then
    if v_email is null then raise exception 'Escribe el correo de tu cuenta de MercadoPago'; end if;
  elsif p_kind = 'paypal' then
    if v_email is null then raise exception 'Escribe el correo de tu cuenta de PayPal'; end if;
  elsif p_kind = 'wise' then
    if v_email is null and v_acct is null then
      raise exception 'Escribe el correo de tu cuenta Wise o tu ID de destinatario';
    end if;
  elsif p_kind = 'dolarapp' then
    if v_acct is null and v_clabe is null and v_addr is null and v_email is null then
      raise exception 'Para DolarApp/ARQ escribe tu tag, tu correo, tu CLABE o tu dirección USDC';
    end if;
    -- la CLABE de DolarApp se paga por SPEI: si la escribe, tiene que ser una CLABE de verdad
    if v_clabe is not null and length(v_clabe) <> 18 then
      raise exception 'La CLABE de DolarApp debe tener 18 dígitos';
    end if;
    -- si da dirección, se le enviará USDC: misma validación que el riel USDC
    if v_addr is not null then
      if v_chain is null then
        raise exception 'Elige la red de tu dirección USDC (Base, Polygon, Solana…)';
      end if;
      perform public.vpa__check_wallet(v_addr, v_chain);
    end if;
  elsif p_kind = 'usdc' then
    if v_addr is null then raise exception 'Falta la dirección de tu wallet'; end if;
    if v_chain is null then raise exception 'Elige la red (Base, Polygon, Solana…)'; end if;
    perform public.vpa__check_wallet(v_addr, v_chain);
  elsif p_kind = 'clabe' then
    if v_clabe is null or length(v_clabe) <> 18 then raise exception 'La CLABE debe tener 18 dígitos'; end if;
  elsif p_kind = 'bank_intl' then
    if v_holder is null then raise exception 'Falta el nombre del titular de la cuenta'; end if;
    if v_iban is null and v_num is null then raise exception 'Falta el IBAN o el número de cuenta'; end if;
    if v_swift is null and nullif(trim(payload->>'routing'),'') is null then
      raise exception 'Falta el SWIFT/BIC o el routing number';
    end if;
  end if;

  return jsonb_build_object(
    'holder_name',    left(v_holder,160),
    'email',          left(v_email,200),
    'account_id',     left(v_acct,120),
    'clabe',          v_clabe,
    'bank_name',      left(nullif(trim(payload->>'bank_name'),''),120),
    'swift',          left(v_swift,20),
    'iban',           left(v_iban,40),
    'account_number', left(v_num,40),
    'routing',        left(nullif(regexp_replace(coalesce(payload->>'routing',''),'[^A-Za-z0-9]','','g'),''),20),
    'wallet_address', left(v_addr,120),
    -- la red sólo tiene sentido si hay dirección (el selector del panel siempre manda una)
    'chain',          case when v_addr is null then null else v_chain end,
    'country',        upper(coalesce(nullif(trim(payload->>'country'),''),'MX')),
    'currency',       upper(coalesce(nullif(trim(payload->>'currency'),''),'MXN')),
    'label',          left(nullif(trim(payload->>'label'),''),80),
    'notes',          left(nullif(trim(payload->>'notes'),''),500)
  );
end $$;

-- formato de dirección por red — una sola regla para USDC y para DolarApp
create or replace function public.vpa__check_wallet(p_addr text, p_chain text)
returns void
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_chain in ('base','polygon','ethereum','arbitrum','optimism') and p_addr !~ '^0x[a-fA-F0-9]{40}$' then
    raise exception 'Esa dirección no parece válida para esa red: debe empezar con 0x y tener 42 caracteres';
  end if;
  if p_chain = 'solana' and p_addr !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$' then
    raise exception 'Esa dirección de Solana no parece válida';
  end if;
  if p_chain = 'tron' and p_addr !~ '^T[1-9A-HJ-NP-Za-km-z]{33}$' then
    raise exception 'Esa dirección de Tron no parece válida (empieza con T y tiene 34 caracteres)';
  end if;
end $$;
revoke all on function public.vpa__check_wallet(text,text) from public, anon, authenticated;

-- ------------------------------------------------ 2) moneda real del envío
-- DolarApp con dirección USDC se liquida en dólares (es lo que se manda y lo que
-- la verificación on-chain va a contar). Con CLABE se queda en pesos: llega por SPEI.
create or replace function public.vpa__payout_target_currency(m public.app_vpa_payout_methods)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when m.kind = 'usdc' then 'USD'
    when m.kind = 'dolarapp'
     and nullif(trim(coalesce(m.wallet_address,'')),'') is not null
     and nullif(trim(coalesce(m.clabe,'')),'') is null then 'USD'
    else nullif(m.currency,'')
  end
$$;
revoke all on function public.vpa__payout_target_currency(public.app_vpa_payout_methods) from public, anon, authenticated;

create or replace function public.vpa__payout_for_execution(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.app_vpa_payouts; m public.app_vpa_payout_methods; s public.app_vpa_specialists;
  v_target text; v_amt numeric; v_rate numeric;
begin
  select * into p from public.app_vpa_payouts where id = p_id;
  if p.id is null then return null; end if;
  select * into m from public.app_vpa_payout_methods where id = p.method_id;
  select * into s from public.app_vpa_specialists where id = p.specialist_id;

  -- USDC (y DolarApp pagado a dirección USDC) se liquidan en dólares.
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
    'routing', m.routing, 'wallet_address', m.wallet_address, 'chain', m.chain
  );
end $$;

create or replace function public.vpa_payout_destination(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.app_vpa_payouts; m public.app_vpa_payout_methods; s public.app_vpa_specialists;
  v_target text; v_amt numeric; v_rate numeric;
begin
  perform public.vpa_require(auth.uid(),'super_admin');
  select * into p from public.app_vpa_payouts where id = p_id;
  if p.id is null then raise exception 'Pago no encontrado'; end if;
  select * into m from public.app_vpa_payout_methods where id = p.method_id;
  select * into s from public.app_vpa_specialists where id = p.specialist_id;

  v_target := upper(coalesce(public.vpa__payout_target_currency(m), p.currency, 'MXN'));
  v_amt  := public.vpa_fx_convert(p.amount_cents / 100.0, p.currency, v_target);
  v_rate := public.vpa_fx_convert(1, p.currency, v_target);

  perform public.vpa__audit('view_payout_destination','payout',p_id, jsonb_build_object('by',auth.uid()));
  return jsonb_build_object(
    'id',p.id,'kind',p.kind,'status',p.status,'amount_cents',p.amount_cents,'currency',p.currency,
    'specialist_name',s.name,'holder_name',m.holder_name,'email',m.email,'account_id',m.account_id,
    'clabe',m.clabe,'bank_name',m.bank_name,'swift',m.swift,'iban',m.iban,
    'account_number',m.account_number,'routing',m.routing,
    'wallet_address',m.wallet_address,'chain',m.chain,'country',m.country,
    'currency_target', v_target,
    'suggested_amount', round(v_amt, 2),
    'fx_rate', v_rate,
    'fx_ok', (v_amt is not null),
    'notes',m.notes);
end $$;
