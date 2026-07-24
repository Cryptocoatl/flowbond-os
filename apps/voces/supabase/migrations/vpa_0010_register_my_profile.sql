-- ============================================================================
-- VOCES PARA EL ALMA — Migración 0010 — Perfil para cuenta existente
-- ----------------------------------------------------------------------------
--  vpa_register_my_profile(payload): un usuario YA autenticado (p.ej. alguien
--  que compró el ebook y ya tiene cuenta) crea su perfil de especialista sin
--  pasar por vpa-register (que crea cuentas nuevas). Reusa vpa_register_specialist
--  con auth.uid(). Así el formulario fusionado sirve para cuentas nuevas y viejas.
-- ============================================================================
create or replace function vpa_register_my_profile(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'auth required'; end if;
  return vpa_register_specialist(v_uid, payload);
end $$;
revoke execute on function vpa_register_my_profile(jsonb) from public, anon;
grant  execute on function vpa_register_my_profile(jsonb) to authenticated;
