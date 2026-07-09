-- =====================================================================
-- VOCES PARA EL ALMA — Migración 0003 — bootstrap super admin (Mónica)
-- Idempotente. Otorga super_admin al FBID que coincide con el email.
-- Ejecutar el SELECT una vez con el email real de Mónica (BrandMark).
-- =====================================================================

create or replace function vpa_bootstrap_super_admin(p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  -- resuelve el FBID por email en la tabla raíz de identidad
  select id into v_uid from public.flowbond_users where lower(email) = lower(p_email) limit 1;
  if v_uid is null then
    return 'NO_FBID_USER: que Mónica inicie sesión una vez en voces.flowme.one y vuelve a correr esto';
  end if;

  insert into app_vpa_members (fbid_user, role) values (v_uid, 'super_admin')
  on conflict (fbid_user) do update set role = 'super_admin';

  insert into app_vpa_audit(actor_fbid, action, entity, entity_id, diff)
  values (v_uid, 'bootstrap_super_admin', 'member', v_uid, jsonb_build_object('email', p_email));
  return 'OK: super_admin otorgado a ' || p_email;
end; $$;

-- Correr una vez (reemplazar con el email real de Mónica):
-- select vpa_bootstrap_super_admin('monica@brandmark.click');
