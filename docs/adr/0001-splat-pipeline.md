# ADR-0001 · Base-world pipeline: authored Gaussian splats via Spark

- **Status:** Accepted (V1)
- **Date:** 2026-07-13
- **Context:** Kai World / Living Earth — `apps/play`, `packages/world-runtime`

## Context

The world must be a generated, art-directed paradise *inspired by* a real
region — never a scan of a real, protected, or communal place (no INAH permits,
no sacred-site scanning, no consent conflict). It must load on mobile web over a
mid connection, and it must be modulated at runtime by a data-driven state
engine — not regenerated live by a world model.

## Decision

Author each region's base environment **once** (World Labs Marble / fal.ai →
Gaussian splats), export to **`.spz`** (target < 50 MB compressed), serve from
**Cloudflare R2** behind CDN, and render in the browser with **Spark**
(`@sparkjsdev/spark`, THREE.js/WebGL2) via `SplatMesh`. Runtime "healing" is
**parameter modulation** over the fixed splat (exposure, fog, grading, VFX
counts, audio mix) — see ADR-0002 — not geometry regeneration.

`three` is pinned to a single version across the monorepo (`0.178.0`, Spark's
peer requirement) via a root `pnpm.overrides` entry to avoid duplicate
`@types/three` in the graph.

## Alternatives considered

- **Live generative world model (Genie-class) at runtime** — rejected: out of
  V1 scope, unpredictable, not mobile-deliverable, no art direction control.
- **Photogrammetry / real-place scan** — rejected on legal/ethical grounds (the
  core design constraint).
- **Classic textured meshes (glTF) instead of splats** — viable, but splats give
  the painterly "generated paradise" look with far less authoring for organic
  scenes. Kept as a fallback if Spark mobile perf disappoints in Phase 1.

## Consequences

- One `.spz` per region in R2 is the heavy asset; the app streams it.
- A future UE/console/dome renderer consumes the same R2 asset + `kai_*` state
  contract — this decision does not lock the web renderer in.
- **Open:** Spark mobile WebGL2 perf is unproven here; validate in Phase 1
  before committing the art budget to more regions.
