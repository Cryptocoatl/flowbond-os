-- ============================================================
-- TulumCoin · Verify OG — Pattern A migration (v2)
-- Project: FlowBond-life (fgsrcxxccdjqyrpkitmk) · schema: public
-- Status model is HOLDINGS-BASED, not chain-count-based:
--   OG Jaguar      = Tulumcoin FT or founding NFTs on NEAR
--   TLMC Steward   = TLMC token on Optimism
--   Petgas Ally    = PetgasCoin on BNB Chain
--   ReFi ×1.5      = ReFi Tulum NFT holder (benefit multiplier)
--   Xelva holder   = Xelva NFT on Solana (Fest access)
-- One EVM signature covers BNB + Optimism (same address space).
-- Deploy: feature branch -> /test -> validation -> production
-- ============================================================

create type tulumcoin_chain as enum ('near', 'evm', 'solana');

create table tulumcoin_wallet_links (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references flowbond_users(id) on delete cascade,
  chain           tulumcoin_chain not null,
  address         text not null,
  public_key      text,
  nonce           text not null,
  signed_message  text not null,
  signature       text not null,
  verified_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (chain, address),          -- an address binds to exactly one FBID
  unique (user_id, chain)           -- one primary wallet per chain per user (v1)
);

-- Append-only. network distinguishes BNB vs Optimism under the one EVM link.
create table tulumcoin_holdings_snapshots (
  id             uuid primary key default gen_random_uuid(),
  wallet_link_id uuid not null references tulumcoin_wallet_links(id) on delete cascade,
  network        text not null,     -- 'near' | 'bnb' | 'optimism' | 'solana'
  asset_key      text not null,     -- 'tulumcoin_near'|'og_nft_near'|'tlmc_op'|'petgascoin_bnb'|'refi_nft'|'xelva_nft'
  asset_contract text not null,
  balance_raw    text not null,
  token_ids      jsonb,
  block_ref      text,
  scanned_at     timestamptz not null default now()
);
create index on tulumcoin_holdings_snapshots (wallet_link_id, asset_key, scanned_at desc);

create table tulumcoin_og_status (
  user_id         uuid primary key references flowbond_users(id) on delete cascade,
  og_jaguar       boolean not null default false,  -- NEAR: Tulumcoin FT or founding NFT
  tlmc_steward    boolean not null default false,  -- Optimism: TLMC > 0
  petgas_ally     boolean not null default false,  -- BNB: PGC > 0
  refi_multiplier boolean not null default false,  -- ReFi Tulum NFT holder -> ×1.5 benefits
  xelva_holder    boolean not null default false,  -- Solana: Xelva NFT -> Fest access
  chains_verified int not null default 0,
  sello_minted    boolean not null default false,
  sello_ref       text,
  updated_at      timestamptz not null default now()
);

create table tulumcoin_xp_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references flowbond_users(id) on delete cascade,
  amount      int not null check (amount > 0),
  multiplier  numeric(3,2) not null default 1.00,  -- 1.50 for ReFi holders at mint time
  reason      text not null,
  source_ref  jsonb,
  created_at  timestamptz not null default now()
);
create index on tulumcoin_xp_ledger (user_id, created_at);

revoke update, delete on tulumcoin_xp_ledger, tulumcoin_holdings_snapshots from public, anon, authenticated;

-- ---------------- RLS ----------------
alter table tulumcoin_wallet_links       enable row level security;
alter table tulumcoin_holdings_snapshots enable row level security;
alter table tulumcoin_og_status          enable row level security;
alter table tulumcoin_xp_ledger          enable row level security;

create policy "own wallet links" on tulumcoin_wallet_links for select using (user_id = auth.uid());
create policy "own og status"    on tulumcoin_og_status    for select using (user_id = auth.uid());
create policy "own xp"           on tulumcoin_xp_ledger    for select using (user_id = auth.uid());
create policy "own snapshots"    on tulumcoin_holdings_snapshots for select using (exists (
  select 1 from tulumcoin_wallet_links l where l.id = wallet_link_id and l.user_id = auth.uid()));
