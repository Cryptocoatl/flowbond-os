-- ============================================================================
-- Future Flight — 0001 schema (Phase 0 foundation)
-- Canonical project: fgsrcxxccdjqyrpkitmk (FlowBond-life)
-- Pattern A: ff_ prefix · FK root to flowbond_users · RLS on all tables ·
--            all mutations via SECURITY DEFINER RPCs · append-only ledgers
--
-- Assumes FlowBond Core already provides:
--   public.flowbond_users(id uuid pk, ...)         -- FBID identity root
--   public.fb_current_user() -> uuid               -- resolves auth.uid() to FBID id
--   public.fb_is_admin() -> boolean                -- FlowBond admin check
-- If your helper names differ, adjust the two wrappers at the bottom of §0.
-- ============================================================================

set search_path = public;

-- §0 ── enums ----------------------------------------------------------------
do $$ begin
  create type ff_tier_code       as enum ('explorer','founder','visionary','legacy');
  create type ff_app_status      as enum ('submitted','under_review','interview','waitlist','approved','rejected','withdrawn');
  create type ff_ticket_status   as enum ('reserved','confirmed','transferred','checked_in','void');
  create type ff_membership_kind as enum ('monthly','annual','lifetime');
  create type ff_reserve_kind    as enum ('fees','taxes','aircraft','insurance','production','logistics','contingency','distributable');
  create type ff_ledger_dir      as enum ('debit','credit');
  create type ff_sponsor_status  as enum ('lead','negotiating','signed','active','completed','churned');
begin end; exception when duplicate_object then null; end $$;

-- shared helpers (thin wrappers over Core; keep the app decoupled from Core naming)
create or replace function ff_uid() returns uuid
  language sql stable as $$ select public.fb_current_user() $$;
create or replace function ff_is_admin() returns boolean
  language sql stable as $$ select coalesce(public.fb_is_admin(), false) $$;

-- ============================================================================
-- §1 ── EDITIONS + CMS (no hardcoded dates/prices anywhere)
-- ============================================================================
create table ff_editions (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,                       -- 'miami-tulum-2026'
  name          text not null,                              -- 'Miami → Tulum'
  origin_code   text not null,                              -- 'MIA'
  origin_name   text not null,                              -- 'Miami, USA'
  dest_code     text not null,                              -- 'TQO'
  dest_name     text not null,                              -- 'Tulum, Mexico'
  departs_at    timestamptz not null,                       -- 2026-12-08
  currency      text not null default 'USD',
  min_funding_target_cents bigint not null default 0,       -- release threshold
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table ff_edition_content (           -- landing / faq / legal / timeline blocks
  id          uuid primary key default gen_random_uuid(),
  edition_id  uuid not null references ff_editions(id) on delete cascade,
  block_key   text not null,                                -- 'hero','faq.pricing','legal.terms'
  body        jsonb not null default '{}'::jsonb,
  sort        int not null default 0,
  unique (edition_id, block_key)
);

-- ============================================================================
-- §2 ── PRODUCTS (ticket + membership tiers, fully config-driven)
-- ============================================================================
create table ff_ticket_tiers (
  id           uuid primary key default gen_random_uuid(),
  edition_id   uuid not null references ff_editions(id) on delete cascade,
  code         ff_tier_code not null,
  name         text not null,
  price_cents  bigint not null,
  seat_capacity int not null,
  seats_sold   int not null default 0,
  benefits     jsonb not null default '[]'::jsonb,          -- ["Flight Ticket","Welcome Kit",...]
  is_transferable boolean not null default true,
  sort         int not null default 0,
  unique (edition_id, code)
);

create table ff_membership_tiers (
  id           uuid primary key default gen_random_uuid(),
  code         ff_tier_code not null,                       -- explorer/founder/visionary
  kind         ff_membership_kind not null,
  name         text not null,
  price_cents  bigint not null,
  benefits     jsonb not null default '[]'::jsonb,
  is_active    boolean not null default true,
  unique (code, kind)
);

-- ============================================================================
-- §3 ── APPLICATIONS (apply · score · review · referral)
-- ============================================================================
create table ff_referrals (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  owner_id    uuid references flowbond_users(id) on delete set null,
  edition_id  uuid references ff_editions(id) on delete cascade,
  reward_cents bigint not null default 0,
  uses        int not null default 0,
  max_uses    int,
  created_at  timestamptz not null default now()
);

create table ff_applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references flowbond_users(id) on delete cascade,
  edition_id   uuid not null references ff_editions(id) on delete cascade,
  desired_tier ff_tier_code,
  status       ff_app_status not null default 'submitted',
  score        numeric(5,2),                                -- auto + manual
  answers      jsonb not null default '{}'::jsonb,
  referral_id  uuid references ff_referrals(id) on delete set null,
  submitted_at timestamptz not null default now(),
  decided_at   timestamptz,
  unique (user_id, edition_id)
);

