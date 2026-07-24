-- =====================================================================
-- VOCES PARA EL ALMA — Migración 0007 — riel de pago (MercadoPago) + acuerdos
-- Feedback Steph 2026-07-12:
--  · Cobro vía MercadoPago (por ahora a la cuenta personal de Mónica; ella
--    pega su token en /admin → se guarda en Vault, nunca en repo). La cuenta
--    Voces recibe; cada expositor registra SU método (MP/banco) para su parte.
--  · El % de reparto lo define Mónica y lo ACUERDA cada expositor (tipo
--    "smart contract"): app_vpa_deals. Al comprar, el split se congela en
--    order_items (ejecución inmutable). Sin acuerdo → default por tier.
--  · Transición "pagado" la dispara el webhook con service_role (sin usuario).
--  · Orden de prueba de ~$3 USD (MXN) para validar el riel.
-- Todo aditivo. RLS deny-by-default, RPCs definer, revoke a PUBLIC/anon.
-- =====================================================================

-- ============ ORDER: campos de pago ============
alter table app_vpa_order_groups add column if not exists mp_preference_id text;
alter table app_vpa_order_groups add column if not exists mp_payment_id text;
alter table app_vpa_order_groups add column if not exists is_test boolean not null default false;

-- ============ PAYOUT: método MercadoPago del expositor ============
alter table app_vpa_payout_accounts add column if not exists mercadopago_email text;
alter table app_vpa_payout_accounts add column if not exists preferred_method text; -- 'mercadopago'|'clabe'|'paypal'

