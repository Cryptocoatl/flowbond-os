# FlowBond — Ecosystem Super Audit (Phase A)

**Date:** 2026-08-01 · **Auditor:** ClaudIA · **Mode:** read-only
**Canonical DB:** `fgsrcxxccdjqyrpkitmk` (FlowBond-life, us-east-2, `ACTIVE_HEALTHY`)

Everything below was verified against the live platforms (Supabase Management API, Cloudflare
API across all 25 zones, Vercel REST API paginated, live HTTP probes). Nothing is inferred
from filenames. Where a fact could not be established, it is listed under **Gaps** rather than
guessed.

---

## 0. Executive summary

Five things changed the picture materially versus the assumptions in the migration brief:

1. **Phase B is already done.** The canonical project sits in the paid `FlowBond Life` org
   (`ytimgkodjmagnpntvtqv`, plan `pro`), not the Vercel-managed org. Ref and region unchanged.
2. **The Cloudflare migration is ~50% complete already** — 24 Pages projects and 8 Workers are
   live, serving most flagship domains. The monorepo does not reflect this: only 3 of 24 apps
   carry Cloudflare config.
3. **The monorepo is not the ecosystem.** 54 Vercel projects and 24 Pages projects exist against
   24 apps in `flowbond-os`. A migration scoped to this repo covers roughly half the surface.
4. **One genuine data exposure**, and it is on the most sensitive asset in the ecosystem:
   Moon's Issa Codex audiobook is world-downloadable without credentials.
5. **The "194 tables with no RLS policy" figure is fail-closed, not an exposure.** Only `public`
   is API-reachable, and the tables in question have no `anon`/`authenticated` grants. Real
   count of API-exposed unprotected tables holding user data: **zero**.

---

## 1. Master inventory

### 1a. Live on Cloudflare (migration complete — 24 Pages projects)

| Pages project | Domain | Last deploy |
|---|---|---|
| voces | voces.world, www.voces.world, voces.flowme.one | 2026-08-02 |
| flowstudio-audio | audio.flowme.one | 2026-08-01 |
| tep-site | *(none — tuestratega.mx not on CF)* | 2026-08-01 |
| lavidaesbella | lavidaesbella.site, www | 2026-07-31 |
| legatum | legatum.lat, www.legatum.lat | 2026-07-30 |
| sanitemplo-ops | *(none)* | 2026-07-30 |
| codice-vivo | themayanexperience.flowme.one | 2026-07-28 |
| sanitemplo-sponsors | *(none)* | 2026-07-26 |
| tevosalgado | tevosalgado.com, www | 2026-07-18 |
| tulum-flowme | tulum.flowme.one | 2026-07-18 |
| legatum-site | legatum.flowme.one | 2026-07-16 |
| brandmark-web | brandmark.click | 2026-07-15 |
| flow-steph | steph.flowme.one | 2026-07-15 |
| flowchords | chords.flowme.one | 2026-07-15 |
| micelio | micelio.reciprociudad.lat | 2026-07-15 |
| moonchurch | moonchurch.space, www | 2026-07-15 |
| origo-site | origo.flowme.one | 2026-07-15 |
| timeflow | time.flowme.one | 2026-07-15 |
| flowbond-console | build.claudiaflow.life | 2026-07-13 |
| future-flight | futureflight.flowme.one | 2026-07-13 |
| kai-mundos | kai.flowbond.life | 2026-07-13 |
| legatum-staging | test.legatum.lat | 2026-07-13 |
| brandmark | *(none)* | 2026-07-07 |
| mohe-web-priview | *(none)* | 2026-05-20 |

**Workers (8):** `flowops` (ops.claudiaflow.life), `legatum-inbound`, `lvb-ops`, `tevo-ops`,
`abuela`, `tulum-verify-worker` (+`-test`), `sanitemplo-api-test`.

### 1b. Still on Vercel — the actual migration backlog

31 DNS records across the CF zones still resolve to Vercel, plus 4 domains whose DNS is not on
Cloudflare at all.

