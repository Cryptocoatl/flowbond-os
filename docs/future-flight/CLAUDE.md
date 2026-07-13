# CLAUDE.md — Future Flight build context

> This file is standing context for any agent working on Future Flight. Read it fully
> before writing code. It encodes the rules that keep this build from drifting.

## What Future Flight is

A curated **innovation-journey** consumer brand. First edition: **Miami → Tulum,
Dec 8 2026**, bridging BitBasel (Dec 5–7) and Tulum Innovation Fest (Dec 9–12).

It is a **consumer app inside the FlowBond ecosystem** — not a standalone platform.

```
FlowBond OS
├── FlowBond Core   ← shared engines on canonical Supabase (fgsrcxxccdjqyrpkitmk)
│     FBID · FlowScrow · FlowShare · StableFlow/FlowXP · ClauDIA
├── Future Flight   ← THIS APP: thin ff_ domain layer, consumes Core
└── ReFi Rides      ← sibling app, same pattern
```

## Golden rules (do not violate)

1. **Never rebuild a Core engine.** Identity = FBID. Escrow = FlowScrow. Splits =
   FlowShare. Credits/loyalty = StableFlow. AI = ClauDIA. Import them; don't reimplement.
2. **Never write to the production Supabase directly.** Apply migrations on a **branch**,
   smoke-test, then merge via `feature branch → /test → validation → production`.
3. **All DB writes go through `SECURITY DEFINER` RPCs.** No direct client INSERT/UPDATE/
   DELETE on `ff_` tables. RLS is forced on every table.
4. **`ff_escrow_ledger` is append-only.** Corrections are reversing entries, never edits.
5. **No money moves in Phases 1–4.** Checkout writes the escrow *ledger*; the FlowShare
   settlement adapter (release + 50/50 split) stays behind the counsel / regulated-entity
   gate. Do not enable live settlement.
6. **Nothing hardcoded.** Prices, dates, tiers, aircraft, sponsor packages, copy → all
   from `ff_editions` / `ff_*_tiers` / CMS rows. No literals baked into JSX.
7. **No secrets in code or git.** Env only, scoped in Vercel.
8. **Stop at every phase gate** and wait for human review before proceeding.

## Conventions (Pattern A)

- Tables `ff_`-prefixed, FK root → `flowbond_users`, RLS forced, RPC-mediated writes,
  append-only ledgers.
- Stack: Next.js 15 App Router · TypeScript · Tailwind · shadcn/ui · Framer Motion ·
  React Query · Supabase. Monorepo: Turborepo + pnpm, org `Cryptocoatl`, repo `flowbond-os`.
- Detect and reuse existing shared packages (ui, supabase client, tsconfig, tailwind base).
  Match the repo — never introduce a parallel toolchain.
- Fonts: Orbitron (display) + Montserrat (body). Tokens in `design-system/`.

## Canonical facts

- Supabase project ref: **`fgsrcxxccdjqyrpkitmk`** (us-east-2, "FlowBond-life").
- Forbidden ref that does NOT exist and must never appear: `eoajujwpdkfuicnoxetk`.
- Domain: **`futureflight.flowme.one`** (host Vercel, DNS Cloudflare).
- Core prerequisites assumed by the schema: `public.flowbond_users`,
  `public.fb_current_user()`, `public.fb_is_admin()`. If names differ, adapt ONLY the two
  wrapper functions in §0 of `0001_future_flight_schema.sql` — stop and confirm first.

## Where to look

| File | Purpose |
|---|---|
| `ARCHITECTURE.md` | system design, engine mapping, phase overview |
| `BUILD.md` | the phased build script + acceptance gates (**run this**) |
| `SHIP.md` | deploy mechanics: static holding page, DNS, env, smoke |
| `supabase/migrations/0001_future_flight_schema.sql` | the schema |
| `index.html` | design source of truth for the landing |
| `design-system/` | tokens.css + tailwind.preset.ts |
| `BRAND-ASSETS.md` | asset filenames/dims the app expects |