-- All writes via SECURITY DEFINER RPCs only.

-- ---------------- RPC: challenge ----------------
create or replace function tulumcoin_issue_challenge(p_chain tulumcoin_chain, p_address text)
returns table (nonce text, message text)
language plpgsql security definer set search_path = public as $$
declare v_nonce text := encode(extensions.gen_random_bytes(16), 'hex');
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  return query select v_nonce,
    format(E'tulum.flowme.one · Verificar OG\nFBID: %s\nChain: %s\nAddress: %s\nNonce: %s\nEsta firma no mueve fondos. This signature moves no funds.',
           auth.uid(), p_chain, p_address, v_nonce);
end $$;

-- ---------------- RPC: record verified link ----------------
create or replace function tulumcoin_record_verified_link(
  p_user_id uuid, p_chain tulumcoin_chain, p_address text,
  p_public_key text, p_nonce text, p_message text, p_signature text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into tulumcoin_wallet_links (user_id, chain, address, public_key, nonce, signed_message, signature, verified_at)
  values (p_user_id, p_chain, p_address, p_public_key, p_nonce, p_message, p_signature, now())
  returning id into v_id;
  return v_id;
end $$;

-- ---------------- RPC: recompute status from latest snapshots ----------------
-- Called by the edge function AFTER snapshots are inserted.
create or replace function tulumcoin_recompute_status(p_user_id uuid)
returns tulumcoin_og_status
language plpgsql security definer set search_path = public as $$
declare
  v_row tulumcoin_og_status;
  has_asset boolean;
begin
  with latest as (
    select distinct on (s.asset_key) s.asset_key, s.balance_raw
    from tulumcoin_holdings_snapshots s
    join tulumcoin_wallet_links l on l.id = s.wallet_link_id
    where l.user_id = p_user_id and l.verified_at is not null
    order by s.asset_key, s.scanned_at desc
  ),
  flags as (
    select
      coalesce(bool_or(asset_key in ('tulumcoin_near','og_nft_near') and balance_raw <> '0'), false) as og,
      coalesce(bool_or(asset_key = 'tlmc_op'        and balance_raw <> '0'), false) as steward,
      coalesce(bool_or(asset_key = 'petgascoin_bnb' and balance_raw <> '0'), false) as petgas,
      coalesce(bool_or(asset_key = 'refi_nft'       and balance_raw <> '0'), false) as refi,
      coalesce(bool_or(asset_key = 'xelva_nft'      and balance_raw <> '0'), false) as xelva
    from latest
  )
  insert into tulumcoin_og_status
    (user_id, og_jaguar, tlmc_steward, petgas_ally, refi_multiplier, xelva_holder, chains_verified, updated_at)
  select p_user_id, f.og, f.steward, f.petgas, f.refi, f.xelva,
    (select count(distinct chain) from tulumcoin_wallet_links
      where user_id = p_user_id and verified_at is not null),
    now()
  from flags f
  on conflict (user_id) do update set
    og_jaguar = excluded.og_jaguar, tlmc_steward = excluded.tlmc_steward,
    petgas_ally = excluded.petgas_ally, refi_multiplier = excluded.refi_multiplier,
    xelva_holder = excluded.xelva_holder, chains_verified = excluded.chains_verified,
    updated_at = now()
  returning * into v_row;
  return v_row;
end $$;

-- ---------------- RPC: mint XP (applies ReFi ×1.5 automatically) ----------------
create or replace function tulumcoin_mint_xp(p_user_id uuid, p_amount int, p_reason text, p_source jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare v_mult numeric(3,2) := 1.00;
begin
  select case when refi_multiplier then 1.50 else 1.00 end into v_mult
  from tulumcoin_og_status where user_id = p_user_id;
  insert into tulumcoin_xp_ledger (user_id, amount, multiplier, reason, source_ref)
  values (p_user_id, ceil(p_amount * coalesce(v_mult, 1.00)), coalesce(v_mult, 1.00), p_reason, p_source);
end $$;