| Domain | Vercel project | Repo path | DB | Money | Status |
|---|---|---|---|---|---|
| claudiaflow.life, www | claudia | `apps/claudia` | ✅ | Stripe route | LIVE |
| grants.claudiaflow.life | claudia-grants | `apps/grantflow` | ✅ | — | LIVE |
| flowme.one, www | flowme | `~/Downloads/flowme` | ✅ | — | LIVE |
| flowbond.life, www | flow-bond-layer0 | `apps/flowbond-life`* | ✅ | — | LIVE |
| fbid.flowbond.life | fbid | `apps/fbid` | ✅ | — | LIVE |
| astro.flowbond.life | astroflow | `apps/astroflow` | ✅ | — | LIVE |
| deck.flowbond.life | flowbond-deck | `apps/deck` | — | — | LIVE |
| flowdesk.flowbond.life | flowdesk | `~/Projects/flowdesk` | ✅ | — | LIVE |
| dev.flowbond.life | flowbond-ops | — | ✅ | — | LIVE |
| flowbond.app, www | flowbond-app | `~/Projects/flowbond-app` | ✅ | — | LIVE |
| flowgarden.life, www | flowgarden | `apps/flowgarden` | ✅ | — | LIVE |
| studio/flowstudio/v3.flowme.one | flow3, flowstudio | `apps/flow3`, `apps/flowstudio` | ✅ | — | LIVE |
| translate.flowme.one | raiz-translation | — | ✅ | — | LIVE |
| kai.flowme.one | *(unresolved)* | — | ? | — | LIVE |
| reciprociudad.lat, www | reciprociudad | `apps/reciprociudad` | ✅ | — | LIVE |
| bañoseco.reciprociudad.lat | banoseco | `apps/banoseco` | ✅ | donations | LIVE |
| refirides.com, www | refirides | `~/Projects/REFI-Rides` | ✅ | Stripe+MP | LIVE |
| xelva.live, www | xelva-life | `~/Downloads/xelva.live` | ✅ | — | LIVE |
| lettheworld…moonchurch.space | site | `~/Projects/issa-codex` | ✅ | — | LIVE 🔴 |
| mountaindogs.app +2 | mountaindogs-app | — | ✅ | — | LIVE (DNS off-CF) |
| flownation.world +www | flownation | `~/Projects/flownation` | ✅ | — | LIVE (DNS off-CF) |
| cdmx/admin.flownation.world | flowcdmx | `~/Projects/flowcdmx` | ✅ | — | LIVE (DNS off-CF) |
| humanempowerment.vip, www | mohe-web | `~/Projects/mohe-web` | ✅ | — | LIVE (DNS off-CF) |
| mayatransferturquesa.com | maya-transfer-turquesa | `apps/admin` | ? | — | STALE (Apr) |
| holyhoney.flowme.one | — | — | — | — | 🔴 **BROKEN** |

\* `flowbond.life` is served from a separate repo, not `apps/`.

### 1c. `flowbond-os` workspaces (24 apps / 4 services / 17 packages)

Only `apps/play` (wrangler + OpenNext), `apps/tulum-verify-worker` and `apps/sanitemplo-api`
carry Cloudflare config. Everything else still has `vercel.json` or `.vercel/`.

Stale (>90 days, decommission candidates): `services/flowme` (2026-04-02),
`packages/sdk` (2026-04-29).

---

## 2. Findings, ranked

### 🔴 CRITICAL-1 — Moon's gated audiobook is world-downloadable

`studio-audio` is a **public** bucket containing `issa-codex-audiobook/` — 67 files, 262 MB,
including Moon's cloned voice. Verified with no credentials of any kind:

```
GET /storage/v1/object/public/studio-audio/issa-codex-audiobook/voice/009.mp3
HTTP/2 206 · audio/mpeg · 17,581,958 bytes
```

The book is sold as gated content behind a login at `lettheworldhearyourvoice.moonchurch.space`.
A broad SELECT policy (`sa_obj_read`) additionally lets any holder of the anon key — which ships
in every browser bundle — **list** the whole bucket, so the paths do not even need guessing.
This corroborates the standing note that "static files bypass the gate."

**Remediation:** flip `studio-audio` to private; drop `sa_obj_read`; serve via signed URLs
(`createSignedUrl`, short TTL) from the gated route only. Same treatment for `tevo-assets`.
Do this before any migration work — it is unrelated to hosting and live right now.

### 🔴 CRITICAL-2 — JWT secret exposed during this audit

`GET /v1/projects/{ref}/postgrest` returns the project's `jwt_secret` inline, and it printed to
stdout in this session. Redacted on disk (`tool-results/beafm79l2.txt`), but it persists in the
conversation transcript. That secret signs every anon and service-role key for the canonical
project — possession allows forging a `service_role` JWT.

**Remediation:** decide whether to rotate. Rotating invalidates every issued key across ~50
apps and is a coordinated redeploy, so it is a judgement call, not an automatic yes. My own
handling is fixed going forward: every Management API response is piped through a redactor.