create table ff_application_reviews (       -- append-only review trail
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references ff_applications(id) on delete cascade,
  reviewer_id    uuid references flowbond_users(id) on delete set null,
  score_delta    numeric(5,2),
  decision       ff_app_status,
  notes          text,
  created_at     timestamptz not null default now()
);

-- ============================================================================
-- §4 ── OWNED ASSETS (tickets · memberships)
-- ============================================================================
create table ff_tickets (
  id            uuid primary key default gen_random_uuid(),
  edition_id    uuid not null references ff_editions(id) on delete cascade,
  tier_id       uuid not null references ff_ticket_tiers(id),
  owner_id      uuid not null references flowbond_users(id) on delete cascade,
  status        ff_ticket_status not null default 'reserved',
  seat_label    text,
  qr_token      text unique not null default encode(gen_random_bytes(16),'hex'),
  price_paid_cents bigint not null,
  escrow_txn_id uuid,                                        -- links to ff_escrow_ledger
  checked_in_at timestamptz,
  created_at    timestamptz not null default now()
);
create index on ff_tickets(owner_id);
create index on ff_tickets(edition_id);

create table ff_ticket_transfers (         -- append-only transfer history
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references ff_tickets(id) on delete cascade,
  from_user   uuid references flowbond_users(id),
  to_user     uuid references flowbond_users(id),
  created_at  timestamptz not null default now()
);

create table ff_memberships (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references flowbond_users(id) on delete cascade,
  tier_id       uuid not null references ff_membership_tiers(id),
  active        boolean not null default true,
  started_at    timestamptz not null default now(),
  renews_at     timestamptz,
  stripe_sub_id text
);
create index on ff_memberships(user_id);

-- ============================================================================
-- §5 ── DIGITAL PASSPORT (identity core stays in flowbond_users / FBID;
--        this is the Future-Flight presentation + reputation layer)
-- ============================================================================
create table ff_passports (
  user_id           uuid primary key references flowbond_users(id) on delete cascade,
  headline          text,
  bio               text,
  industry          text,
  company           text,
  skills            text[]  not null default '{}',
  interests         text[]  not null default '{}',
  investment_interests text[] not null default '{}',
  social_links      jsonb   not null default '{}'::jsonb,
  community_score   int     not null default 0,
  reputation        int     not null default 0,
  is_public         boolean not null default false,
  updated_at        timestamptz not null default now()
);

create table ff_badges (
  id    uuid primary key default gen_random_uuid(),
  code  text unique not null,
  name  text not null,
  icon  text,
  criteria jsonb not null default '{}'::jsonb
);

