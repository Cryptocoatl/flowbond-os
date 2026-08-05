-- ════════════════════════════════════════════════════════════════
-- SANI TEMPLO · pago (una exhibición / mensual), splits y disbursements.
-- Deja TODO listo para conectar los rieles de Mercado Pago a los splits
-- después: la orden lleva su cadencia, el pago se registra, el fondo se
-- acumula (público) y cada beneficiario del split queda como un disbursement
-- 'pending' — lo único que falta luego es mover el dinero por MP.
-- Todo mutador es RPC SECURITY DEFINER service-role-only.
-- ════════════════════════════════════════════════════════════════

do $$ begin
  create type sanitemplo_cadencia as enum ('unica','mensual');
  create type sanitemplo_disb_beneficiary as enum ('fondo','brandmark','flowbond','nodo');
exception when duplicate_object then null; end $$;

alter table sanitemplo_orders add column if not exists cadencia sanitemplo_cadencia not null default 'unica';
alter table sanitemplo_orders add column if not exists billing_ref text; -- preference/preapproval id del proveedor

-- Ledger de eventos de pago (append-only).
create table if not exists sanitemplo_payments (
  id            bigserial primary key,
  order_id      uuid not null references sanitemplo_orders(id),
  provider      text not null,               -- 'manual_transfer' | 'mercadopago'
  provider_ref  text,                        -- payment/preapproval id externo
  status        text not null,               -- 'pending'|'paid'|'failed'|'refunded'
  amount_mxn    numeric(12,2) not null default 0,
  cadencia      sanitemplo_cadencia not null default 'unica',
  raw           jsonb not null default '{}',
  ts            timestamptz not null default now()
);
create index if not exists sanitemplo_payments_order_idx on sanitemplo_payments (order_id, ts desc);

-- Ledger de dispersión: una fila por beneficiario del split. Aquí se conectan
-- los rieles de MP después (status pending -> sent, con tx_ref).
create table if not exists sanitemplo_disbursements (
  id           bigserial primary key,
  order_id     uuid not null references sanitemplo_orders(id),
  payment_id   bigint references sanitemplo_payments(id),
  beneficiary  sanitemplo_disb_beneficiary not null,
  node_id      uuid references sanitemplo_nodes(id),
  amount_mxn   numeric(12,2) not null,
  status       text not null default 'pending', -- 'pending'|'sent'
  tx_ref       text,
  ts           timestamptz not null default now()
);
create index if not exists sanitemplo_disb_order_idx on sanitemplo_disbursements (order_id);
create index if not exists sanitemplo_disb_status_idx on sanitemplo_disbursements (status);

-- Padrón de admins de Sani Templo (dashboard). RLS on, acceso solo por RPC.
create table if not exists sanitemplo_admins (
  fbid      uuid primary key references flowbond_users(id),
  added_at  timestamptz not null default now()
);

alter table sanitemplo_payments enable row level security;
alter table sanitemplo_disbursements enable row level security;
alter table sanitemplo_admins enable row level security;

-- payments es append-only; disbursements NO (pending -> sent es una actualización legítima).
drop trigger if exists sanitemplo_payments_append_only on sanitemplo_payments;
create trigger sanitemplo_payments_append_only before update or delete on sanitemplo_payments
  for each row execute function sanitemplo_block_mutation();