### 🟠 HIGH-1 — Production code exists only on this laptop

Seven local branches have no `origin` counterpart, including live-serving work:
`feat/voces-ajustes-monica` + `voces/ajustes-monica-2026-08-01` (2026-08-01),
`feature/kai-world` (2026-08-01), `feat/astralflow`, `feat/openflow`, `feat/tep-site`,
`integration`. Plus 78 dirty working-tree paths — entire apps untracked (`codice-vivo`,
`sanitemplo-sponsors`, `packages/{lifeboat-core,mission-bridge,state-engine,world-runtime}`).

A disk failure loses live sites. **Remediation:** commit and push before Phase C touches
anything.

### 🟠 HIGH-2 — MP webhook has no signature verification

`vpa-mp-webhook/index.ts` performs no HMAC check. It mitigates by ignoring the request body and
re-querying MP with our own token, so a forged POST cannot mark an order paid — but the endpoint
is unauthenticated and can be induced to burn MP API quota. Being a Supabase Edge Function, it
also dies with any Supabase outage, which is the exact fault that triggered the August incident.

**Remediation:** move ingest to a Cloudflare Worker (verify → persist raw → 200) with Queues and
an async processor. This is Phase C work for the money-handling tier.

### 🟠 HIGH-3 — 241 SECURITY DEFINER functions executable by `anon`

Plus 418 executable by `authenticated`, and 10 SECURITY DEFINER **views** (8 of them
`app_vpa_*_public`). Each is an RLS bypass by construction. Most are almost certainly intended
public read paths, but 241 is too many to have been individually reasoned about.

**Remediation:** enumerate, and `REVOKE EXECUTE FROM anon` on everything not deliberately public.

### 🟡 MEDIUM-1 — `spatial_ref_sys` is world-writable

RLS off **and** `anon` holds `INSERT/UPDATE/DELETE/TRUNCATE`. The only table in the database
with anon write and no RLS. No PII, but an anonymous client can truncate it and break every
PostGIS query. Standard PostGIS artifact; still worth fixing.

### 🟡 MEDIUM-2 — Stale PII copy in `fbid_backup_20260604`

10 tables, RLS off, holding 12 users' identity data — auth snapshots, wallet connections, auth
accounts. **Not** API-reachable (schema not in `db_schema`, no anon grants), so this is not an
exposure — but it is an unnecessary second copy of identity data from June.
**Remediation:** confirm it is superseded, then drop the schema.

### 🟡 MEDIUM-3 — 7 unrestricted `anon INSERT` policies

`waitlist`, `flownation_waitlist`, `investor_events`, `moon_temple_respuestas`, `phoenix_claims`,
`xelva_project_applications`, `marketing.waitlist`. Intentional for public forms; the gap is the
absence of rate limiting. Spam/flooding risk, not a data leak.

### 🟡 MEDIUM-4 — `brandmark.click` is split across two platforms

Apex → Cloudflare Pages (`brandmark-web`); `www` → Vercel. Two different builds answer depending
on which host the visitor types.

### 🟡 MEDIUM-5 — `holyhoney.flowme.one` is broken

`CNAME → cname.vercel.dns.com` — a typo for `vercel-dns.com`. The record has never resolved.
The Holy Honey data room lives at `flowme.one/holy-honey` (a path), so nothing is down; the
record is stray and should be deleted.

### 🟢 CLEAN

- **No secrets in `flowbond-os` git history.** Pickaxe across all branches for Supabase JWTs,
  `sk_live_`, `sk_org_live_`, `APP_USR-`, SendGrid and Slack tokens: zero hits. Only
  `.env.example` files are tracked.
- **No `NEXT_PUBLIC_*` service-role/secret collisions** anywhere in the monorepo.
- **No service-role key reachable from a client bundle.** All 40 `SERVICE_ROLE` references are
  server-side (`lib/supabase/admin.ts`, edge functions, middleware).
- **No API-exposed table holds user data without protection.**

---

## 3. Storage — what consumed the quota

| Bucket | Public | Objects | Size |
|---|---|---|---|
| **event-drops** | private | 172 | **2,268 MB** |
| studio-audio | **public** 🔴 | 67 | 262 MB |
| studio-audio-master | private | 12 | 176 MB |
| flowstudio | private | 17 | 149 MB |
| flowgarden-photos | private | 15 | 55 MB |
| vpa-photos | public | 30 | 28 MB |
| *(10 others)* | | | < 3 MB total |

**`event-drops` alone is 77% of usage — 141 `.MOV` files totalling 2,096 MB.** Raw phone video
in a transactional Postgres-attached store. This is what blew the free tier and took down the
Voces webhook.

