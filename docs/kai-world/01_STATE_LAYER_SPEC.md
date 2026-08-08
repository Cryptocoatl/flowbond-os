# 01 · STATE LAYER SPEC — Kai World / Living Earth (V1)

> **Status: DRAFT authored for Love's review.** These files did not exist in the
> hand-off folder; ClaudIA authored them from the build thesis + FlowBond
> Pattern A precedent (`voces`, `muse`). **Nothing is applied to Supabase until
> Love approves this spec and `02_migration_kai_world.sql`.** Anything a
> reviewer might reasonably decide differently is flagged **[DECISION]**.

Canonical companion: `02_migration_kai_world.sql`. Where the two disagree, this
spec states intent and the SQL is the enforced truth — reconcile before applying.

---

## 1. Purpose

Define how a region's **health** is computed from the physical world and how
that health becomes the five visual channels a renderer consumes. The state
layer is the single source of truth; every renderer (web today, UE/dome later)
reads the same computed state and writes nothing except through RPCs.

The five channels (all normalized `0..1`) are the entire renderer contract:

| channel          | meaning                          | driven by                        |
| ---------------- | -------------------------------- | -------------------------------- |
| `vitality`       | master health                    | weighted composite of the below  |
| `canopy`         | vegetation                       | NDVI                             |
| `water`          | water presence / clarity         | NDWI                             |
| `biodiversity`   | observed life                    | observation count (GBIF/iNat)    |
| `communityPulse` | verified regeneration, decaying  | validated mission ledger         |

`vitality` is what the visitor feels; `communityPulse` is the channel human
action moves fastest, which is how "real action heals the mirror" stays legible.

---

## 2. Inputs (per region)

Each region declares, in `kai_regions.config` (JSON, zero hardcoding):

- **`bounds`** — `{ lat, lng, radiusM }` geofence center + radius.
- **`weights`** — see §3 (`RegionWeights`), defaults below.
- **`indexSources`** — how the scheduled job fetches indices (see §5). **[DECISION]**
  V1 default source = **Sentinel-2 via a public STAC/GEE-style endpoint** for
  NDVI/NDWI and **GBIF occurrence counts** for observations. Exact provider is a
  Phase-2 wiring choice; the schema stores results, not the fetch mechanism.
- **`visualMapping`** — optional `MappingConfig` (low/high `SceneParams`
  endpoints) overriding `DEFAULT_MAPPING` in `@flowbond/world-runtime`.

Raw indices land in `kai_region_index_samples` (append-only), one row per
scheduled sample, native ranges preserved for audit.

---

## 3. Health computation (mirrors `@flowbond/state-engine`)

The pure reference implementation is `packages/state-engine/src/health.ts`. SQL
in `kai_recompute_region_state` mirrors it exactly. Normalizers:

```
canopy        = clamp01( (ndvi - 0.2) / 0.6 )          # veg starts ~0.2
water         = clamp01( (ndwi + 0.1) / 0.5 )
biodiversity  = clamp01( ln(1+count) / ln(1+cap) )     # log-scaled, saturates at cap
communityPulse= clamp01( Σ weight_i · exp(-λ · age_i) ), λ = ln2 / halfLife
vitality      = Σ w_channel · channel                  # weights sum to 1
```

**Default weights** (`RegionWeights`, **[DECISION]** — these are the numbers a
reviewer is most likely to tune; ADR-0002 records the rationale):

```jsonc
{
  "vitality": { "canopy": 0.4, "water": 0.2, "biodiversity": 0.2, "communityPulse": 0.2 },
  "observationCap": 500,       // biodiversity saturates here
  "pulseHalfLifeDays": 14,     // verified activity half-fades in 2 weeks
  "bloomNudge": 0.05           // immediate vitality lift per validated proof
}
```

Rationale: canopy is the most legible, hardest-to-fake regeneration signal, so
it leads. `communityPulse` is capped at 0.2 of vitality so a burst of missions
*visibly* helps but can never fake a dead landscape into paradise — the mirror
stays honest. The 14-day half-life means a region needs *sustained* action to
hold its glow.

---

## 4. Verification standard (mirrors `kai_validate_proof`)

A proof is `geotag + timestamp + media(R2 key + sha256) + missionType`, bound to
an FBID. Anti-fraud minimums (all enforced in the RPC, not the client):

1. **Geofence** — `haversine(proof, region.center) ≤ region.radiusM`.
2. **One pending per user per mission per day** — rejected at submit.
3. **Duplicate-media rejection** — `mediaHash` unique per region; a re-used
   photo is refused.
4. **Validator ≠ submitter** — enforced in `kai_validate_proof`.

**[DECISION] Validation authority for V1 = single admin approval** (an admin
panel is explicitly in scope). The schema also carries a `kai_validators`
roster and a `quorum` column on `kai_mission_types` so a future **N-of-M
quorum** turns on by config with **no migration** — but V1 ships with
`quorum = 1` and admin-only. ADR-0003 records this.

On approval, in one transaction: append `kai_pulse_events`, recompute state via
`kai_recompute_region_state` (or apply the fast `bloomNudge`), grant soulbound
XP, write the audit row. The bloom the visitor sees comes from the recomputed
`communityPulse`/`vitality`.

---

## 5. Scheduled ingestion (Phase 2)

A **Cloudflare Workers Cron Trigger** (house rule: not Vercel cron) runs
**[DECISION] every 6 hours** (within spec bounds; satellite passes are far
slower, so more frequent is waste). Per region it: fetches indices → inserts a
`kai_region_index_samples` row → calls `kai_recompute_region_state`. The
recompute folds in the current decayed `communityPulse`, so state on load always
reflects reality + verified action, never defaults.

The cron authenticates as a **service role** and still writes only through the
RPC — no direct table writes, ever.

---

## 6. XP (soulbound)

Reputation only — non-transferable, ledger-recorded (`kai_xp_ledger`,
append-only), no token, no cash value, no redemption path (TulumCoin
XP-integrity pattern). One grant row per validated proof, idempotent on
`proof_id`.

---

## 7. Realtime

The web app subscribes to `kai_regions` (or a `kai_region_state` view) via
Supabase Realtime so a validated proof blooms the world for **every** current
visitor within the acceptance minute — the renderer just receives a new
`RegionVisualState` and tweens to it.

---

## 8. Open decisions for Love

- **[D1]** Vitality weights + pulse half-life (§3) — tune or accept.
- **[D2]** V1 validation = single admin vs. quorum-from-launch (§4).
- **[D3]** Index provider for Phase 2 (§2/§5) — Sentinel-2 source choice.
- **[D4]** Cron cadence (§5) — 6h proposed.
- **[D5]** Anything touching XP semantics beyond "soulbound reputation, no
  redemption" is out of scope until Love says otherwise.
