# ADR-0002 · State index weights & the health formula

- **Status:** Proposed (awaiting Love's sign-off — [DECISION D1])
- **Date:** 2026-07-13
- **Context:** `packages/state-engine`, `01_STATE_LAYER_SPEC.md` §3

## Context

A region's five visual channels (`vitality, canopy, water, biodiversity,
communityPulse`, all 0..1) are computed from satellite indices + a verified
mission ledger. The weights decide *what the world rewards* and *how honest the
mirror stays*. They must live in `kai_regions.config` (per-region, zero
hardcoding); this ADR records the **defaults**.

## Decision

```
canopy        = clamp01((ndvi - 0.2) / 0.6)
water         = clamp01((ndwi + 0.1) / 0.5)
biodiversity  = clamp01(ln(1+obs) / ln(1+cap))        # cap = 500
communityPulse= clamp01(Σ w·exp(-ln2/halfLife · age)) # halfLife = 14 days
vitality      = 0.4·canopy + 0.2·water + 0.2·biodiversity + 0.2·communityPulse
bloomNudge    = 0.05   # immediate vitality lift per validated proof
```

Reasoning:

- **Canopy leads (0.4).** Vegetation is the most legible and hardest-to-fake
  regeneration signal; it should dominate what "healthy" looks like.
- **communityPulse capped at 0.2.** Verified human action must *visibly* help,
  but can never fake a dead landscape into paradise — the mirror stays honest
  against satellite ground-truth. This is the ethical core of the thesis.
- **14-day half-life.** A region must be *sustained*, not spiked once. Activity
  fades, so the glow reflects living community, not a one-off event.
- **Log-scaled biodiversity.** Early observations move the needle; the marginal
  sighting past ~500 barely matters — matches how ecological recovery reads.

The SQL in `kai_recompute_region_state` mirrors these formulas exactly, so any
renderer (web/UE/dome) sees identical state.

## Consequences

- Numbers are opinions. They are per-region overridable and expected to be
  tuned once real Sentinel-2 values for Valle Espejo are observed (Phase 2).
- **Open for Love:** approve or adjust the four knobs (canopy weight, pulse cap,
  half-life, bloomNudge). Nothing downstream hardcodes them.
