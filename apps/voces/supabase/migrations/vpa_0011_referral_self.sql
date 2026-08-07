-- ============================================================================
-- VOCES PARA EL ALMA — Migración 0011 — Código de referido para TODO usuario
-- ----------------------------------------------------------------------------
--  vpa_my_referral_code(): el usuario autenticado obtiene (o crea) su código de
--  referido personal. Es un app_vpa_codes con referrer=él, SIN descuento (los
--  descuentos son los códigos que crea Mónica); da atribución + puntos al
--  referidor cuando alguien se suscribe con su link (?ref=CODE). Idempotente:
--  marca notes='referral' y devuelve el mismo código en llamadas posteriores.
-- ============================================================================
create or replace function vpa_my_referral_code()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_spec uuid; v_slug text; v_name text;
  v_base text; v_code text;
  c app_vpa_codes;
  v_pts int := coalesce(vpa__points_rule('referral_signup'), 55);
begin
  if v_uid is null then raise exception 'auth required'; end if;

  select id, slug, name into v_spec, v_slug, v_name
    from app_vpa_specialists where fbid_user = v_uid limit 1;

  -- ¿ya tiene su código de referido?
  select * into c from app_vpa_codes
    where referrer = v_uid and coalesce(notes,'') = 'referral'
    order by created_at limit 1;

  if c.id is null then
    v_base := upper(coalesce(nullif(regexp_replace(coalesce(v_slug, v_name, ''), '[^a-zA-Z0-9]', '', 'g'), ''), 'VOZ'));
    v_code := left(v_base, 10) || upper(left(replace(gen_random_uuid()::text, '-', ''), 4));
    -- garantizar unicidad
    while exists (select 1 from app_vpa_codes where code = v_code) loop
      v_code := left(v_base, 10) || upper(left(replace(gen_random_uuid()::text, '-', ''), 4));
    end loop;

    insert into app_vpa_codes
      (code, discount_type, discount_value, applies_plans, applies_orders,
       referrer, referrer_specialist, referrer_commission_type, referrer_commission_value,
       points_per_use, active, notes, created_by)
    values
      (v_code, 'percent', 0, '{basic,pro}', true,
       v_uid, v_spec, 'percent', 0,
       v_pts, true, 'referral', v_uid)
    returning * into c;
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', c.code,
    'uses', c.uses,
    'referrals', (select count(*) from app_vpa_referral_events where code_id = c.id),
    'points_per_use', c.points_per_use);
end $$;
revoke execute on function vpa_my_referral_code() from public, anon;
grant  execute on function vpa_my_referral_code() to authenticated;