-- ── create_order ahora lleva cadencia ──────────────────────────────────────
drop function if exists sanitemplo_create_order(uuid,text,text,sanitemplo_riel,int,int,text,text[],numeric,numeric,numeric,numeric,numeric);
create or replace function sanitemplo_create_order(
  p_fbid uuid, p_razon_social text, p_rfc text, p_riel sanitemplo_riel,
  p_visitas int, p_templos int, p_plazo_id text, p_space_tipos text[],
  p_visitas_subtotal numeric, p_presencia_subtotal numeric,
  p_subtotal numeric, p_iva numeric, p_total numeric,
  p_cadencia sanitemplo_cadencia default 'unica'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_sponsor uuid; v_order uuid; v_cfdi sanitemplo_cfdi_tipo;
begin
  v_cfdi := case p_riel when 'A' then 'publicidad'::sanitemplo_cfdi_tipo
                        when 'B' then 'donativo'::sanitemplo_cfdi_tipo end;
  select id into v_sponsor from sanitemplo_sponsors where fbid = p_fbid and riel = p_riel limit 1;
  if v_sponsor is null then
    insert into sanitemplo_sponsors(fbid, razon_social, rfc, riel)
    values (p_fbid, coalesce(nullif(p_razon_social,''),'—'), nullif(p_rfc,''), p_riel)
    returning id into v_sponsor;
  end if;
  insert into sanitemplo_orders(
    sponsor_id, riel, visitas, templos, plazo_id, space_tipos,
    visitas_subtotal, presencia_subtotal, subtotal, iva, total, cfdi_tipo, cadencia)
  values (v_sponsor, p_riel, p_visitas, p_templos, p_plazo_id, coalesce(p_space_tipos,'{}'),
    p_visitas_subtotal, p_presencia_subtotal, p_subtotal, p_iva, p_total, v_cfdi, p_cadencia)
  returning id into v_order;
  return v_order;
end $$;

-- ── record_payment: marca pagada, acumula fondo (público), escribe splits ──
create or replace function sanitemplo_record_payment(
  p_order_id uuid, p_provider text, p_provider_ref text, p_status text,
  p_amount numeric, p_cadencia sanitemplo_cadencia,
  p_fondo numeric, p_brandmark numeric, p_flowbond numeric, p_nodo numeric,
  p_node_id uuid default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_pay bigint;
begin
  insert into sanitemplo_payments(order_id, provider, provider_ref, status, amount_mxn, cadencia)
  values (p_order_id, p_provider, p_provider_ref, p_status, p_amount, p_cadencia)
  returning id into v_pay;

  if p_status in ('paid','approved') then
    update sanitemplo_orders set status = 'pagada' where id = p_order_id and status = 'cotizada';

    -- fondo: al ledger público (base sponsorship = 33% de la presencia)
    if p_fondo > 0 then
      insert into sanitemplo_fund_ledger(order_id, monto_mxn, base, pct)
      values (p_order_id, p_fondo, 'sponsorship', 0.33);
    end if;

    -- disbursements: un riel de pago por beneficiario (pending hasta mover el dinero)
    if p_fondo > 0     then insert into sanitemplo_disbursements(order_id,payment_id,beneficiary,amount_mxn) values (p_order_id,v_pay,'fondo',p_fondo); end if;
    if p_brandmark > 0 then insert into sanitemplo_disbursements(order_id,payment_id,beneficiary,amount_mxn) values (p_order_id,v_pay,'brandmark',p_brandmark); end if;
    if p_flowbond > 0  then insert into sanitemplo_disbursements(order_id,payment_id,beneficiary,amount_mxn) values (p_order_id,v_pay,'flowbond',p_flowbond); end if;
    if p_nodo > 0      then insert into sanitemplo_disbursements(order_id,payment_id,beneficiary,node_id,amount_mxn) values (p_order_id,v_pay,'nodo',p_node_id,p_nodo); end if;
  end if;

  return v_pay;
end $$;

-- ── admin ────────────────────────────────────────────────────────────────
create or replace function sanitemplo_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from sanitemplo_admins where fbid = auth.uid());
$$;

create or replace function sanitemplo_admin_settlements(p_periodo date default null)
returns setof sanitemplo_settlements
language plpgsql stable security definer set search_path = public as $$
begin
  if not sanitemplo_is_admin() then raise exception 'Solo admin.'; end if;
  return query
    select * from sanitemplo_settlements
    where p_periodo is null or periodo = p_periodo
    order by periodo desc, node_id;
end $$;

create or replace function sanitemplo_admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not sanitemplo_is_admin() then raise exception 'Solo admin.'; end if;
  select jsonb_build_object(
    'ordenes',        (select count(*) from sanitemplo_orders),
    'ordenes_pagadas',(select count(*) from sanitemplo_orders where status <> 'cotizada'),
    'visitas',        (select coalesce(sum(visitas),0) from sanitemplo_orders where status <> 'cotizada'),
    'fondo_total',    (select coalesce(sum(monto_mxn),0) from sanitemplo_fund_ledger),
    'disb_pendiente', (select coalesce(sum(amount_mxn),0) from sanitemplo_disbursements where status='pending'),
    'disb_enviado',   (select coalesce(sum(amount_mxn),0) from sanitemplo_disbursements where status='sent')
  ) into v;
  return v;
end $$;

-- ── grants ────────────────────────────────────────────────────────────────
-- service-role-only (el Worker): create_order, record_payment
revoke execute on function sanitemplo_create_order(uuid,text,text,sanitemplo_riel,int,int,text,text[],numeric,numeric,numeric,numeric,numeric,sanitemplo_cadencia) from public, anon, authenticated;
revoke execute on function sanitemplo_record_payment(uuid,text,text,text,numeric,sanitemplo_cadencia,numeric,numeric,numeric,numeric,uuid) from public, anon, authenticated;
-- admin RPCs: los llama el navegador del admin autenticado (chequean auth.uid()).
-- Se revoca el EXECUTE-a-PUBLIC por defecto y se concede solo a authenticated.
revoke execute on function sanitemplo_is_admin() from public;
revoke execute on function sanitemplo_admin_settlements(date) from public;
revoke execute on function sanitemplo_admin_overview() from public;
grant execute on function sanitemplo_is_admin() to authenticated;
grant execute on function sanitemplo_admin_settlements(date) to authenticated;
grant execute on function sanitemplo_admin_overview() to authenticated;

-- Admin fundador (se puede reasignar): se siembra por email vía service-role.
-- insert into sanitemplo_admins(fbid)
--   select id from auth.users where lower(email)='cryptocoatl101@gmail.com'
--   on conflict do nothing;
