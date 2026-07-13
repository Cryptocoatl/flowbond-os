# Future Flight — Ship Runbook

Target domain: **`futureflight.flowme.one`**
Host: **Vercel** · DNS: **Cloudflare** (`flowme.one` zone)
Canonical Supabase: **`fgsrcxxccdjqyrpkitmk`** (FlowBond-life)

> Two tracks. Track 1 puts the brand live today (static holding page).
> Track 2 is the Claude Code build of the real `apps/future-flight` Next.js app.
> Run Track 1 now; hand Track 2 to Claude Code while you're in design.

Before anything: drop the reference files into the repo so the prompts can read them.
Copy the whole `future-flight/` output folder to **`docs/future-flight/`** in `flowbond-os`,
preserving subpaths:

```
docs/future-flight/
  ARCHITECTURE.md
  index.html
  supabase/migrations/0001_future_flight_schema.sql
  design-system/tokens.css
  design-system/tailwind.preset.ts
```

---

## TRACK 1 — Holding page live today (static, ~10 min)

No framework, no build. Ships the exact landing you just saw.

```bash
mkdir -p ff-holding && cp docs/future-flight/index.html ff-holding/index.html
cd ff-holding
npx vercel            # first run: log in, create project "future-flight"
npx vercel --prod     # promote to production, prints the *.vercel.app URL
```

Then attach the domain (CLI or dashboard — dashboard is fine):

```bash
npx vercel domains add futureflight.flowme.one   # then assign it to the project in the dashboard
```

Create the DNS record at Cloudflare (`flowme.one` zone → DNS → Add record):

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `futureflight` |
| Target | `cname.vercel-dns.com` |
| Proxy status | **DNS only** (grey cloud) — let Vercel issue SSL |
| TTL | Auto |

Vercel provisions the cert automatically once the CNAME resolves (usually < 5 min).
Done — `https://futureflight.flowme.one` is live. This is a placeholder the real app replaces.

---

## TRACK 2 — Build the real app (Claude Code prompts)

Run these from the `flowbond-os` repo root inside `claude`. They're sequenced —
finish and eyeball each before the next. Each prompt is self-contained; paste as-is.

### Prompt A — Scaffold the app

```
You are working inside the flowbond-os Turborepo (pnpm, Next.js 15 App Router, TypeScript).
Create a new app apps/future-flight.

Context: Future Flight is a CONSUMER app in the FlowBond ecosystem. It consumes FlowBond
Core engines (FBID identity, FlowScrow escrow, FlowShare splits, StableFlow credits) —
do NOT reimplement any of them. This app owns only a thin ff_-prefixed domain layer.
Read docs/future-flight/ARCHITECTURE.md first and follow it.

Tasks:
1. Inspect the repo and detect existing conventions (package manager, shared tsconfig,
   tailwind base, shadcn config, any shared supabase/ui packages). Match them exactly;
   do not introduce a different toolchain.
2. Scaffold apps/future-flight as Next.js 15 App Router + TypeScript using the repo's
   shared config packages where they exist.
3. Wire: TailwindCSS, shadcn/ui, Framer Motion, @tanstack/react-query, and the repo's
   shared Supabase client (or @supabase/supabase-js if none exists).
4. Design tokens: create styles/tokens.css from docs/future-flight/design-system/tokens.css
   and extend the Tailwind config with docs/future-flight/design-system/tailwind.preset.ts.
   Load Orbitron + Montserrat via next/font.
5. Route skeleton per ARCHITECTURE.md §5: (marketing), (app), (sponsor), (admin) groups.

Acceptance: `pnpm --filter future-flight dev` renders a themed blank page with the fonts
and tokens applied; `pnpm --filter future-flight build` passes. No secrets hardcoded.
Print the resulting file tree and stop.
```

### Prompt B — Build the landing from the reference

```
Build the Future Flight marketing landing at apps/future-flight/app/(marketing)/page.tsx.

Source of truth for layout, copy, sections, and motion: docs/future-flight/index.html.
Reproduce it faithfully as componentized React — one component per section: Nav, Hero,
Pillars, ExperienceTimeline, Tiers, Sponsors, FundingTiers, Passport, Included, Stats,
EscrowFlow, Footer — using the tokens already wired. No new colors or fonts.

Rules:
- Framer Motion for scroll-reveal, the countdown, the progress rings, and the live bar.
  Respect prefers-reduced-motion.
- Every price, date, seat count, funding level, and sponsor package is a typed prop with
  defaults matching the HTML, structured to later come from ff_editions / ff_*_tiers.
  Do NOT hardcode these inside JSX.
- Replace the placeholder SVG plane/monogram with <Image> slots pointing to
  /public/brand/* (leave placeholder assets; finals dropped in later).
- Responsive to mobile; visible keyboard focus.

Acceptance: build passes, landing matches the reference, Lighthouse a11y >= 95.
Print the component tree.
```

### Prompt C — Apply the schema (SAFE: branch, never prod)

```
Apply the Future Flight schema to the canonical Supabase project (ref fgsrcxxccdjqyrpkitmk,
"FlowBond-life") on a DEVELOPMENT BRANCH — never directly to production.

Migration: docs/future-flight/supabase/migrations/0001_future_flight_schema.sql

Steps:
1. Confirm Core prerequisites exist in the project: table public.flowbond_users and
   functions public.fb_current_user() and public.fb_is_admin(). If any are missing or
   named differently, STOP and report — do not invent them. The two wrapper functions in
   §0 of the migration are the ONLY adaptation point.
2. Create a Supabase branch, apply the migration there, and smoke-test:
   - all ff_ tables exist with RLS forced,
   - UPDATE/DELETE on ff_escrow_ledger is rejected by the append-only trigger,
   - v_ff_funding_progress returns rows.
3. Report the diff. Do NOT merge to production — I'll review and merge via the standard
   feature-branch -> /test -> production flow. No seed data in this step.
```

