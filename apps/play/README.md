# apps/play

Thin consumer renderer on FlowBond Core — a generated, art-directed mirror of a
real region that **heals when verified regeneration happens in the physical
world**. Neutral infra name on purpose; product branding lives only in
`lib/brand.ts` (provisional: "Kai World").

## Architecture (multi-renderer contract)

This app contains **zero business logic**. Every read is `kai_get_region` +
Realtime; every write is a SECURITY DEFINER RPC; all heavy assets stream from
Cloudflare R2. A future Unreal/console/dome client is just another renderer
against the same `kai_*` API.

- `@flowbond/state-engine` — pure health computation (indices + pulse → state).
- `@flowbond/world-runtime` — Spark splat scene + data-driven visual mapping.
- `@flowbond/mission-bridge` — proof submit/validate + soulbound XP client.

## Deploy — Cloudflare Workers (never Vercel)

```bash
pnpm --filter @flowbond/play cf:build
pnpm --filter @flowbond/play cf:preview   # local preview
pnpm --filter @flowbond/play cf:deploy    # to play.flowbond.life (needs auth)
```

Workflow: feature branch → `/test` Supabase branch → validation → production.
No direct pushes to prod.

## Dev

```bash
pnpm --filter @flowbond/play dev          # http://localhost:3070
# hidden state sliders (Phase 1): http://localhost:3070/r/valle-espejo?debug=1
```

## Status

Phase 0 scaffold. The splat asset, R2 bucket, and the DB migration
(`docs/kai-world/02_migration_kai_world.sql`) are pending — see that folder's
spec and the ADRs in `docs/adr/`.
