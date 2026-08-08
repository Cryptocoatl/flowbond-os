// =============================================================================
// Delta application — the moment a verified proof heals the world.
// Applied server-side ONLY (by the kai_validate_proof / kai_apply_state_delta
// RPCs). This module is the reference implementation the SQL mirrors and the
// admin/dev tools reuse; it never runs as a client-side write.
// =============================================================================

import type { RegionVisualState, RegionWeights } from './types';
import { clamp01 } from './health';
import { DEFAULT_WEIGHTS } from './types';

/**
 * Apply the immediate, legible bloom from one validated proof on top of the
 * current stored state. The satellite channels catch up slowly on the cron;
 * this nudge is what the visitor sees within seconds. Idempotency is enforced
 * upstream (one ledger row per validated proof) — this is a pure transform.
 */
export const applyBloomDelta = (
  current: RegionVisualState,
  weights: RegionWeights = DEFAULT_WEIGHTS,
): RegionVisualState => {
  const communityPulse = clamp01(current.communityPulse + weights.bloomNudge);
  // recompose vitality so the master channel reflects the new pulse immediately
  const w = weights.vitality;
  const total = w.canopy + w.water + w.biodiversity + w.communityPulse || 1;
  const vitality = clamp01(
    (w.canopy * current.canopy +
      w.water * current.water +
      w.biodiversity * current.biodiversity +
      w.communityPulse * communityPulse) /
      total,
  );
  return { ...current, communityPulse, vitality };
};
