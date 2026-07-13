# Future Flight — build package

Everything needed to build and ship **Future Flight** (Miami → Tulum, Dec 8 2026) as a
consumer app in the FlowBond ecosystem, live at `futureflight.flowme.one`.

## Start here

1. Copy this whole folder into `flowbond-os` at **`docs/future-flight/`** (keep subpaths).
2. Also copy `CLAUDE.md` to the repo root (or merge into an existing root `CLAUDE.md`) so
   the agent auto-loads the guardrails.
3. Open a terminal in the repo root, run `claude`, and paste the **kickoff prompt** below.
4. (Optional, parallel) get the brand live in ~10 min via `SHIP.md` → Track 1.

## The kickoff prompt (paste into terminal)

```
You are the lead engineer building Future Flight inside this repo (flowbond-os).

Read these first, in order, and treat them as binding:
  docs/future-flight/CLAUDE.md          (guardrails + conventions — do not violate)
  docs/future-flight/ARCHITECTURE.md    (system design + engine mapping)
  docs/future-flight/BUILD.md           (the phased build script you will execute)

Then execute BUILD.md phase by phase, starting at Phase 0. Hard rules:
  - Do ONE phase, run its ✅ acceptance checks, print what changed + results, then STOP
    and wait for my "go" before the next phase.
  - Never write to the production Supabase (fgsrcxxccdjqyrpkitmk) directly — branch only.
  - Never reimplement a FlowBond Core engine (FBID, FlowScrow, FlowShare, StableFlow,
    ClauDIA) — import from Core.
  - If a Core prerequisite (flowbond_users / fb_current_user / fb_is_admin) isn't found
    under that name, STOP and ask me.
  - No secrets in code or git. RPC-mediated DB writes only.

Begin Phase 0 now: read the docs, inspect the repo conventions, and report your scaffold
plan for apps/future-flight before creating files.
```

## Folder map

| File | Role |
|---|---|
| `README.md` | this index |
| `CLAUDE.md` | standing agent context — guardrails, conventions, engine map, canonical facts |
| `ARCHITECTURE.md` | system design, engine mapping, phase overview, repo structure |
| `BUILD.md` | **the build script** — phases, task prompts, acceptance gates (plan of record) |
| `SHIP.md` | deploy mechanics — static holding page, Cloudflare DNS, env, smoke checklist |
| `BRAND-ASSETS.md` | asset filenames/dimensions the app expects in `public/brand/` |
| `.env.example` | env template (now / phase-2 / phase-3 blocks) |
| `index.html` | design source of truth for the landing (renders standalone) |
| `design-system/tokens.css` | brand CSS variables |
| `design-system/tailwind.preset.ts` | Tailwind preset mapping the tokens |
| `supabase/migrations/0001_future_flight_schema.sql` | the schema (Pattern A, RLS, RPCs, escrow ledger) |

## Non-negotiables (full list in CLAUDE.md)

- Consumer app on the canonical Supabase project; **never** rebuild Core engines.
- Migrations on a **branch** → `/test` → validation → production. Never straight to prod.
- RLS forced, RPC-only writes, `ff_escrow_ledger` append-only.
- **No money moves in Phases 1–4.** Settlement (release + 50/50 split) is behind the
  Luis Javier / regulated-entity gate.
- Reserve bps in the seed are **placeholders** — finance/counsel sets the real split.
- Domain spelling: `futureflight.flowme.one` (confirm before creating the DNS record).
