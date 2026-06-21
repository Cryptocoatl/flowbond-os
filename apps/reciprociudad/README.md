# Reciprociudad

Cinematic solarpunk landing for **Reciprociudad** — a living network of reciprocity
for CDMX, anchored in the regenerative intelligence of the lake-city (Tenochtitlan:
chinampas, canals, tianguis, calpulli).

Production Next.js 15 port of the self-contained reference `index.html`
(códice-solarpunk palette, WebGL water with real golden-hour reflections, ola
dividers, Fraunces / Hanken Grotesk / Space Mono).

- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · `@react-three/fiber` + `@react-three/drei` (three.js)
- **Port:** `3015` · **Domain:** [reciprociudad.lat](https://reciprociudad.lat) (Cloudflare → Vercel)
- **Identity:** FlowBond Layer 0 (canonical Supabase `fgsrcxxccdjqyrpkitmk`)

## Run

```bash
pnpm install                 # from the monorepo root
cp apps/reciprociudad/.env.example apps/reciprociudad/.env.local   # then fill SUPABASE_SERVICE_ROLE
pnpm --filter @flowbond/reciprociudad dev      # http://localhost:3015
```

`pnpm --filter @flowbond/reciprociudad typecheck` · `… build`

## Architecture

```
app/
  layout.tsx              next/font (Fraunces, Hanken Grotesk, Space Mono) + metadata/OG
  page.tsx                section composition + ola dividers (reference order)
  globals.css             the ported design system (tokens as CSS vars)
  components/
    Nav, Footer           shell
    HeroBackground        client island: sky/sun/SVG-layer parallax + WebGL mount + CSS fallback
    HeroScene             @react-three/fiber water (dynamic import, ssr:false)
    WaveDivider           ola SVG between sections
    Origen, Sistema, Viaje, Iniciativas   content sections (server)
    Social                Instagram follow + reel embed (embed.js via next/script)
    JoinFBID              the reciprociudad_join form → POST /api/fbid/link
    RevealManager         IntersectionObserver reveal (respects reduced-motion)
  api/fbid/link/route.ts  server-only join capture (service role)
lib/
  types.ts                domain types
  data.ts                 placeholder content (reference copy) + TODOs
  reciprociudad.ts        typed RPC data layer (captureJoin + published reads)
  supabase-server.ts      service-role client, schema `reciprociudad`
supabase/
  migrations/0001_reciprociudad.sql   schema (NOT applied — dry-run first)
  dry-run.sql                          BEGIN … ROLLBACK validation wrapper
```

### WebGL water

`HeroScene` reproduces the reference imperatively-built Three.js scene in R3F:
a `PlaneGeometry` displaced per-vertex by a sum-of-sines (`wave()`), normals
recomputed each frame; a `CubeCamera` captures a golden-hour sky scene (gradient
dome + sun sprite) into the water material's `envMap` (metalness 0.92, roughness
0.10) for a real mirrored sunset; drifting light motes; mouse-parallax camera.
`prefers-reduced-motion` → a single static frame (`frameloop="demand"`). If WebGL
is unavailable, the CSS `.water-fallback` shows instead.

## FBID flow (important)

`POST /api/fbid/link` — contract `{ email, app, flow } → { ok, fbid }`.

Today the route **validates the email and captures a join lead** into the
`reciprociudad` schema via the `reciprociudad_join` SECURITY DEFINER RPC, returning
the lead id as `fbid`. With no `SUPABASE_SERVICE_ROLE` set it runs in **demo mode**
(validate + ack, no write).

> **Why it's a lead, not a forged identity.** The canonical FBID
> (`public.flowbond_users.id` = `auth.users.id`) is minted/linked only by the
> sanctioned RPCs `link_auth_or_create_identity()` / `activate_app(slug)`, which
> act on the **current authenticated session** (`auth.uid()`) — they take no email
> argument and can't be driven by a service key alone. A bare email capture is
> therefore a lead. The BUILD.md sample signature
> (`linkAuthOrCreateIdentity({p_email,...})`) does not exist; this is the honest wiring.
>
> **TODO(fbid):** when the public auth surface (magic-link / OAuth via
> `@flowbond/auth`) is added, complete the link inside the session:
> `activate_app('reciprociudad')` (registers `flowbond_app_connections`) →
> `current_fbid` returns the real FBID. See the route's header comment.

## Data — prepared, not invented

- `lib/data.ts` holds the **placeholder copy from the reference** (iniciativas;
  events/services intentionally empty — nothing is fabricated).
- `lib/reciprociudad.ts` has the **typed RPC data layer** ready to swap in.
- `supabase/migrations/0001_reciprociudad.sql` defines `reciprociudad_*` tables
  (FK → `flowbond_users`), RLS deny-by-default, and the published-read RPCs.

**Open TODOs**
1. Apply the migration (dry-run first) and seed real `reciprociudad_iniciativas`.
2. Point sections at `getIniciativas()/getEventos()/getServicios()` once seeded.
3. Add the authed FBID link path (`@flowbond/auth`) and backfill `join.fbid`.
4. Regenerate the logo seal — the source art has typos ("AMA LO QUE HECESE",
   "RECIPROCUIDAD"); the wordmark already uses the correct grafía "Reciprociudad".
5. Decide IG feed: single reel embed (current) vs an aggregator.

## Env

| Var | Where | Purpose |
|---|---|---|
| `SUPABASE_URL` | server | canonical project URL (`fgsrcxxccdjqyrpkitmk`) |
| `SUPABASE_SERVICE_ROLE` | server only | join capture RPC; never exposed to client |
| `NEXT_PUBLIC_SITE_URL` | build | OG/canonical origin (`https://reciprociudad.lat`) |

> Never use the ref `eoajujwpdkfuicnoxetk` — it does not exist.

## Deploy

Vercel project for this app (root `apps/reciprociudad`, build via root pnpm filter
— see `vercel.json`). Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE` in Vercel.
`reciprociudad.lat` is already wired in Cloudflare → point it at this deployment.
