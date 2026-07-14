-- ============================================================================
-- Future Flight — 0002 seed (Miami → Tulum, Dec 8 2026)
-- Idempotent (upserts). Catalog data mirrors docs/future-flight/index.html.
-- Reserve bps below are PLACEHOLDERS — finance/counsel owns the real split.
-- ============================================================================
do $$
declare
  v_ed   uuid;
  v_acct uuid;
  v_ac1 uuid; v_ac2 uuid; v_ac3 uuid; v_ac4 uuid;
begin
  -- ── edition ───────────────────────────────────────────────────────────────
  insert into ff_editions(slug,name,origin_code,origin_name,dest_code,dest_name,
                          departs_at,currency,min_funding_target_cents,is_published)
  values('miami-tulum-2026','Miami → Tulum','MIA','Miami, USA','TQO','Tulum, Mexico',
         '2026-12-08T09:30:00-05:00','USD',18000000,true)
  on conflict (slug) do update set
    name=excluded.name, origin_code=excluded.origin_code, origin_name=excluded.origin_name,
    dest_code=excluded.dest_code, dest_name=excluded.dest_name, departs_at=excluded.departs_at,
    currency=excluded.currency, min_funding_target_cents=excluded.min_funding_target_cents,
    is_published=excluded.is_published, updated_at=now()
  returning id into v_ed;

  -- ── ticket tiers ─────────────────────────────────────────────────────────
  insert into ff_ticket_tiers(edition_id,code,name,price_cents,seat_capacity,benefits,is_transferable,sort) values
    (v_ed,'explorer','Explorer',150000,40,'["Flight Ticket","Welcome Kit","Community Access","Digital Passport","Arrival Experience"]',true,1),
    (v_ed,'founder','Founder',250000,35,'["Everything in Explorer","AI Matchmaking","Priority Networking","Premium Seating","Partner Offers"]',true,2),
    (v_ed,'visionary','Visionary',500000,20,'["Everything in Founder","VIP Lounge Access","Investor Introductions","Featured Profile","Concierge Support"]',true,3),
    (v_ed,'legacy','Legacy Circle',1000000,5,'["Everything in Visionary","Private Dinner","Executive Concierge","Media Feature","Legacy Membership"]',true,4)
  on conflict (edition_id,code) do update set
    name=excluded.name, price_cents=excluded.price_cents, seat_capacity=excluded.seat_capacity,
    benefits=excluded.benefits, sort=excluded.sort;

  -- ── memberships (annual) ──────────────────────────────────────────────────
  insert into ff_membership_tiers(code,kind,name,price_cents,benefits,is_active) values
    ('explorer','annual','Explorer',49900,'["Community","Events","Partner Offers"]',true),
    ('founder','annual','Founder',99900,'["Community","Events","Partner Offers","Early Access"]',true),
    ('visionary','annual','Visionary',250000,'["Community","Events","Partner Offers","Early Access","Concierge"]',true)
  on conflict (code,kind) do update set
    name=excluded.name, price_cents=excluded.price_cents, benefits=excluded.benefits, is_active=excluded.is_active;

  -- ── aircraft (no unique key → guard by name) ──────────────────────────────
  select id into v_ac1 from ff_aircraft where name='Regional Jet';
  if v_ac1 is null then insert into ff_aircraft(name,capacity) values('Regional Jet',50)  returning id into v_ac1; end if;
  select id into v_ac2 from ff_aircraft where name='Embraer E195';
  if v_ac2 is null then insert into ff_aircraft(name,capacity) values('Embraer E195',120) returning id into v_ac2; end if;
  select id into v_ac3 from ff_aircraft where name='Boeing 737';
  if v_ac3 is null then insert into ff_aircraft(name,capacity) values('Boeing 737',180)   returning id into v_ac3; end if;
  select id into v_ac4 from ff_aircraft where name='Full Production';
  if v_ac4 is null then insert into ff_aircraft(name,capacity) values('Full Production',200) returning id into v_ac4; end if;

  -- ── funding levels L1..L4 ─────────────────────────────────────────────────
  insert into ff_funding_levels(edition_id,level,name,threshold_cents,aircraft_id,unlocks) values
    (v_ed,1,'Launch',              8000000, v_ac1,'["Flight Confirmed","Welcome Kit","Community Access"]'),
    (v_ed,2,'Experience Upgrade', 12000000, v_ac2,'["VIP Lounge","Media Crew","AI Matchmaking","Better Catering"]'),
    (v_ed,3,'Signature Experience',18000000,v_ac3,'["Podcast Studio","Investor Lounge","Documentary","Brand Activations"]'),
    (v_ed,4,'Legendary Edition',  30000000, v_ac4,'["Celebrity Keynote","Premium Activation","Global Live Stream"]')
  on conflict (edition_id,level) do update set
    name=excluded.name, threshold_cents=excluded.threshold_cents, aircraft_id=excluded.aircraft_id, unlocks=excluded.unlocks;

  -- ── sponsor packages (no unique key → guard by (edition,name)) ────────────
  insert into ff_sponsor_packages(edition_id,name,price_cents,slots,benefits,sort)
  select v_ed, x.name, x.price, x.slots, x.benefits::jsonb, x.sort from (values
    ('Presenting Partner',15000000,1, '["Naming Rights","Aircraft Branding","All Media & Content","Speaking Opportunity"]',1),
    ('Platinum Partner',   5000000,4, '["Own a Major Experience","Founder Lounge / Podcast Studio","Investor Hub / Welcome Celebration"]',2),
    ('Gold Partner',       2000000,10,'["Own an Activation","Coffee / Wellness / AI Demo","Charging Stations / Gifts"]',3),
    ('Silver Partner',     1000000,20,'["Brand Visibility Across","Digital Channels / Welcome Kit","Community / Social / Web"]',4)
  ) x(name,price,slots,benefits,sort)
  where not exists (select 1 from ff_sponsor_packages sp where sp.edition_id=v_ed and sp.name=x.name);

  -- ── escrow account + reserve buckets (bps sum = 10000; PLACEHOLDERS) ──────
  insert into ff_escrow_accounts(edition_id,currency) values(v_ed,'USD')
  on conflict (edition_id) do nothing;
  select id into v_acct from ff_escrow_accounts where edition_id=v_ed;

  insert into ff_escrow_reserves(account_id,kind,alloc_bps) values
    (v_acct,'fees',500),(v_acct,'taxes',800),(v_acct,'aircraft',4500),(v_acct,'insurance',700),
    (v_acct,'production',1500),(v_acct,'logistics',800),(v_acct,'contingency',700),(v_acct,'distributable',500)
  on conflict (account_id,kind) do update set alloc_bps=excluded.alloc_bps;

  -- ── distribution rule: 50% FlowBond / 50% Operating Partner ───────────────
  insert into ff_distribution_rules(account_id,payee_label,share_bps) values
    (v_acct,'FlowBond',5000),(v_acct,'Operating Partner',5000)
  on conflict (account_id,payee_label) do update set share_bps=excluded.share_bps;

  -- ── bootstrap referral codes (owner_id null until artists claim FBID; a
  --    superadmin later re-owns via ff_create_referral(code, <fbid>, ...)) ────
  insert into ff_referrals(code,edition_id,reward_cents,max_uses)
  select c.code, v_ed, 0, null from (values
    ('FF-STEPH'),('FF-GLATT'),('FF-SCOTT'),('FF-MOON'),('FF-LUNAR'),('FF-BITBASEL')
  ) c(code)
  where not exists (select 1 from ff_referrals r where r.code = c.code);

end $$;

-- sanity: reserve bps must total exactly 10000
do $$
declare v_sum int;
begin
  select coalesce(sum(alloc_bps),0) into v_sum
  from ff_escrow_reserves rv
  join ff_escrow_accounts ac on ac.id=rv.account_id
  join ff_editions e on e.id=ac.edition_id
  where e.slug='miami-tulum-2026';
  if v_sum <> 10000 then raise exception 'reserve bps must sum to 10000, got %', v_sum; end if;
end $$;
