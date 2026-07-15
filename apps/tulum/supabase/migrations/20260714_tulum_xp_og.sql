-- ============================================================================
-- TulumCoin · Verify OG — FROZEN-SNAPSHOT ledger (Pattern A: tulum_* prefix)
-- Canonical project: fgsrcxxccdjqyrpkitmk
--
-- OG means "was there," not "holds now." The chain is read ONCE per contract,
-- at a pinned past block, by an offline CLI a human runs and reviews. From then
-- on THIS ledger is the source of truth. The Worker never reads an RPC for
-- balances; the browser never asserts anything. A signed claim resolves against
-- a frozen holder set — not a live balance (live balances are farmable).
--
-- Built ALONGSIDE the existing tulumcoin_* live-scan schema (which keeps the
-- /admin RBAC + audit + super-admin bootstrap). Nothing here modifies
-- flowbond_users. auth.uid() is the soulbound FBID root.
--
-- ⚠️ NOT YET APPLIED — authored for review. Apply to a /test dev branch first.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- snapshots: one row per contract, pinned to a past block, sealed once frozen
-- ---------------------------------------------------------------------------
create table if not exists public.tulum_snapshots (
  id              uuid primary key default gen_random_uuid(),
  key             text not null unique,                 -- config key, e.g. 'pgc_legacy'
  chain           text not null check (chain in ('near','evm','solana')),
  network         text not null,                        -- 'optimism','bsc','near-mainnet',...
  chain_id        integer,                              -- EVM only (10, 56, ...)
  contract        text not null,
  kind            text not null check (kind in ('ft','nft')),
  credential      text not null,                        -- credential this snapshot grants
  block_height    numeric(78,0) not null,               -- PINNED. never 'latest', never computed.
  rpc_endpoint    text not null,                        -- exact endpoint used (auditable)
  evidence_class  text not null check (evidence_class in ('archival','replay','present-state')),
  merkle_root     text,                                 -- keccak256 root over sorted leaves
  holder_count    integer,
  balance_sum     numeric(78,0),                        -- raw base units, summed
  total_supply    numeric(78,0),                        -- at block_height (EVM replays must match sum)
  config_hash     text not null,                        -- hash of the config state that produced this
  notes           text,
  is_frozen       boolean not null default false,
  frozen_at       timestamptz,
  created_at      timestamptz not null default now()
);
comment on table public.tulum_snapshots is
  'One frozen chain read per contract at a pinned block. Source of truth for OG claims.';

-- ---------------------------------------------------------------------------
-- holders: the frozen holder set. Sealed by trigger once the snapshot freezes.
-- ---------------------------------------------------------------------------
create table if not exists public.tulum_snapshot_holders (
  snapshot_id  uuid not null references public.tulum_snapshots(id) on delete cascade,
  address_norm text not null,                           -- normalized per chain (see CLI)
  balance      numeric(78,0) not null,                  -- raw base units (no floats, ever)
  token_ids    text[],                                  -- NFT token ids when kind='nft'
  primary key (snapshot_id, address_norm)
);
comment on table public.tulum_snapshot_holders is
  'Frozen holder set. Immutable once parent snapshot.is_frozen — enforced by trigger.';

create index if not exists tulum_holders_addr_idx
  on public.tulum_snapshot_holders (address_norm);

-- ---------------------------------------------------------------------------
-- wallets: one address <-> one FBID, permanent. No rebinding, ever.
-- ---------------------------------------------------------------------------
create table if not exists public.tulum_wallets (
  id           uuid primary key default gen_random_uuid(),
  fbid         uuid not null,                           -- auth.uid()
  chain        text not null check (chain in ('near','evm','solana')),
  address_norm text not null,
  scheme       text not null,                           -- 'nep413','eip4361','eip1271','solana-ed25519'
  bound_at     timestamptz not null default now(),
  unique (chain, address_norm)                          -- an address belongs to exactly one FBID
);
comment on table public.tulum_wallets is
  'Permanent address<->FBID binding. One address is claimable by exactly one FBID, forever.';

-- ---------------------------------------------------------------------------
-- nonces: single-use signing challenges, server-composed message
-- ---------------------------------------------------------------------------
create table if not exists public.tulum_nonces (
  id          uuid primary key default gen_random_uuid(),
  fbid        uuid not null,
  chain       text not null check (chain in ('near','evm','solana')),
  nonce       text not null unique,
  message     text not null,                            -- exact canonical string the wallet signs
  issued_at   timestamptz not null default now(),
  expires_at  timestamptz not null,
  consumed_at timestamptz
);
create index if not exists tulum_nonces_fbid_idx on public.tulum_nonces (fbid);

