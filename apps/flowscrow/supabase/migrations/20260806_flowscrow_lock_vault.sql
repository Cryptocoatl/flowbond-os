-- FlowScrow · cerrar el vault (FG-071, 2026-08-06)
-- Hallazgo: las firmas, tareas y bitácora de un acuerdo de separación se leían
-- SIN sesión, por dos puertas distintas:
--   1) políticas `FOR SELECT TO anon, authenticated USING (true)` en las tablas;
--   2) los RPC `flowscrow_vault_*`, que resolvían el trato por título y NO
--      comprobaban quién preguntaba (la puerta estaba sólo en el navegador).
-- Cerrar sólo la tabla no bastaba: el RPC seguía sirviendo los datos.
-- El acceso legítimo no cambia: `flowscrow_is_signer()` exige sesión iniciada y
-- que el correo de esa sesión esté dado de alta como firmante.

begin;

drop policy if exists sig_read on public.flowscrow_signatures;
drop policy if exists wit_read on public.flowscrow_witnesses;
drop policy if exists cmt_read on public.flowscrow_comments;

create or replace function public.flowscrow_vault_signatures()
returns setof public.flowscrow_signatures language sql stable security definer set search_path to 'public' as $$
  select * from public.flowscrow_signatures
  where deal_id = public.flowscrow_vault_deal() and public.flowscrow_is_signer()
  order by signed_at;
$$;

create or replace function public.flowscrow_vault_witnesses()
returns setof public.flowscrow_witnesses language sql stable security definer set search_path to 'public' as $$
  select * from public.flowscrow_witnesses
  where deal_id = public.flowscrow_vault_deal() and public.flowscrow_is_signer()
  order by name;
$$;

create or replace function public.flowscrow_vault_comments()
returns setof public.flowscrow_comments language sql stable security definer set search_path to 'public' as $$
  select * from public.flowscrow_comments
  where public.flowscrow_is_signer()
  order by created_at;
$$;

create or replace function public.flowscrow_vault_tasks()
returns setof public.flowscrow_tasks language sql stable security definer set search_path to 'public' as $$
  select * from public.flowscrow_tasks
  where deal_id = public.flowscrow_vault_deal() and public.flowscrow_is_signer()
  order by sort_order;
$$;

create or replace function public.flowscrow_vault_events()
returns setof public.flowscrow_events language sql stable security definer set search_path to 'public' as $$
  select * from public.flowscrow_events
  where deal_id = public.flowscrow_vault_deal() and public.flowscrow_is_signer()
  order by created_at;
$$;

commit;
