-- ════════════════════════════════════════════════════════════════
-- SANI TEMPLO · RPCs de orden y liquidación (para el Worker sanitemplo-api)
-- El kit referenciaba sanitemplo_create_order (§6 Checkout) pero no lo definía.
-- Regla 0.2: toda mutación por RPC SECURITY DEFINER. Estos son SOLO del Worker
-- (service_role) — el EXECUTE-a-PUBLIC por defecto se revoca al final, siempre.
-- El motor de precio vive en @flowbond/sanitemplo-core; el Worker calcula, la
-- orden se guarda con esos montos, y los CHECK de la tabla son el backstop
-- (riel B sin IVA / CFDI donativo, riel A = publicidad).
-- ════════════════════════════════════════════════════════════════

create or replace function sanitemplo_create_order(
  p_fbid              uuid,
  p_razon_social      text,
  p_rfc               text,
  p_riel              sanitemplo_riel,
  p_visitas           int,
  p_templos           int,
  p_plazo_id          text,
  p_space_tipos       text[],
  p_visitas_subtotal  numeric,
  p_presencia_subtotal numeric,
  p_subtotal          numeric,
  p_iva               numeric,
  p_total             numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_sponsor uuid; v_order uuid; v_cfdi sanitemplo_cfdi_tipo;
begin
  v_cfdi := case p_riel
    when 'A' then 'publicidad'::sanitemplo_cfdi_tipo
    when 'B' then 'donativo'::sanitemplo_cfdi_tipo
  end;

  -- Un patrocinador (fbid) puede tener presencia en cada riel, pero jamás una
  -- orden que los mezcle. Se reutiliza el sponsor por (fbid, riel).
  select id into v_sponsor from sanitemplo_sponsors
   where fbid = p_fbid and riel = p_riel limit 1;
  if v_sponsor is null then
    insert into sanitemplo_sponsors(fbid, razon_social, rfc, riel)
    values (p_fbid, coalesce(nullif(p_razon_social,''),'—'), nullif(p_rfc,''), p_riel)
    returning id into v_sponsor;
  end if;

  -- Los CHECK de sanitemplo_orders rechazan riel B con IVA o CFDI de publicidad,
  -- y riel A con CFDI de donativo. La UI lo impide antes; aquí es el backstop.
  insert into sanitemplo_orders(
    sponsor_id, riel, visitas, templos, plazo_id, space_tipos,
    visitas_subtotal, presencia_subtotal, subtotal, iva, total, cfdi_tipo)
  values (
    v_sponsor, p_riel, p_visitas, p_templos, p_plazo_id, coalesce(p_space_tipos,'{}'),
    p_visitas_subtotal, p_presencia_subtotal, p_subtotal, p_iva, p_total, v_cfdi)
  returning id into v_order;

  return v_order;
end $$;

-- Cuántas visitas quedan por asignar en una orden (para el Worker y gracias.astro).
create or replace function sanitemplo_order_pending(p_order_id uuid)
returns int
language sql stable security definer set search_path = public as $$
  select o.visitas - coalesce((
    select sum(a.visitas_asignadas) from sanitemplo_allocations a where a.order_id = o.id
  ), 0)
  from sanitemplo_orders o where o.id = p_order_id;
$$;

-- Persistencia de liquidación. El Worker calcula el split con settle() del core
-- y lo escribe aquí. Idempotente por (periodo, node_id).
create or replace function sanitemplo_upsert_settlement(
  p_periodo   date,
  p_node_id   uuid,
  p_bruto     numeric,
  p_fondo     numeric,
  p_brandmark numeric,
  p_flowbond  numeric,
  p_costo     numeric,
  p_neto_nodo numeric,
  p_neto      numeric
) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  insert into sanitemplo_settlements(
    periodo, node_id, bruto, fondo_33, brandmark_12, flowbond_8,
    costo_directo, neto_nodo, neto)
  values (p_periodo, p_node_id, p_bruto, p_fondo, p_brandmark, p_flowbond,
    p_costo, p_neto_nodo, p_neto)
  on conflict (periodo, node_id) do update set
    bruto = excluded.bruto, fondo_33 = excluded.fondo_33,
    brandmark_12 = excluded.brandmark_12, flowbond_8 = excluded.flowbond_8,
    costo_directo = excluded.costo_directo, neto_nodo = excluded.neto_nodo,
    neto = excluded.neto, ts = now()
  returning id into v_id;
  return v_id;
end $$;

-- SOLO el Worker (service_role). Nunca anon ni authenticated.
revoke execute on function sanitemplo_create_order(uuid,text,text,sanitemplo_riel,int,int,text,text[],numeric,numeric,numeric,numeric,numeric) from public, anon, authenticated;
revoke execute on function sanitemplo_order_pending(uuid) from public, anon, authenticated;
revoke execute on function sanitemplo_upsert_settlement(date,uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric) from public, anon, authenticated;