-- ---------------------------------------------------------------------------
-- attestations: append-only record of every claim attempt (matched or not)
-- ---------------------------------------------------------------------------
create table if not exists public.tulum_attestations (
  id                 uuid primary key default gen_random_uuid(),
  fbid               uuid not null,
  chain              text not null,
  address_norm       text not null,
  scheme             text not null,
  signature          text not null,
  nonce              text not null,
  snapshot_id        uuid references public.tulum_snapshots(id),
  matched            boolean not null,
  balance_at_snapshot numeric(78,0),
  created_at         timestamptz not null default now()
);
create index if not exists tulum_attestations_fbid_idx on public.tulum_attestations (fbid);

-- ---------------------------------------------------------------------------
-- credentials: append-only grants. Idempotent per (fbid, credential).
-- ---------------------------------------------------------------------------
create table if not exists public.tulum_credentials (
  id                   uuid primary key default gen_random_uuid(),
  fbid                 uuid not null,
  credential           text not null,
  source_snapshot_id   uuid references public.tulum_snapshots(id),
  source_attestation_id uuid references public.tulum_attestations(id),
  created_at           timestamptz not null default now(),
  unique (fbid, credential)
);

-- ---------------------------------------------------------------------------
-- xp ledger: append-only. Idempotent per (fbid, reason).
-- ---------------------------------------------------------------------------
create table if not exists public.tulum_xp_ledger (
  id         uuid primary key default gen_random_uuid(),
  fbid       uuid not null,
  amount     integer not null,
  reason     text not null,                             -- e.g. 'og:PETGAS_OG'
  credential text,
  source     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (fbid, reason)
);
create index if not exists tulum_xp_fbid_idx on public.tulum_xp_ledger (fbid);

-- ---------------------------------------------------------------------------
-- rate card: XP per credential. requires_validator/multiplier for future use.
-- ---------------------------------------------------------------------------
create table if not exists public.tulum_xp_rate_card (
  credential         text primary key,
  base_xp            integer not null,
  requires_validator boolean not null default false,
  multiplier_applies boolean not null default false
);

-- Seed the rate card. PETGAS split values are pinned by the build spec
-- (OG=200, ALLY=100); the rest are tunable starting points.
insert into public.tulum_xp_rate_card (credential, base_xp, requires_validator, multiplier_applies) values
  ('OG_JAGUAR',    500, false, false),
  ('TLMC_STEWARD', 300, false, false),
  ('PETGAS_OG',    200, false, false),
  ('PETGAS_ALLY',  100, false, false),
  ('XELVA_OG',     150, false, false),
  ('REFI_HOLDER',  100, false, true )
on conflict (credential) do nothing;

-- ============================================================================
-- SEALING TRIGGERS — a freeze is permanent. There is no unfreeze.
-- ============================================================================

-- Holders cannot be added/changed/removed once the parent snapshot is frozen.
create or replace function public.tulum_holders_sealed()
returns trigger language plpgsql as $$
declare
  v_frozen boolean;
begin
  select is_frozen into v_frozen from public.tulum_snapshots
    where id = coalesce(new.snapshot_id, old.snapshot_id);
  if v_frozen then
    raise exception 'tulum_snapshot_holders is sealed: snapshot % is frozen', coalesce(new.snapshot_id, old.snapshot_id);
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists tulum_holders_seal on public.tulum_snapshot_holders;
create trigger tulum_holders_seal
  before insert or update or delete on public.tulum_snapshot_holders
  for each row execute function public.tulum_holders_sealed();

-- Once frozen, the holder-set-defining columns can't change and a snapshot
-- can never be un-frozen. Metadata-only fields (notes) stay editable.
create or replace function public.tulum_snapshot_freeze_guard()
returns trigger language plpgsql as $$
begin
  if old.is_frozen then
    if new.is_frozen = false then
      raise exception 'tulum_snapshots: cannot unfreeze % — freezing is permanent', old.id;
    end if;
    if new.merkle_root  is distinct from old.merkle_root
    or new.block_height is distinct from old.block_height
    or new.holder_count is distinct from old.holder_count
    or new.balance_sum  is distinct from old.balance_sum
    or new.contract     is distinct from old.contract
    or new.config_hash  is distinct from old.config_hash then
      raise exception 'tulum_snapshots: % is frozen — holder-set-defining columns are sealed', old.id;
    end if;
  end if;
  if new.is_frozen and old.is_frozen = false and new.frozen_at is null then
    new.frozen_at := now();
  end if;
  return new;
