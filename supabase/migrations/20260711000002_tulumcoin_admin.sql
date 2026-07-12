-- ============================================================
-- TulumCoin · Admin layer — Pattern A migration (addendum)
-- Project: FlowBond-life (fgsrcxxccdjqyrpkitmk)
-- Roles: super_admin (Love) -> can grant/revoke admins
--        admin (team)       -> can edit contracts & settings
-- Contracts live in DB (not env). Edge function reads them here.
-- Every admin action lands in an append-only audit ledger.
-- ============================================================

create type tulumcoin_admin_role as enum ('super_admin', 'admin');

create table tulumcoin_admins (
  user_id    uuid primary key references flowbond_users(id) on delete cascade,
  role       tulumcoin_admin_role not null default 'admin',
  granted_by uuid references flowbond_users(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table tulumcoin_contracts (
  key        text primary key,   -- tulumcoin_near_ft | tulumcoin_near_nft | tlmc_op | petgascoin_bnb | refi_nft | xelva_collection
  network    text not null,      -- near | optimism | bnb | solana
  address    text not null,
  label      text,
  updated_by uuid references flowbond_users(id),
  updated_at timestamptz not null default now()
);

create table tulumcoin_admin_audit (
  id         uuid primary key default gen_random_uuid(),
  actor      uuid not null references flowbond_users(id),
  action     text not null,      -- grant_admin | revoke_admin | set_contract | bootstrap
  target     text,
  detail     jsonb,
  created_at timestamptz not null default now()
);
revoke update, delete on tulumcoin_admin_audit from public, anon, authenticated;

-- ---------------- helper ----------------
create or replace function tulumcoin_is_admin(p_user uuid, p_require_super boolean default false)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from tulumcoin_admins
    where user_id = p_user and revoked_at is null
      and (not p_require_super or role = 'super_admin'));
$$;

-- ---------------- RLS ----------------
alter table tulumcoin_admins      enable row level security;
alter table tulumcoin_contracts   enable row level security;
alter table tulumcoin_admin_audit enable row level security;

create policy "admins visible to admins" on tulumcoin_admins
  for select using (tulumcoin_is_admin(auth.uid()));
create policy "contracts readable by all signed-in" on tulumcoin_contracts
  for select using (auth.uid() is not null);   -- public chain addresses anyway
create policy "audit visible to admins" on tulumcoin_admin_audit
  for select using (tulumcoin_is_admin(auth.uid()));
-- All writes via SECURITY DEFINER RPCs below. No client insert/update policies.

-- ---------------- bootstrap: first super admin (works ONCE, empty table only) ----------------
create or replace function tulumcoin_bootstrap_super_admin()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if exists (select 1 from tulumcoin_admins) then
    raise exception 'already bootstrapped';
  end if;
  insert into tulumcoin_admins (user_id, role, granted_by) values (auth.uid(), 'super_admin', auth.uid());
  insert into tulumcoin_admin_audit (actor, action, target) values (auth.uid(), 'bootstrap', auth.uid()::text);
end $$;

-- ---------------- grant / revoke (super_admin only) ----------------
create or replace function tulumcoin_grant_admin(p_user_id uuid, p_role tulumcoin_admin_role default 'admin')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not tulumcoin_is_admin(auth.uid(), true) then raise exception 'super_admin required'; end if;
  insert into tulumcoin_admins (user_id, role, granted_by)
  values (p_user_id, p_role, auth.uid())
  on conflict (user_id) do update
    set role = excluded.role, granted_by = auth.uid(), granted_at = now(), revoked_at = null;
  insert into tulumcoin_admin_audit (actor, action, target, detail)
  values (auth.uid(), 'grant_admin', p_user_id::text, jsonb_build_object('role', p_role));
end $$;

create or replace function tulumcoin_revoke_admin(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not tulumcoin_is_admin(auth.uid(), true) then raise exception 'super_admin required'; end if;
  if p_user_id = auth.uid() and (
    select count(*) from tulumcoin_admins where role = 'super_admin' and revoked_at is null) = 1 then
    raise exception 'cannot revoke the last super_admin';
  end if;
  update tulumcoin_admins set revoked_at = now() where user_id = p_user_id;
  insert into tulumcoin_admin_audit (actor, action, target)
  values (auth.uid(), 'revoke_admin', p_user_id::text);
end $$;

-- ---------------- contracts (admin+) ----------------
create or replace function tulumcoin_set_contract(p_key text, p_network text, p_address text, p_label text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not tulumcoin_is_admin(auth.uid()) then raise exception 'admin required'; end if;
  if p_key not in ('tulumcoin_near_ft','tulumcoin_near_nft','tlmc_op','petgascoin_bnb','refi_nft','xelva_collection') then
    raise exception 'unknown contract key %', p_key;
  end if;
  insert into tulumcoin_contracts (key, network, address, label, updated_by, updated_at)
  values (p_key, p_network, p_address, p_label, auth.uid(), now())
  on conflict (key) do update
    set network = excluded.network, address = excluded.address,
        label = coalesce(excluded.label, tulumcoin_contracts.label),
        updated_by = auth.uid(), updated_at = now();
  insert into tulumcoin_admin_audit (actor, action, target, detail)
  values (auth.uid(), 'set_contract', p_key,
          jsonb_build_object('network', p_network, 'address', p_address));
end $$;

-- ---------------- reads for the admin panel ----------------
create or replace function tulumcoin_my_admin_role()
returns tulumcoin_admin_role language sql security definer set search_path = public stable as $$
  select role from tulumcoin_admins where user_id = auth.uid() and revoked_at is null;
$$;

create or replace function tulumcoin_list_admins()
returns setof tulumcoin_admins language sql security definer set search_path = public stable as $$
  select * from tulumcoin_admins where tulumcoin_is_admin(auth.uid()) order by granted_at;
$$;

create or replace function tulumcoin_list_audit(p_limit int default 50)
returns setof tulumcoin_admin_audit language sql security definer set search_path = public stable as $$
  select * from tulumcoin_admin_audit where tulumcoin_is_admin(auth.uid())
  order by created_at desc limit least(p_limit, 200);
$$;

-- ---------------- seed contract rows (addresses empty until team fills them) ----------------
insert into tulumcoin_contracts (key, network, address, label) values
  ('tulumcoin_near_ft',  'near',     '', 'Tulumcoin FT fundacional (NEAR)'),
  ('tulumcoin_near_nft', 'near',     '', 'NFTs fundacionales OG Jaguar (NEAR)'),
  ('tlmc_op',            'optimism', '', 'TLMC — nuevo token (Optimism)'),
  ('petgascoin_bnb',     'bnb',      '', 'PetgasCoin (BNB Chain)'),
  ('refi_nft',           'optimism', '', 'ReFi Tulum NFTs — multiplicador x1.5'),
  ('xelva_collection',   'solana',   '', 'Xelva collection (Solana)')
on conflict (key) do nothing;
