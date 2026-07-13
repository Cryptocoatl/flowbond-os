# Future Flight — System Architecture

> Future Flight is a **consumer app** in the FlowBond ecosystem. It is a curated
> innovation-journey brand. It does **not** own identity, escrow, payments, or the
> ledger — it configures and consumes the FlowBond Core engines. This is the whole
> point of FlowBond being Layer 0.

First edition: **Miami → Tulum, Dec 8, 2026**, bridging BitBasel (Dec 5–7) and Tulum
Innovation Fest (Dec 9–12).

---

## 1. Where Future Flight sits

```
FlowBond OS
│
├── FlowBond Core  ← engines (shared, canonical Supabase project fgsrcxxccdjqyrpkitmk)
│     ├── FBID .................. identity root (flowbond_users, linkAuthOrCreateIdentity)
│     ├── FlowScrow ............. conditional-release escrow / reserve buckets
│     ├── FlowShare ............. no-custody split payouts (connected accounts, retained toll)
│     ├── FlowXP / StableFlow ... double-entry append-only ledger + closed-loop credits
│     └── ClauDIA ............... AI spend gate + matchmaking inference
│
├── Future Flight  ← THIS APP (ff_ schema, thin domain layer)
│     editions · tickets · funding tiers · aircraft · sponsors · applications · passport
│
└── ReFi Rides  ← sibling app (rr_ schema, reuses the same Core engines)
```

**Rule:** Future Flight tables are `ff_`-prefixed, RLS on every table, all mutations
through `SECURITY DEFINER` RPCs, all money movement expressed as append-only ledger
entries. FK root is always `flowbond_users`. No new users table, no new escrow engine,
no new payment custody. (Pattern A, per FlowBond discipline.)

---

## 2. Engine mapping — what NOT to rebuild

| Future Flight need | Do NOT build | Wire into |
|---|---|---|
| Login / member identity | new auth | **FBID** — `linkAuthOrCreateIdentity`, Google/Apple/LinkedIn/magic-link/SIWE |
| Digital Passport identity core | new profile store | `flowbond_users` + `ff_passports` presentation layer on top |
| Escrow ("the heart") | new escrow | **FlowScrow** — one escrow account per edition, reserve buckets, conditional release |
| Funding-target release logic | custom money logic | FlowScrow release rule gated on `funded_amount >= min_target` |
| 50/50 FlowBond / operating-partner split | custom payout | **FlowShare** distribution rules (connected accounts only, no custody) |
| Memberships / loyalty points / credits | new billing ledger | **StableFlow** on FlowXP ledger (closed-loop, not cash-redeemable) |
| AI matchmaking inference | direct Anthropic call | **ClauDIA** spend gate — nothing calls a paid API directly |

The only genuinely new backend surface is the `ff_` domain layer in §4.

---

## 3. Compliance gate (read before touching money)

The escrow **ledger + release logic** is in scope now: append-only, double-entry,
auditable, closed-loop. It is the source of truth.

The escrow **settlement rail** (actually moving fiat/USDC to the aircraft operator on
release) is a custody/money-movement decision — same locked posture as StableFlow and
PayMe Wallet:

- Ledger records intent and state; a **swappable settlement adapter** executes.
- No cash-out / custody drift by default.
- Fiat/USDC movement, minimum-funding release to a third party, and the profit split
  require **Luis Javier Moreno Alcalá** + US counsel sign-off and the correct regulated
  entity. Do not ship the live settlement adapter before that gate.

This lets us build and demo the entire funding dashboard against a real ledger today,
and swap in the regulated rail when counsel clears it.

---

## 4. Future Flight domain layer (the `ff_` schema)

Editable-everything (CMS-driven, zero hardcoded prices/dates/aircraft):

- **Editions & config** — `ff_editions`, `ff_edition_content` (landing/FAQ/legal blocks)
- **Products** — `ff_ticket_tiers`, `ff_membership_tiers` (Explorer/Founder/Visionary/Legacy)
- **Applications** — `ff_applications`, `ff_application_reviews`, `ff_referrals`
- **Owned assets** — `ff_tickets` (QR, transfer, upgrade), `ff_memberships`
- **Passport** — `ff_passports`, `ff_badges`, `ff_passport_badges`, `ff_connections`, `ff_introductions`
- **Escrow (FlowScrow binding)** — `ff_escrow_accounts`, `ff_escrow_reserves`, `ff_escrow_ledger`, `ff_distribution_rules`
- **Funding** — `ff_funding_levels`, `ff_aircraft`, `v_ff_funding_progress`
- **Sponsors** — `ff_sponsors`, `ff_sponsor_packages`, `ff_sponsor_assets`, `ff_sponsor_leads`

Full DDL + RPCs: [`supabase/migrations/0001_future_flight_schema.sql`](./supabase/migrations/0001_future_flight_schema.sql)

---

## 5. Frontend

Next.js 15 App Router · TypeScript · Tailwind · shadcn · Framer Motion · React Query —
inside the existing `flowbond-os` Turborepo as `apps/future-flight`. Shares the FBID
auth client, the Supabase client, and the design-system package.

Design tokens are derived directly from the brand boards (not invented):
[`design-system/tokens.css`](./design-system/tokens.css) and
[`design-system/tailwind.preset.ts`](./design-system/tailwind.preset.ts).

```
apps/future-flight/
  app/
    (marketing)/            landing · about · mission · experiences · sponsors · apply · blog · faq
    (app)/
      passport/             digital passport (identity from FBID, presentation from ff_passports)
      tickets/  membership/ community/  matchmaking/
      funding/              live escrow + funding-tier dashboard
    (sponsor)/dashboard/    sponsor portal
    (admin)/                CMS + admin panel
  components/
  lib/
    fbid/                   ← imported from Core, not reimplemented
    flowscrow/  flowshare/  stableflow/  claudia/
```

---

## 6. Build sequence (ship in slices, not one big bang)

**Phase 0 — Foundation (done in this drop)**
Schema, RLS, escrow ledger + release RPCs, funding progress view, design tokens.

**Phase 1 — Public + capture (2–3 wks)**
Marketing site from brand boards, `ff_applications` + referral flow, waitlist. FBID login.
No money yet — pure demand capture for the Dec 8 edition.

**Phase 2 — Sell (2–3 wks)**
Ticket tiers + Stripe/USDC checkout → **writes into the FlowScrow ledger** (reserve buckets).
Digital Passport v1 (Apple/Google Wallet pass). Live funding dashboard reading `v_ff_funding_progress`.

**Phase 3 — Community + AI (2–3 wks)**
Private feed, circles, ClauDIA matchmaking + intro scheduling, experience timeline.

**Phase 4 — Sponsor + Airline + Admin (3–4 wks)**
Sponsor dashboard, aircraft/funding-tier CMS, full admin. Airline manifest/seat-map module.

**Phase 5 — Settlement gate**
Only after counsel: enable the FlowShare settlement adapter for release + 50/50 split.

---

## 7. Non-negotiables

- Every `ff_` table: RLS enabled, no direct client writes, RPC-mediated only.
- Escrow ledger append-only — no UPDATE/DELETE, ever. Corrections are reversing entries.
- Deploy workflow for all of this: feature branch → `/test` → validation → production.
- No hardcoded prices/dates/aircraft — all CMS rows in `ff_editions` / `ff_*_tiers`.
- One canonical Supabase project. `eoajujwpdkfuicnoxetk` does not exist; never reference it.