end $$;

drop trigger if exists tulum_snapshot_guard on public.tulum_snapshots;
create trigger tulum_snapshot_guard
  before update on public.tulum_snapshots
  for each row execute function public.tulum_snapshot_freeze_guard();

-- Wallet bindings are permanent: block UPDATE/DELETE outright.
create or replace function public.tulum_wallets_permanent()
returns trigger language plpgsql as $$
begin
  raise exception 'tulum_wallets: address<->FBID bindings are permanent (no update/delete)';
end $$;

drop trigger if exists tulum_wallets_lock on public.tulum_wallets;
create trigger tulum_wallets_lock
  before update or delete on public.tulum_wallets
  for each row execute function public.tulum_wallets_permanent();

-- ============================================================================
-- RPCs (SECURITY DEFINER). The Worker verifies signatures BEFORE calling
-- tulum_claim_og with the service-role client; this RPC trusts that the caller
-- (service role) has already cryptographically verified the signature.
-- ============================================================================

-- Issue a single-use nonce + the exact canonical message to sign.
create or replace function public.tulum_issue_nonce(p_chain text, p_message text)
returns table (nonce text, message text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_nonce text := encode(extensions.gen_random_bytes(16), 'hex');
  v_expires timestamptz := now() + interval '10 minutes';
begin
  if v_uid is null then raise exception 'auth required'; end if;
  if p_chain not in ('near','evm','solana') then raise exception 'bad chain'; end if;
  insert into public.tulum_nonces (fbid, chain, nonce, message, expires_at)
    values (v_uid, p_chain, v_nonce, p_message, v_expires);
  return query select v_nonce, p_message, v_expires;
end $$;

-- Consume a verified claim: bind wallet, resolve against ALL frozen snapshots
-- on the chain, write attestations, grant credentials + one-time XP idempotently.
-- Called ONLY by the Worker (service role) AFTER signature verification.
create or replace function public.tulum_claim_og(
  p_user_id uuid, p_chain text, p_address text, p_scheme text,
  p_signature text, p_nonce text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_addr text := p_address;             -- already normalized by the Worker
  v_snap record;
  v_holder record;
  v_att_id uuid;
  v_xp integer;
  v_bound_fbid uuid;
  v_granted jsonb := '[]'::jsonb;
begin
  -- 1) consume the nonce (single use, unexpired, belongs to this user + chain)
  update public.tulum_nonces
     set consumed_at = now()
   where nonce = p_nonce and fbid = p_user_id and chain = p_chain
     and consumed_at is null and expires_at > now();
  if not found then raise exception 'nonce invalid, expired, or already used'; end if;

  -- 2) bind wallet permanently (or confirm it's already this FBID's)
  select fbid into v_bound_fbid from public.tulum_wallets
    where chain = p_chain and address_norm = v_addr;
  if v_bound_fbid is null then
    insert into public.tulum_wallets (fbid, chain, address_norm, scheme)
      values (p_user_id, p_chain, v_addr, p_scheme);
  elsif v_bound_fbid <> p_user_id then
    raise exception 'wallet already bound to a different FBID';
  end if;

  -- 3) resolve against every frozen snapshot on this chain
  for v_snap in
    select * from public.tulum_snapshots where chain = p_chain and is_frozen = true
  loop
    select * into v_holder from public.tulum_snapshot_holders
      where snapshot_id = v_snap.id and address_norm = v_addr;

    insert into public.tulum_attestations
      (fbid, chain, address_norm, scheme, signature, nonce, snapshot_id, matched, balance_at_snapshot)
      values (p_user_id, p_chain, v_addr, p_scheme, p_signature, p_nonce, v_snap.id,
              v_holder.address_norm is not null,
              v_holder.balance)
      returning id into v_att_id;

    if v_holder.address_norm is not null then
      -- grant credential (idempotent)
      insert into public.tulum_credentials (fbid, credential, source_snapshot_id, source_attestation_id)
        values (p_user_id, v_snap.credential, v_snap.id, v_att_id)
        on conflict (fbid, credential) do nothing;

      -- one-time XP for this credential (idempotent per fbid+reason)
      select base_xp into v_xp from public.tulum_xp_rate_card where credential = v_snap.credential;
      if v_xp is not null then
        insert into public.tulum_xp_ledger (fbid, amount, reason, credential, source)
          values (p_user_id, v_xp, 'og:' || v_snap.credential, v_snap.credential,
                  jsonb_build_object('snapshot_id', v_snap.id, 'attestation_id', v_att_id))
          on conflict (fbid, reason) do nothing;
      end if;

      if position(('"' || v_snap.credential || '"') in v_granted::text) = 0 then
        v_granted := v_granted || jsonb_build_object('credential', v_snap.credential, 'xp', coalesce(v_xp,0));
      end if;
    end if;
  end loop;

  return jsonb_build_object('granted', v_granted, 'profile', public.tulum_get_profile(p_user_id));