create table ff_passport_badges (
  user_id    uuid not null references flowbond_users(id) on delete cascade,
  badge_id   uuid not null references ff_badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table ff_connections (
  id         uuid primary key default gen_random_uuid(),
  a_user     uuid not null references flowbond_users(id) on delete cascade,
  b_user     uuid not null references flowbond_users(id) on delete cascade,
  status     text not null default 'pending',              -- pending/accepted/blocked
  created_at timestamptz not null default now(),
  check (a_user <> b_user),
  unique (a_user, b_user)
);

create table ff_introductions (            -- ClauDIA matchmaking output
  id          uuid primary key default gen_random_uuid(),
  edition_id  uuid references ff_editions(id) on delete cascade,
  a_user      uuid not null references flowbond_users(id) on delete cascade,
  b_user      uuid not null references flowbond_users(id) on delete cascade,
  rationale   text,                                         -- why the match
  match_score numeric(5,2),
  scheduled_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- §6 ── ESCROW ("the heart") — FlowScrow binding, append-only double-entry
--        Ledger is source of truth. Settlement adapter is external + gated.
-- ============================================================================
create table ff_escrow_accounts (
  id            uuid primary key default gen_random_uuid(),
  edition_id    uuid not null unique references ff_editions(id) on delete cascade,
  currency      text not null default 'USD',
  aircraft_released boolean not null default false,          -- release latch
  released_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table ff_escrow_reserves (          -- bucket config per edition
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references ff_escrow_accounts(id) on delete cascade,
  kind        ff_reserve_kind not null,
  -- allocation as basis points of each inbound payment (must sum to 10000)
  alloc_bps   int not null check (alloc_bps between 0 and 10000),
  unique (account_id, kind)
);

-- APPEND ONLY. No UPDATE/DELETE. Corrections are reversing entries.
create table ff_escrow_ledger (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references ff_escrow_accounts(id) on delete restrict,
  reserve_kind ff_reserve_kind not null,
  direction   ff_ledger_dir not null,
  amount_cents bigint not null check (amount_cents > 0),
  ref_type    text,                                          -- 'ticket','release','distribution','reversal'
  ref_id      uuid,
  memo        text,
  created_by  uuid references flowbond_users(id),
  created_at  timestamptz not null default now()
);
create index on ff_escrow_ledger(account_id, reserve_kind);

create table ff_distribution_rules (       -- e.g. 50% FlowBond / 50% operating partner
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references ff_escrow_accounts(id) on delete cascade,
  payee_label text not null,
  payee_flowshare_ref text,                                  -- FlowShare connected account
  share_bps   int not null check (share_bps between 0 and 10000),
  unique (account_id, payee_label)
);

-- ============================================================================
-- §7 ── FUNDING LEVELS + AIRCRAFT (upgrade engine)
-- ============================================================================
create table ff_aircraft (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                                 -- 'Embraer E195'
  capacity    int not null,
  hero_image  text
);

create table ff_funding_levels (
  id            uuid primary key default gen_random_uuid(),
  edition_id    uuid not null references ff_editions(id) on delete cascade,
  level         int not null,                                -- 1..4
  name          text not null,                               -- 'Experience Upgrade'
  threshold_cents bigint not null,
  aircraft_id   uuid references ff_aircraft(id),
  unlocks       jsonb not null default '[]'::jsonb,          -- ["VIP Lounge","Documentary"]
  unique (edition_id, level)
);

-- ============================================================================
-- §8 ── SPONSORS
-- ============================================================================
create table ff_sponsor_packages (
  id          uuid primary key default gen_random_uuid(),
  edition_id  uuid not null references ff_editions(id) on delete cascade,
  name        text not null,                                 -- 'Presenting Partner'
  price_cents bigint not null,
  slots       int not null,
  benefits    jsonb not null default '[]'::jsonb,
  sort        int not null default 0
);

create table ff_sponsors (
  id          uuid primary key default gen_random_uuid(),
  edition_id  uuid not null references ff_editions(id) on delete cascade,
  owner_id    uuid references flowbond_users(id) on delete set null,
  package_id  uuid references ff_sponsor_packages(id),
  company     text not null,
  status      ff_sponsor_status not null default 'lead',
  created_at  timestamptz not null default now()
);

create table ff_sponsor_assets (
  id          uuid primary key default gen_random_uuid(),
  sponsor_id  uuid not null references ff_sponsors(id) on delete cascade,
  storage_path text not null,
  kind        text,                                          -- logo/video/deck
  created_at  timestamptz not null default now()
);

create table ff_sponsor_leads (            -- captured at the event
  id          uuid primary key default gen_random_uuid(),
  sponsor_id  uuid not null references ff_sponsors(id) on delete cascade,
  lead_user   uuid references flowbond_users(id),
  captured_at timestamptz not null default now()
);

-- ============================================================================
-- §9 ── FUNDING PROGRESS VIEW (drives the animated dashboard)
-- ============================================================================
create or replace view v_ff_funding_progress as
select
  e.id                       as edition_id,
  e.slug,
  e.min_funding_target_cents as min_target_cents,
  coalesce(sum(l.amount_cents) filter (where l.direction='credit'), 0)
    - coalesce(sum(l.amount_cents) filter (where l.direction='debit'), 0) as funded_cents,
  a.aircraft_released,
  (select fl.level from ff_funding_levels fl
     where fl.edition_id = e.id
       and fl.threshold_cents <=
           coalesce(sum(l.amount_cents) filter (where l.direction='credit'),0)
     order by fl.level desc limit 1)         as current_level
from ff_editions e
join ff_escrow_accounts a on a.edition_id = e.id
left join ff_escrow_ledger l on l.account_id = a.id
group by e.id, a.aircraft_released;

-- ============================================================================
-- §10 ── RPCs (all writes go through these; SECURITY DEFINER)
-- ============================================================================

-- Submit / upsert an application
create or replace function ff_submit_application(
  p_edition uuid, p_tier ff_tier_code, p_answers jsonb, p_referral_code text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := ff_uid(); v_ref uuid; v_app uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select id into v_ref from ff_referrals where code = p_referral_code;
  insert into ff_applications(user_id, edition_id, desired_tier, answers, referral_id)
  values (v_uid, p_edition, p_tier, coalesce(p_answers,'{}'::jsonb), v_ref)
  on conflict (user_id, edition_id)
    do update set desired_tier = excluded.desired_tier,
                  answers = excluded.answers,
                  status = 'submitted', submitted_at = now()
  returning id into v_app;
  if v_ref is not null then update ff_referrals set uses = uses + 1 where id = v_ref; end if;
  return v_app;
end $$;

-- Purchase a ticket. Records payment into escrow, fanned out to reserve buckets
-- by alloc_bps. `p_payment_ref` is the Stripe/USDC intent id (settled upstream).
create or replace function ff_purchase_ticket(
  p_tier uuid, p_payment_ref text, p_amount_cents bigint)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := ff_uid();
  v_edition uuid; v_price bigint; v_cap int; v_sold int; v_acct uuid;
  v_ticket uuid; r record; v_alloc bigint; v_first_ledger uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select edition_id, price_cents, seat_capacity, seats_sold
    into v_edition, v_price, v_cap, v_sold
  from ff_ticket_tiers where id = p_tier for update;

  if v_sold >= v_cap then raise exception 'tier sold out'; end if;
  if p_amount_cents < v_price then raise exception 'underpaid'; end if;

  select id into v_acct from ff_escrow_accounts where edition_id = v_edition;
  if v_acct is null then raise exception 'no escrow account for edition'; end if;

  -- reserve fan-out (bps must sum to 10000 across ff_escrow_reserves)
  for r in select kind, alloc_bps from ff_escrow_reserves where account_id = v_acct loop
    v_alloc := (p_amount_cents * r.alloc_bps) / 10000;
    if v_alloc > 0 then
      insert into ff_escrow_ledger(account_id, reserve_kind, direction, amount_cents,
                                   ref_type, ref_id, memo, created_by)
      values (v_acct, r.kind, 'credit', v_alloc, 'ticket', null,
              'payment '||p_payment_ref, v_uid)
      returning id into v_first_ledger;
    end if;
  end loop;

  insert into ff_tickets(edition_id, tier_id, owner_id, status,
                         price_paid_cents, escrow_txn_id)
  values (v_edition, p_tier, v_uid, 'confirmed', p_amount_cents, v_first_ledger)
  returning id into v_ticket;

  update ff_ticket_tiers set seats_sold = seats_sold + 1 where id = p_tier;
  return v_ticket;
end $$;

-- Transfer a ticket to another FBID user
create or replace function ff_transfer_ticket(p_ticket uuid, p_to uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := ff_uid(); v_owner uuid; v_transferable boolean;
begin
  select t.owner_id, tt.is_transferable into v_owner, v_transferable
  from ff_tickets t join ff_ticket_tiers tt on tt.id = t.tier_id
  where t.id = p_ticket for update;
  if v_owner is null then raise exception 'ticket not found'; end if;
  if v_owner <> v_uid then raise exception 'not ticket owner'; end if;
  if not v_transferable then raise exception 'tier not transferable'; end if;
  insert into ff_ticket_transfers(ticket_id, from_user, to_user)
  values (p_ticket, v_uid, p_to);
  update ff_tickets set owner_id = p_to, status = 'transferred' where id = p_ticket;
end $$;

-- Release aircraft payment. GUARDED: only when funded >= min target.
-- Records the release intent + distribution in the ledger. The actual
-- settlement to payees is executed by an EXTERNAL FlowShare adapter that reads
-- these ledger rows — kept behind the counsel/regulated-entity gate.
create or replace function ff_release_aircraft_payment(p_edition uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_acct uuid; v_funded bigint; v_target bigint; v_aircraft_reserve bigint;
  v_distributable bigint; r record;
begin
  if not ff_is_admin() then raise exception 'admin only'; end if;

  select a.id, e.min_funding_target_cents into v_acct, v_target
  from ff_escrow_accounts a join ff_editions e on e.id = a.edition_id
  where a.edition_id = p_edition and a.aircraft_released = false
  for update;
  if v_acct is null then raise exception 'no releasable escrow account'; end if;

  select funded_cents into v_funded from v_ff_funding_progress where edition_id = p_edition;
  if v_funded < v_target then
    raise exception 'funding target not met (% < %)', v_funded, v_target;
  end if;

  -- debit the aircraft reserve (release intent)
  select coalesce(sum(case when direction='credit' then amount_cents else -amount_cents end),0)
    into v_aircraft_reserve
  from ff_escrow_ledger where account_id = v_acct and reserve_kind = 'aircraft';

  insert into ff_escrow_ledger(account_id, reserve_kind, direction, amount_cents,
                               ref_type, memo, created_by)
  values (v_acct, 'aircraft', 'debit', v_aircraft_reserve, 'release',
          'aircraft payment release', ff_uid());

  -- distribute the distributable reserve by rule (50/50 etc.) — recorded, not settled
  select coalesce(sum(case when direction='credit' then amount_cents else -amount_cents end),0)
    into v_distributable
  from ff_escrow_ledger where account_id = v_acct and reserve_kind = 'distributable';

  for r in select payee_label, share_bps from ff_distribution_rules where account_id = v_acct loop
    insert into ff_escrow_ledger(account_id, reserve_kind, direction, amount_cents,
                                 ref_type, memo, created_by)
    values (v_acct, 'distributable', 'debit', (v_distributable * r.share_bps)/10000,
            'distribution', 'payout: '||r.payee_label, ff_uid());
  end loop;

  update ff_escrow_accounts set aircraft_released = true, released_at = now()
  where id = v_acct;
end $$;

-- ============================================================================
-- §11 ── RLS (enable on everything; RPC-mediated writes only)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'ff_editions','ff_edition_content','ff_ticket_tiers','ff_membership_tiers',
    'ff_referrals','ff_applications','ff_application_reviews','ff_tickets',
    'ff_ticket_transfers','ff_memberships','ff_passports','ff_badges',
    'ff_passport_badges','ff_connections','ff_introductions','ff_escrow_accounts',
    'ff_escrow_reserves','ff_escrow_ledger','ff_distribution_rules','ff_aircraft',
    'ff_funding_levels','ff_sponsor_packages','ff_sponsors','ff_sponsor_assets',
    'ff_sponsor_leads']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
  end loop;
end $$;

-- Public read for published catalog/CMS
create policy ff_editions_read on ff_editions for select using (is_published or ff_is_admin());
create policy ff_content_read  on ff_edition_content for select using (true);
create policy ff_tt_read on ff_ticket_tiers for select using (true);
create policy ff_mt_read on ff_membership_tiers for select using (is_active or ff_is_admin());
create policy ff_fl_read on ff_funding_levels for select using (true);
create policy ff_ac_read on ff_aircraft for select using (true);
create policy ff_sp_read on ff_sponsor_packages for select using (true);

-- Owner-scoped reads
create policy ff_app_owner on ff_applications for select
  using (user_id = ff_uid() or ff_is_admin());
create policy ff_ticket_owner on ff_tickets for select
  using (owner_id = ff_uid() or ff_is_admin());
create policy ff_membership_owner on ff_memberships for select
  using (user_id = ff_uid() or ff_is_admin());

-- Passport: public if flagged, else owner/admin
create policy ff_passport_read on ff_passports for select
  using (is_public or user_id = ff_uid() or ff_is_admin());
create policy ff_passport_self_write on ff_passports for update
  using (user_id = ff_uid()) with check (user_id = ff_uid());

-- Escrow ledger: admin read only from the client; writes are RPC-only (definer).
create policy ff_ledger_admin_read on ff_escrow_ledger for select using (ff_is_admin());
create policy ff_escrow_admin_read on ff_escrow_accounts for select using (ff_is_admin());

-- NOTE: no INSERT/UPDATE/DELETE policies are granted to end users on purpose.
-- All mutations flow through the SECURITY DEFINER RPCs above, which run as owner
-- and therefore bypass RLS deliberately and auditable-y.

-- ============================================================================
-- §12 ── guard: forbid mutation of the append-only escrow ledger
-- ============================================================================
create or replace function ff_ledger_no_mutate() returns trigger
  language plpgsql as $$
begin raise exception 'ff_escrow_ledger is append-only'; end $$;
create trigger ff_ledger_guard before update or delete on ff_escrow_ledger
  for each row execute function ff_ledger_no_mutate();