### Prompt D — Seed the Miami → Tulum edition

```
Create an idempotent seed migration docs/future-flight/supabase/migrations/0002_seed_miami_tulum.sql
(upserts only) with the catalog data from docs/future-flight/index.html:

- ff_editions: slug 'miami-tulum-2026', MIA -> TQO, departs 2026-12-08, USD,
  min_funding_target_cents = 18000000 ($180K).
- ff_ticket_tiers: Explorer $1,500/40, Founder $2,500/35, Visionary $5,000/20,
  Legacy $10,000/5, with the benefit arrays from the HTML.
- ff_membership_tiers: Explorer $499, Founder $999, Visionary $2,500 (annual).
- ff_aircraft + ff_funding_levels: L1 Regional Jet/$80K, L2 Embraer E195/$120K,
  L3 Boeing 737/$180K, L4 Full Production/$300K, with unlock arrays.
- ff_sponsor_packages: Presenting $150K/1, Platinum $50K/4, Gold $20K/10, Silver $10K/20.
- ff_escrow_accounts + ff_escrow_reserves: reserve bps MUST sum to exactly 10000.
  Use these PLACEHOLDERS and flag them clearly as finance/counsel-owned:
  fees 500, taxes 800, aircraft 4500, insurance 700, production 1500, logistics 800,
  contingency 700, distributable 500.
- ff_distribution_rules: FlowBond 5000 bps, Operating Partner 5000 bps.

Apply on the branch; verify v_ff_funding_progress shows $0 funded / $180K target. Report.
```

### Prompt E — Wire demand capture (Phase 1 money-free)

```
Wire the Phase 1 demand-capture flow in apps/future-flight — no payments yet.

1. FBID login: use the existing FlowBond Core auth client (linkAuthOrCreateIdentity,
   Google/Apple/LinkedIn/magic-link). Import it from the Core package — do NOT build new auth.
2. Application form at app/(app)/apply: collects desired tier + answers, submits via the
   ff_submit_application RPC (accepts an optional referral code). Show waitlist/approved state.
3. Referral capture: read ?ref= into the form and pass it through.
4. Read ff_editions + ff_ticket_tiers + ff_funding_levels from Supabase to render the
   landing's tiers and live funding bar from real rows (replace the hardcoded defaults).

Acceptance: a logged-in FBID user can submit an application that lands in ff_applications
with RLS enforced; the funding bar reflects v_ff_funding_progress. No direct client writes —
RPC only. Report.
```

### Prompt F — Deploy the real app to the subdomain

```
Deploy apps/future-flight to Vercel and attach futureflight.flowme.one.

1. Create/link a Vercel project with root directory apps/future-flight, framework Next.js,
   built through the Turborepo.
2. Set env vars from apps/future-flight/.env.example (values from the Vercel dashboard /
   secrets manager — never print secret values).
3. Deploy a preview, smoke-test, promote to production.
4. Move the domain futureflight.flowme.one from the holding project to this one and print
   the exact Cloudflare DNS record if it changes.

Report preview URL, production URL, and any DNS action needed.
```

---

## Environment variables

Create `apps/future-flight/.env.example`. Only the **NOW** block is needed to render the
landing + capture flow; the rest come online with their phases.

```dotenv
# ── NOW (landing + demand capture) ─────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://fgsrcxxccdjqyrpkitmk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # public anon key (RLS-protected)
SUPABASE_SERVICE_ROLE_KEY=          # server only — for RPC-invoking server actions
NEXT_PUBLIC_SITE_URL=https://futureflight.flowme.one

# ── PHASE 2 (sell) ─────────────────────────────────────────────
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
# USDC / smart-account + WalletConnect config via FlowBond Core

# ── PHASE 3+ (comms, maps, media, analytics) ───────────────────
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
NEXT_PUBLIC_MAPBOX_TOKEN=
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
CLOUDINARY_URL=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=futureflight.flowme.one
```

Never commit real values. Put secrets in Vercel project env (Production + Preview scopes).

---

## Smoke checklist (after Track 2)

- [ ] `futureflight.flowme.one` serves the Next.js app over HTTPS (valid cert).
- [ ] Landing renders tiers/funding from Supabase rows, not hardcoded defaults.
- [ ] FBID login works for Google + magic-link at minimum.
- [ ] Submitting an application writes one row to `ff_applications` (verify RLS: a second
      user cannot read the first user's application).
- [ ] `ff_escrow_ledger` rejects a manual UPDATE (append-only trigger fires).
- [ ] `v_ff_funding_progress` returns the seeded $0 / $180K target.
- [ ] Lighthouse: performance ≥ 90, a11y ≥ 95 on mobile.

---

## Guardrails (do not skip)

- **Schema goes to a branch first, never straight to production.** It's the shared
  canonical project — every consumer app lives there. Merge via feature-branch → `/test`
  → production only after review.
- **The migration assumes Core helpers exist** (`flowbond_users`, `fb_current_user`,
  `fb_is_admin`). If names differ, adapt only the two wrappers in §0 — nothing else.
- **No money moves in Phases 1–4.** Checkout (Phase 2) writes the escrow *ledger*; the
  FlowShare settlement adapter (release + 50/50 split) stays behind the Luis Javier /
  regulated-entity gate. Do not enable live settlement without that sign-off.
- **Reserve bps are placeholders.** Finance/counsel sets the real fees/taxes/aircraft/
  insurance/production/logistics/contingency split before any real payment.
- **You have Supabase + Vercel MCP connectors** connected if you'd rather do the DB apply
  and deploy conversationally instead of by terminal — same steps, same guardrails.
```