end $$;

-- Generic append-only XP grant, idempotent per (fbid, reason).
create or replace function public.tulum_award_xp(
  p_user_id uuid, p_amount integer, p_reason text, p_source jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.tulum_xp_ledger (fbid, amount, reason, source)
    values (p_user_id, p_amount, p_reason, coalesce(p_source, '{}'::jsonb))
    on conflict (fbid, reason) do nothing;
end $$;

-- Read a profile: credentials, total XP, bound wallets. Own record only unless
-- called by the service role (p_user_id may differ from auth.uid() then).
create or replace function public.tulum_get_profile(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is not null and v_caller <> p_user_id then
    raise exception 'can only read your own profile';
  end if;
  return jsonb_build_object(
    'fbid', p_user_id,
    'credentials', coalesce((select jsonb_agg(credential order by credential)
                             from public.tulum_credentials where fbid = p_user_id), '[]'::jsonb),
    'total_xp', coalesce((select sum(amount) from public.tulum_xp_ledger where fbid = p_user_id), 0),
    'wallets', coalesce((select jsonb_agg(jsonb_build_object('chain', chain, 'address', address_norm))
                         from public.tulum_wallets where fbid = p_user_id), '[]'::jsonb)
  );
end $$;

-- ============================================================================
-- RLS — users read their own rows; snapshot META is public (for the explainer);
-- holder sets are NOT publicly readable (privacy). All writes go through the
-- SECURITY DEFINER RPCs / service role.
-- ============================================================================
alter table public.tulum_snapshots          enable row level security;
alter table public.tulum_snapshot_holders   enable row level security;
alter table public.tulum_wallets            enable row level security;
alter table public.tulum_nonces             enable row level security;
alter table public.tulum_attestations       enable row level security;
alter table public.tulum_credentials        enable row level security;
alter table public.tulum_xp_ledger          enable row level security;
alter table public.tulum_xp_rate_card       enable row level security;

drop policy if exists tulum_snapshots_read on public.tulum_snapshots;
create policy tulum_snapshots_read on public.tulum_snapshots
  for select using (true);                    -- metadata only; holder rows stay private

drop policy if exists tulum_ratecard_read on public.tulum_xp_rate_card;
create policy tulum_ratecard_read on public.tulum_xp_rate_card
  for select using (true);

drop policy if exists tulum_wallets_own on public.tulum_wallets;
create policy tulum_wallets_own on public.tulum_wallets
  for select using (fbid = auth.uid());

drop policy if exists tulum_credentials_own on public.tulum_credentials;
create policy tulum_credentials_own on public.tulum_credentials
  for select using (fbid = auth.uid());

drop policy if exists tulum_xp_own on public.tulum_xp_ledger;
create policy tulum_xp_own on public.tulum_xp_ledger
  for select using (fbid = auth.uid());

drop policy if exists tulum_attestations_own on public.tulum_attestations;
create policy tulum_attestations_own on public.tulum_attestations
  for select using (fbid = auth.uid());

-- (no SELECT policy on tulum_snapshot_holders / tulum_nonces → only reachable
--  via SECURITY DEFINER RPCs and the service role. Deliberate.)

grant execute on function public.tulum_issue_nonce(text, text) to authenticated;
grant execute on function public.tulum_get_profile(uuid)       to authenticated;
-- tulum_claim_og / tulum_award_xp are service-role only (not granted to authenticated).
