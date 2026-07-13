# BUILD.md — Future Flight build script

Plan of record. Run phases **in order**, stop at each ✅ gate for human review.
Deploy mechanics (static holding page, DNS, env, smoke) live in `SHIP.md`.

## Operating protocol

- One phase at a time. After each phase, print what changed + the acceptance results,
  then **stop and wait** for "go".
- Database work happens on a **Supabase branch** off `fgsrcxxccdjqyrpkitmk`, never prod.
- No secrets printed or committed. No Core engine reimplemented. RPC-only writes.
- If a Core prerequisite name doesn't match, **stop and ask** — don't invent it.

---

## Phase 0 — Scaffold  ⏱ ~30 min

**Task**
```
Read docs/future-flight/CLAUDE.md and ARCHITECTURE.md. Inspect flowbond-os and detect its
conventions (package manager, shared tsconfig, tailwind base, shadcn config, shared
supabase/ui packages). Scaffold apps/future-flight as Next.js 15 App Router + TypeScript,
reusing shared config packages. Wire Tailwind, shadcn/ui, Framer Motion, @tanstack/react-query,
and the repo's Supabase client. Create styles/tokens.css from docs/future-flight/design-system/
tokens.css, extend Tailwind with design-system/tailwind.preset.ts, load Orbitron + Montserrat
via next/font. Create the route groups (marketing)/(app)/(sponsor)/(admin) per ARCHITECTURE.md §5.
```
**✅ Gate:** `pnpm --filter future-flight dev` shows a themed blank page (fonts + tokens
applied); `pnpm --filter future-flight build` passes. Print the file tree.

---

## Phase 1 — Landing  ⏱ ~half day

**Task**
```
Build apps/future-flight/app/(marketing)/page.tsx from docs/future-flight/index.html as the
layout/copy/motion source of truth. One component per section: Nav, Hero, Pillars,
ExperienceTimeline, Tiers, Sponsors, FundingTiers, Passport, Included, Stats, EscrowFlow,
Footer. Framer Motion for scroll-reveal, countdown, progress rings, live bar (respect
prefers-reduced-motion). Every price/date/seat/level/package is a typed prop with defaults
matching the HTML — structured to later come from Supabase, never hardcoded in JSX. Swap the
placeholder plane/monogram for <Image> slots at /public/brand/* per BRAND-ASSETS.md.
Responsive to mobile, visible keyboard focus.
```
**✅ Gate:** build passes; landing matches the reference; Lighthouse a11y ≥ 95. Deploy the
static holding page now via SHIP.md Track 1 so `futureflight.flowme.one` is live in parallel.

---

## Phase 2 — Schema (branch only)  ⏱ ~30 min

**Task**
```
Apply docs/future-flight/supabase/migrations/0001_future_flight_schema.sql to project
fgsrcxxccdjqyrpkitmk on a DEVELOPMENT BRANCH. First confirm public.flowbond_users,
public.fb_current_user(), public.fb_is_admin() exist — if any is missing/renamed, STOP and
report; the two §0 wrappers are the only adaptation point. Smoke-test on the branch: all ff_
tables exist with RLS forced; UPDATE/DELETE on ff_escrow_ledger is rejected; v_ff_funding_progress
returns rows. Report the diff. Do NOT merge to production.
```
**✅ Gate:** branch green on all three smoke checks; diff reviewed by human before merge.

---

## Phase 3 — Seed the edition  ⏱ ~30 min

**Task**
```
Create idempotent 0002_seed_miami_tulum.sql (upserts) with catalog data from index.html:
edition miami-tulum-2026 (MIA→TQO, 2026-12-08, USD, min target $180K = 18000000 cents);
ticket tiers Explorer/Founder/Visionary/Legacy; annual memberships; aircraft + funding levels
L1–L4 ($80K/$120K/$180K/$300K); sponsor packages Presenting/Platinum/Gold/Silver; escrow account
+ reserves (bps summing to exactly 10000 — use placeholders fees 500/taxes 800/aircraft 4500/
insurance 700/production 1500/logistics 800/contingency 700/distributable 500, FLAGGED as
finance/counsel-owned); distribution rules FlowBond 5000 / Operating Partner 5000. Apply on the
branch; verify v_ff_funding_progress shows $0 funded / $180K target.
```
**✅ Gate:** seed applied on branch; funding view correct; reserve split flagged for finance sign-off.

---

## Phase 4 — Demand capture (money-free)  ⏱ ~1 day

**Task**
```
Wire Phase 1 capture in apps/future-flight — no payments. (1) FBID login via the existing Core
auth client (linkAuthOrCreateIdentity: Google/Apple/LinkedIn/magic-link) — import, don't rebuild.
(2) Application form at app/(app)/apply → ff_submit_application RPC (optional referral code),
render waitlist/approved state. (3) Read ?ref= into the form. (4) Render the landing's tiers and
live funding bar from ff_editions/ff_ticket_tiers/ff_funding_levels + v_ff_funding_progress
instead of the hardcoded defaults.
```
**✅ Gate:** a logged-in FBID user submits an application → one row in ff_applications; a second
user cannot read it (RLS verified); funding bar reads live view; no direct client writes.

---

## Phase 5 — Ship the real app  ⏱ ~30 min

**Task**
```
Deploy apps/future-flight to Vercel (root apps/future-flight, framework Next.js, built via
Turborepo). Set env from apps/future-flight/.env.example (values in Vercel dashboard — never
print). Preview → smoke → production. Move futureflight.flowme.one from the holding project to
this one; print any Cloudflare DNS change. Report preview + production URLs.
```
**✅ Gate:** SHIP.md smoke checklist passes on `https://futureflight.flowme.one`.

---

## After Phase 5 (not in this run — separate gated work)

- Payments (Stripe + USDC) → checkout writes the escrow **ledger** only.
- FlowShare settlement adapter (release + 50/50) — **counsel / regulated-entity gate**.
- Community, ClauDIA matchmaking, sponsor dashboard, airline module, full admin/CMS.
