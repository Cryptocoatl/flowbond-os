-- ============================================================================
-- VOCES PARA EL ALMA — Migración 0012 — vpa_upsert_code acepta duration_months
-- ----------------------------------------------------------------------------
--  El panel /admin de Mónica ahora puede fijar la DURACIÓN del descuento
--  (meses; vacío = permanente) al crear/editar un código. Default de planes → basic/pro.
-- ============================================================================
create or replace function vpa_upsert_code(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(payload->>'id','')::uuid;
begin
  perform vpa_require(auth.uid(),'super_admin');
  if v_id is null then
    insert into app_vpa_codes (code, discount_type, discount_value, applies_plans, applies_orders,
      referrer, referrer_specialist, referrer_commission_type, referrer_commission_value,
      points_per_use, max_uses, expires_at, duration_months, notes, active, created_by)
    values (upper(trim(payload->>'code')),
      coalesce(payload->>'discount_type','amount'), coalesce((payload->>'discount_value')::int,0),
      coalesce((select array_agg(x) from jsonb_array_elements_text(payload->'applies_plans') t(x)),'{basic,pro}'),
      coalesce((payload->>'applies_orders')::boolean,false),
      nullif(payload->>'referrer','')::uuid, nullif(payload->>'referrer_specialist','')::uuid,
      coalesce(payload->>'referrer_commission_type','percent'), coalesce((payload->>'referrer_commission_value')::int,0),
      coalesce((payload->>'points_per_use')::int,0),
      nullif(payload->>'max_uses','')::int, nullif(payload->>'expires_at','')::timestamptz,
      nullif(payload->>'duration_months','')::int,
      payload->>'notes', coalesce((payload->>'active')::boolean,true), auth.uid())
    returning id into v_id;
  else
    update app_vpa_codes set
      code = coalesce(upper(trim(payload->>'code')), code),
      discount_type = coalesce(payload->>'discount_type', discount_type),
      discount_value = coalesce((payload->>'discount_value')::int, discount_value),
      applies_plans = coalesce((select array_agg(x) from jsonb_array_elements_text(payload->'applies_plans') t(x)), applies_plans),
      applies_orders = coalesce((payload->>'applies_orders')::boolean, applies_orders),
      referrer = nullif(payload->>'referrer','')::uuid,
      referrer_specialist = nullif(payload->>'referrer_specialist','')::uuid,
      referrer_commission_type = coalesce(payload->>'referrer_commission_type', referrer_commission_type),
      referrer_commission_value = coalesce((payload->>'referrer_commission_value')::int, referrer_commission_value),
      points_per_use = coalesce((payload->>'points_per_use')::int, points_per_use),
      max_uses = nullif(payload->>'max_uses','')::int,
      expires_at = nullif(payload->>'expires_at','')::timestamptz,
      duration_months = nullif(payload->>'duration_months','')::int,
      notes = coalesce(payload->>'notes', notes),
      active = coalesce((payload->>'active')::boolean, active)
    where id = v_id;
  end if;
  perform vpa__audit('upsert_code','code',v_id, payload - 'referrer');
  return v_id;
end $$;