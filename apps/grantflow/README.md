# GrantFlow — the FlowBond funding engine

Discover every live grant worth applying to, score it against every FlowBond-ecosystem
project across five layers (web3 / ReFi / social / cultural / tech), and track each
application through a pipeline. Build budget for all of it — no equity given away.

## Stack

- Next.js 15 (App Router, Turbopack) on port **3012**
- Supabase (canonical FlowBond project `fgsrcxxccdjqyrpkitmk`, schema `grantflow`)

## Routes

| Route | Purpose |
|---|---|
| `/` | Dashboard — totals, deadlines closing within 60 days, highest-fit, browse-by-layer |
| `/grants` | Explorer with layer/status filters |
| `/grants/[id]` | Grant detail + **Track** (creates an application) |
| `/projects`, `/projects/[slug]` | FlowBond ecosystem projects |
| `/pipeline` | Application stages: discovered → researching → drafting → submitted → won / rejected / skipped |
| `/api/applications` | Service-role write endpoint (the `applications` table has no public policy) |

## Data model (`grantflow` schema)

`grants` · `projects` · `matches` (scored grant ↔ project fits) · `applications` · `sources`.
The public catalog (grants / projects / matches / sources) is read with the anon key;
`applications` is server-only via the service-role key.

## Run locally

```bash
cp .env.example .env.local   # fill NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY
pnpm install                 # from the monorepo root
pnpm --filter @flowbond/grantflow dev
```

Open http://localhost:3012.