**All of the top five buckets belong in R2.** Combined ~2.9 GB → well inside R2's free tier.

---

## 4. Recommended order of work

**Before any migration:**
0. CRITICAL-1 (audiobook), HIGH-1 (push the branches), decide CRITICAL-2 (JWT rotation).

**Then, easiest and lowest-risk first** — every one of these is a static or near-static site
whose Cloudflare equivalent already exists or is trivial:

1. `deck.flowbond.life` → Pages *(no DB, no money, lowest blast radius)*
2. `translate.flowme.one`
3. `xelva.live`
4. `flowgarden.life`
5. `mayatransferturquesa.com` *(or kill — see §5)*
6. `dev.flowbond.life`
7. `flowdesk.flowbond.life`
8. `humanempowerment.vip`, `flownation.world`, `cdmx.flownation.world` *(these three also need
   DNS moved onto Cloudflare first — they are not in any CF zone today)*
9. `reciprociudad.lat` + `bañoseco.reciprociudad.lat`
10. `astro.flowbond.life` *(AstralFlow — branch is unpushed, resolve HIGH-1 first)*
11. `flowbond.app`, `flowbond.life` *(identity surface — needs care)*
12. `flowme.one` *(large, many subpaths)*
13. `claudiaflow.life` + `grants.claudiaflow.life`
14. `fbid.flowbond.life` **← auth hub; everything else depends on it, so it moves late**
15. `mountaindogs.app` *(real external users)*

**Money-handling tier, last, after 48h green:** `refirides.com` (Stripe + MP), `banoseco`
(donations), and the `vpa-mp-webhook` re-platform. Voces' *site* is already on Cloudflare — it
is only the Supabase Edge Functions behind it that still need the Worker treatment.

---

## 5. Kill rather than migrate

**Safe to delete — never deployed:** `voces-fix2`, `v0-flowbond-venue-system`, `project-uo7l5`.

**Superseded by a live Cloudflare Pages project** (verify the CF version is authoritative, then
delete the Vercel one): `flowchords`, `micelio`, `origo-site`, `timeflow`, `flow-steph`,
`brandmark-web`, `legatum`, `tulum-moon-temple`.

**Stale, no custom domain — confirm before deleting:** `web` (2026-01-18), `web-maya-transfers`,
`mtt-admin`, `maya-transfer-turquesa`, `heady-teddys-project`, `flowbond-os`, `flow-invest`,
`cdmx-flow`, `flowbond-live`, `flowbond-stack`, `flowbond-net`, `flowbond-reciprociudad`,
`kai-flow`, `flowbondhq-audit`, `flowbondtech-audit`.

⚠️ **Do not bulk-delete on "no custom domain."** `danz-now`, `tcf-promo` and `flowbondtech-audit`
are documented as live on their `.vercel.app` URLs. Each needs a check first.

**Repo:** `services/flowme`, `packages/sdk`.

---

## 6. Gaps — could not be established

| Gap | Why | Unblock |
|---|---|---|
| R2 bucket inventory | **R2 has never been enabled** on the account | Dashboard → R2 → Enable |
| D1 database inventory | Token lacks `D1:Read` | Add permission to `CLOUDFLARE_API_TOKEN` |
| Sibling project row counts | All 4 are `INACTIVE`/paused; a query needs a restore (a write) | Your approval to restore, read, re-pause |
| BrandMark's Supabase | Lives in a **fourth account** outside this PAT's reach | Separate credential |
| Vercel env var names | Not yet enumerated per project | Next pass — 54 projects × API call |
| `kai.flowme.one` owner | CNAME to Vercel, no matching project alias | Manual trace |

**Note on R2:** its never having been enabled is the root cause of the long-standing Kai World
`.spz` splat blocker and the Códice Vivo R2 blocker. Enabling it unblocks both, independently of
this migration.

---

## 7. Method

- Supabase: Management API with the owning PAT (`~/.claudia/supabase-sql.sh`). The MCP connector
  is OAuth-scoped to the Vercel-managed org and can no longer see the canonical project at all.
- Cloudflare: REST API with the vault's `CLOUDFLARE_API_TOKEN` — 25 zones, 91 A/AAAA/CNAME
  records, Pages (paginated — the default page size silently truncates at 10), Workers, KV, Queues.
- Vercel: REST API paginated with the CLI's token — 54 projects, not the 50 the MCP reports.
- Live HTTP probes to confirm which platform actually answers each contested domain.
