-- 006_tianguis_escrow.sql
-- Link Tianguis orders to a FlowScrow escrow hold.
--
-- FlowScrow is an independent escrow service reached over HTTP; here we only
-- store the reference to the hold it owns (id + provider + status), never the
-- escrowed funds or party detail. Idempotent so it is safe to re-run and safe
-- against the live, MCP-created flowgarden_tianguis_orders table.

alter table public.flowgarden_tianguis_orders
  add column if not exists escrow_id       text,
  add column if not exists escrow_provider text,
  add column if not exists escrow_status   text;  -- held | released | voided | pending | null (no escrow)

comment on column public.flowgarden_tianguis_orders.escrow_id is
  'FlowScrow escrow/deal id holding this order''s payment (null = no escrow).';
comment on column public.flowgarden_tianguis_orders.escrow_status is
  'Mirror of the FlowScrow hold lifecycle: held -> released (fulfilled) | voided (canceled).';

-- Find orders whose escrow is still open, for reconciliation / dispatch views.
create index if not exists idx_tianguis_orders_escrow_open
  on public.flowgarden_tianguis_orders (escrow_status)
  where escrow_status = 'held';