-- vpa_set_payout_account v2 (persiste mercadopago_email + preferred_method)
create or replace function vpa_set_payout_account(payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_spec uuid := nullif(payload->>'specialist_id','')::uuid; v_role vpa_role := vpa_role_of(auth.uid());
begin
  if v_role = 'specialist' then
    select id into v_spec from app_vpa_specialists where fbid_user = auth.uid() limit 1;
    if v_spec is null then raise exception 'no specialist profile'; end if;
  elsif v_role <> 'super_admin' then raise exception 'forbidden'; end if;
  if v_spec is null then raise exception 'specialist required'; end if;
  insert into app_vpa_payout_accounts (specialist_id, holder_name, bank_name, clabe, swift, paypal_email,
    mercadopago_email, preferred_method, country, currency, notes, updated_by)
  values (v_spec, left(payload->>'holder_name',160), left(payload->>'bank_name',120),
    left(regexp_replace(coalesce(payload->>'clabe',''),'[^0-9]','','g'),18),
    left(payload->>'swift',20), left(payload->>'paypal_email',200),
    left(payload->>'mercadopago_email',200),
    case when payload->>'preferred_method' in ('mercadopago','clabe','paypal') then payload->>'preferred_method' else 'mercadopago' end,
    coalesce(nullif(payload->>'country',''),'MX'), coalesce(nullif(payload->>'currency',''),'MXN'),
    left(payload->>'notes',500), auth.uid())
  on conflict (specialist_id) do update set
    holder_name=excluded.holder_name, bank_name=excluded.bank_name, clabe=excluded.clabe,
    swift=excluded.swift, paypal_email=excluded.paypal_email, mercadopago_email=excluded.mercadopago_email,
    preferred_method=excluded.preferred_method, country=excluded.country,
    currency=excluded.currency, notes=excluded.notes, updated_by=excluded.updated_by, updated_at=now();
  perform vpa__audit('set_payout_account','specialist',v_spec, jsonb_build_object('by',auth.uid()));
end $$;
revoke execute on function vpa_set_payout_account(jsonb) from public, anon;

-- ============ DEALS: acuerdo de reparto por expositor ============
create table if not exists app_vpa_deals (
  id             uuid primary key default gen_random_uuid(),
  specialist_id  uuid not null references app_vpa_specialists(id) on delete cascade,
  specialist_pct int not null check (specialist_pct between 0 and 100), -- lo que conserva la voz
  status         text not null default 'proposed' check (status in ('proposed','agreed','declined','superseded')),
  note           text,
  proposed_by    uuid references public.flowbond_users(id),
  agreed_by      uuid references public.flowbond_users(id),
  agreed_at      timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists app_vpa_deals_spec_idx on app_vpa_deals (specialist_id, status);
alter table app_vpa_deals enable row level security;
drop policy if exists vpa_deals_sel on app_vpa_deals;
create policy vpa_deals_sel on app_vpa_deals for select using (
  vpa_role_of(auth.uid())='super_admin'
  or exists (select 1 from app_vpa_specialists s where s.id=specialist_id and s.fbid_user=auth.uid()));

-- % que conserva la voz: acuerdo vigente > default por tier (100 - comisión plataforma)
create or replace function vpa__specialist_share_pct(p_spec uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select specialist_pct from app_vpa_deals where specialist_id=p_spec and status='agreed' order by created_at desc limit 1),
    100 - vpa__commission_pct(p_spec))
$$;

-- Mónica propone un acuerdo → notifica a la voz para que lo acepte
create or replace function vpa_deal_propose(p_specialist uuid, p_specialist_pct int, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_owner uuid; v_name text;
begin
  perform vpa_require(auth.uid(),'super_admin');
  if p_specialist_pct < 0 or p_specialist_pct > 100 then raise exception 'pct out of range'; end if;
  select fbid_user, name into v_owner, v_name from app_vpa_specialists where id=p_specialist;
  if v_name is null then raise exception 'not found'; end if;
  update app_vpa_deals set status='superseded' where specialist_id=p_specialist and status in ('proposed');
  insert into app_vpa_deals (specialist_id, specialist_pct, status, note, proposed_by)
  values (p_specialist, p_specialist_pct, 'proposed', p_note, auth.uid()) returning id into v_id;
  perform vpa__notify(v_owner, p_specialist, null, 'deal',
    'Voces te propone un acuerdo de reparto',
    'Conservas el '||p_specialist_pct||'% de cada venta. Acéptalo en tu panel para activarlo.'||coalesce(' — '||p_note,''));
  if v_owner is null then
    perform vpa__queue_email((select contact_email from app_vpa_specialists where id=p_specialist), v_name,
      'admin_note', jsonb_build_object('name',v_name,'message','Voces te propone conservar el '||p_specialist_pct||'% de cada venta. Reclama tu perfil para aceptarlo.'));
  end if;
  perform vpa__audit('deal_propose','specialist',p_specialist, jsonb_build_object('pct',p_specialist_pct,'deal',v_id));
  return v_id;
end $$;

-- La voz acepta o rechaza el acuerdo vigente
create or replace function vpa_deal_respond(p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare d app_vpa_deals; v_spec uuid; v_name text;
begin
  select id, name into v_spec, v_name from app_vpa_specialists where fbid_user=auth.uid() limit 1;
  if v_spec is null then raise exception 'no specialist profile'; end if;
  select * into d from app_vpa_deals where specialist_id=v_spec and status='proposed' order by created_at desc limit 1;
  if d.id is null then raise exception 'no proposal'; end if;
  if p_action='accept' then
    update app_vpa_deals set status='superseded' where specialist_id=v_spec and status='agreed';
    update app_vpa_deals set status='agreed', agreed_by=auth.uid(), agreed_at=now() where id=d.id;
    perform vpa__notify_admins(v_spec, null, 'deal', v_name||' aceptó el acuerdo de reparto ('||d.specialist_pct||'% para la voz)', null);
  elsif p_action='decline' then
    update app_vpa_deals set status='declined' where id=d.id;
    perform vpa__notify_admins(v_spec, null, 'deal', v_name||' no aceptó el acuerdo propuesto', null);
  else raise exception 'bad action'; end if;
  perform vpa__audit('deal_respond','specialist',v_spec, jsonb_build_object('action',p_action,'deal',d.id));
end $$;

-- ============ CHECKOUT v2: split por acuerdo (o tier) ============
create or replace function vpa_checkout(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(payload->>'email'));
  v_name  text := left(trim(coalesce(payload->>'name','')),120);
  v_code  text := payload->>'code';
  v_group uuid; v_sub int := 0; v_disc int := 0;
  it jsonb; v_qty int; v_type text; v_iid uuid;
  v_title text; v_price int; v_spec uuid; v_share int; v_plat int; v_recent int; v_total int;
  n_items int := 0; v_line int;
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  if jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') = 0 then raise exception 'empty cart'; end if;
  if jsonb_array_length(payload->'items') > 30 then raise exception 'too many items'; end if;

  select count(*) into v_recent from app_vpa_order_groups where buyer_email=v_email and created_at > now() - interval '10 minutes';
  if v_recent >= 3 then raise exception 'rate limited'; end if;
  select count(*) into v_total from app_vpa_order_groups where created_at > now() - interval '1 hour';
  if v_total >= 60 then raise exception 'rate limited'; end if;

  insert into app_vpa_order_groups (buyer_fbid, buyer_email, buyer_name)
  values (auth.uid(), v_email, v_name) returning id into v_group;

  for it in select * from jsonb_array_elements(payload->'items') loop
    v_type := it->>'type'; v_iid := nullif(it->>'id','')::uuid;
    v_qty := least(greatest(coalesce((it->>'qty')::int,1),1),20);
    if v_iid is null then raise exception 'bad item'; end if;
    if v_type='product' then
      select title_es, price_cents, specialist_id into v_title, v_price, v_spec from app_vpa_products where id=v_iid and status='published';
    elsif v_type='offering' then
      select o.title, o.price_cents, o.specialist_id into v_title, v_price, v_spec
      from app_vpa_offerings o join app_vpa_specialists s on s.id=o.specialist_id
      where o.id=v_iid and o.status='published' and s.status in ('published','verified') and o.sell_via_voces and not o.in_progress;
    elsif v_type='workshop' then
      select title_es, price_cents, specialist_id into v_title, v_price, v_spec from app_vpa_workshops where id=v_iid and status='published';
    else raise exception 'bad item type'; end if;
    if v_title is null or v_price is null then raise exception 'item unavailable'; end if;
    v_line := v_price * v_qty;
    -- share de la voz = acuerdo vigente o default por tier; plataforma se queda el resto
    v_share := case when v_spec is null then 0 else vpa__specialist_share_pct(v_spec) end;
    v_plat  := v_line - (v_line * v_share) / 100;
    insert into app_vpa_order_items (group_id, item_type, item_id, title, qty, unit_cents,
      specialist_id, commission_pct, platform_cents, specialist_cents)
    values (v_group, v_type, v_iid, v_title, v_qty, v_price, v_spec,
      case when v_spec is null then 100 else 100 - v_share end, v_plat, v_line - v_plat);
    v_sub := v_sub + v_line; n_items := n_items + 1;
    v_title := null; v_price := null; v_spec := null;
  end loop;

  v_disc := vpa__redeem_code(v_code, 'order', v_group, auth.uid(), v_email, v_sub, 'MXN');
  update app_vpa_order_groups
     set subtotal_cents=v_sub, discount_cents=v_disc, total_cents=greatest(0, v_sub - v_disc),
         code = case when v_disc>0 then upper(trim(v_code)) end
   where id=v_group;

  perform vpa__queue_email(v_email, v_name, 'order_received', jsonb_build_object('order_id',v_group,'total_cents',v_sub-v_disc,'items',n_items));
  perform vpa__audit('checkout','order',v_group, jsonb_build_object('items',n_items,'total',v_sub-v_disc));
  return jsonb_build_object('order_id',v_group,'subtotal_cents',v_sub,'discount_cents',v_disc,'total_cents',greatest(0,v_sub-v_disc),'currency','MXN');
end $$;

-- ============ PAGO: config en Vault (solo super_admin) ============
create or replace function vpa_set_payment_secret(p_provider text, p_token text)
returns void language plpgsql security definer set search_path = public, vault as $$
begin
  perform vpa_require(auth.uid(),'super_admin');
  if p_provider <> 'mercadopago' then raise exception 'unsupported provider'; end if;
  if coalesce(trim(p_token),'') = '' then raise exception 'empty token'; end if;
  perform vpa__store_secret('vpa_mp_access_token', trim(p_token));
  update app_vpa_settings set value = coalesce(value,'{}'::jsonb) || jsonb_build_object(
      'provider','mercadopago','configured',true,
      'mode', case when p_token like 'TEST-%' then 'test' else 'live' end,
      'updated_at', now())
    where key='payments';
  insert into app_vpa_settings (key, value)
    select 'payments', jsonb_build_object('provider','mercadopago','configured',true,
      'mode', case when p_token like 'TEST-%' then 'test' else 'live' end)
    where not exists (select 1 from app_vpa_settings where key='payments');
  perform vpa__audit('set_payment_secret','payments',null, jsonb_build_object('provider',p_provider,'mode',case when p_token like 'TEST-%' then 'test' else 'live' end));
end $$;

-- estado de config para el panel (sin exponer el secreto)
create or replace function vpa_payment_status()
returns jsonb language plpgsql stable security definer set search_path = public, vault as $$
declare v_has boolean;
begin
  perform vpa_require(auth.uid(),'super_admin');
  select exists(select 1 from vault.secrets where name='vpa_mp_access_token') into v_has;
  return coalesce((select value from app_vpa_settings where key='payments'),'{}'::jsonb)
    || jsonb_build_object('configured', v_has);
end $$;

-- config para las edge fns de pago (solo service_role)
create or replace function vpa__payment_config()
returns jsonb language plpgsql stable security definer set search_path = public, vault as $$
begin
  return coalesce((select jsonb_object_agg(name, decrypted_secret) from vault.decrypted_secrets
                   where name in ('vpa_mp_access_token')), '{}'::jsonb);
end $$;

-- payload de una orden para crear la preferencia (solo service_role)
create or replace function vpa__order_for_payment(p_order uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare g app_vpa_order_groups;
begin
  select * into g from app_vpa_order_groups where id=p_order;
  if g.id is null then return null; end if;
  return jsonb_build_object(
    'order_id', g.id, 'status', g.status, 'currency', g.currency,
    'total_cents', g.total_cents, 'subtotal_cents', g.subtotal_cents, 'discount_cents', g.discount_cents,
    'buyer_email', g.buyer_email, 'buyer_name', g.buyer_name, 'is_test', g.is_test,
    'items', coalesce((select jsonb_agg(jsonb_build_object('title',oi.title,'qty',oi.qty,'unit_cents',oi.unit_cents))
                       from app_vpa_order_items oi where oi.group_id=g.id),'[]'::jsonb));
end $$;

create or replace function vpa__order_set_preference(p_order uuid, p_pref text)
returns void language plpgsql security definer set search_path = public as $$
begin update app_vpa_order_groups set mp_preference_id=p_pref where id=p_order; end $$;

-- transición "pagado" disparada por el webhook (service_role, sin usuario)
create or replace function vpa__order_paid_by_system(p_order uuid, p_payment_id text)
returns void language plpgsql security definer set search_path = public as $$
declare g app_vpa_order_groups;
begin
  select * into g from app_vpa_order_groups where id=p_order for update;
  if g.id is null then return; end if;
  if g.status='paid' or g.status='fulfilled' then return; end if;  -- idempotente
  update app_vpa_order_groups set status='paid', mp_payment_id=p_payment_id, payment_ref=p_payment_id where id=p_order;
  perform vpa__award_points(g.buyer_fbid, (g.total_cents/10000)*vpa__points_rule('order_paid_per_100mxn'), 'order_paid', jsonb_build_object('order',p_order));
  perform vpa__queue_email(g.buyer_email, g.buyer_name, 'order_paid', jsonb_build_object('order_id',p_order,'total_cents',g.total_cents));
  perform vpa__notify(s.fbid_user, s.id, null, 'sale', 'Tienes una venta en Voces',
      'Pedido '||left(p_order::text,8)||' pagado — tu parte según tu acuerdo se registró en tu perfil.')
  from (select distinct oi.specialist_id from app_vpa_order_items oi where oi.group_id=p_order and oi.specialist_id is not null) x
  join app_vpa_specialists s on s.id=x.specialist_id where s.fbid_user is not null;
  perform vpa__audit('order_paid_mp','order',p_order, jsonb_build_object('payment',p_payment_id));
end $$;

-- crear una orden de prueba (~$3 USD en MXN) para validar el riel
create or replace function vpa_create_test_order(p_amount_mxn int default 60)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_group uuid; v_cents int := greatest(1, coalesce(p_amount_mxn,60)) * 100; v_email text;
begin
  perform vpa_require(auth.uid(),'super_admin');
  select email into v_email from public.flowbond_users where id=auth.uid();
  insert into app_vpa_order_groups (buyer_fbid, buyer_email, buyer_name, subtotal_cents, total_cents, is_test, notes)
  values (auth.uid(), coalesce(v_email,'test@voces.flowme.one'), 'Prueba de pago', v_cents, v_cents, true, 'test-order')
  returning id into v_group;
  insert into app_vpa_order_items (group_id, item_type, item_id, title, qty, unit_cents, commission_pct, platform_cents, specialist_cents)
  values (v_group, 'product', gen_random_uuid(), 'Pago de prueba Voces', 1, v_cents, 100, v_cents, 0);
  perform vpa__audit('create_test_order','order',v_group, jsonb_build_object('cents',v_cents));
  return v_group;
end $$;

-- ============ GRANTS ============
-- anon puede pedir la preferencia de su propia orden (la edge fn valida estado)
grant execute on function vpa_deal_respond(text) to authenticated;
grant execute on function vpa_deal_propose(uuid, int, text) to authenticated;
grant execute on function vpa_set_payment_secret(text, text) to authenticated;
grant execute on function vpa_payment_status() to authenticated;
grant execute on function vpa_create_test_order(int) to authenticated;

-- revokes: helpers internos y de sistema fuera de todo rol de cliente
revoke execute on function vpa__specialist_share_pct(uuid) from public, anon;
revoke execute on function vpa_deal_propose(uuid, int, text) from public, anon;
revoke execute on function vpa_deal_respond(text) from public, anon;
revoke execute on function vpa_set_payment_secret(text, text) from public, anon;
revoke execute on function vpa_payment_status() from public, anon;
revoke execute on function vpa__payment_config() from public, anon, authenticated;
revoke execute on function vpa__order_for_payment(uuid) from public, anon, authenticated;
revoke execute on function vpa__order_set_preference(uuid, text) from public, anon, authenticated;
revoke execute on function vpa__order_paid_by_system(uuid, text) from public, anon, authenticated;
revoke execute on function vpa_create_test_order(int) from public, anon;
