# ADR-0004 · Cinematic descent behind a feature flag

- **Status:** Accepted (V1)
- **Date:** 2026-07-13
- **Context:** `packages/world-runtime/src/descent`, `apps/play`

## Context

The optional intro flies the camera from space → Mexico → Morelos using CesiumJS
+ Google Photorealistic 3D Tiles, then hands off to the splat scene. It is
gorgeous but risky: Cesium is heavy (bundle + perf), needs a **Google Map Tiles
API key** (an external paid service), and the handoff to the splat is finicky.
The build brief says: build it behind a flag; ship without it if it threatens
the timeline.

## Decision

Gate the descent behind **`NEXT_PUBLIC_FLAG_DESCENT`** (default `0`). Cesium is
**never a build-time dependency** — `createDescent()` lazy-imports `cesium` only
when the flag is on, and returns `null` (falling back to the splat directly) if
Cesium or the key is unavailable. V1 ships with the flag **off**; the region
renders straight to the splat.

The Google Map Tiles API key is an external paid service → **enabling this in
production is a decision for Love** (cost + key provisioning), consistent with
"stop and ask Love for new external paid services."

## Consequences

- Default path has zero Cesium weight; LCP/perf targets (Phase 4) are met
  without it.
- The descent can be developed and demoed in a preview deploy without touching
  the production critical path.
- **Open for Love:** whether to fund/enable the Google 3D Tiles key for the
  production intro, and when.
