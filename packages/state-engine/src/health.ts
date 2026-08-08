// =============================================================================
// Health computation — raw indices + pulse ledger → RegionVisualState.
// Pure functions, deterministic, no I/O. The scheduled ingestion job and the
// validation RPC both reason in these terms (SQL mirrors the same weights).
// =============================================================================

import type {
  RegionIndices,
  RegionVisualState,
  RegionWeights,
  PulseEvent,
} from './types';
import { DEFAULT_WEIGHTS } from './types';

export const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/** NDVI native -1..1 → 0..1; vegetation meaningfully starts around 0.2. */
export const normalizeNdvi = (ndvi: number): number => clamp01((ndvi - 0.2) / 0.6);

/** NDWI native -1..1 → 0..1; open/clear water is positive. */
export const normalizeNdwi = (ndwi: number): number => clamp01((ndwi + 0.1) / 0.5);

/** Observation count → 0..1, log-scaled so early sightings move the needle. */
export const normalizeObservations = (count: number, cap: number): number => {
  if (count <= 0) return 0;
  return clamp01(Math.log1p(count) / Math.log1p(cap));
};

/**
 * Decaying sum of verified-mission contributions, evaluated at `now`.
 * Exponential decay with the configured half-life. Result clamped to 0..1.
 */
export const decayPulse = (
  events: readonly PulseEvent[],
  halfLifeDays: number,
  now: number,
): number => {
  if (events.length === 0 || halfLifeDays <= 0) return 0;
  const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;
  const lambda = Math.LN2 / halfLifeMs;
  let sum = 0;
  for (const e of events) {
    const age = Math.max(0, now - e.validatedAt);
    sum += e.weight * Math.exp(-lambda * age);
  }
  return clamp01(sum);
};

/**
 * Compose the master vitality from the four channels using region weights.
 * Weights are assumed pre-normalized (sum to 1); we normalize defensively.
 */
export const composeVitality = (
  channels: Pick<RegionVisualState, 'canopy' | 'water' | 'biodiversity' | 'communityPulse'>,
  w: RegionWeights['vitality'],
): number => {
  const total = w.canopy + w.water + w.biodiversity + w.communityPulse || 1;
  const v =
    (w.canopy * channels.canopy +
      w.water * channels.water +
      w.biodiversity * channels.biodiversity +
      w.communityPulse * channels.communityPulse) /
    total;
  return clamp01(v);
};

/**
 * Full computation: satellite indices + pulse ledger → RegionVisualState.
 * This is the single source of truth for a region's health.
 */
export const computeRegionState = (
  indices: RegionIndices,
  pulseEvents: readonly PulseEvent[],
  weights: RegionWeights = DEFAULT_WEIGHTS,
  now: number = Date.now(),
): RegionVisualState => {
  const canopy = normalizeNdvi(indices.ndvi);
  const water = normalizeNdwi(indices.ndwi);
  const biodiversity = normalizeObservations(indices.observations, weights.observationCap);
  const communityPulse = decayPulse(pulseEvents, weights.pulseHalfLifeDays, now);
  const vitality = composeVitality(
    { canopy, water, biodiversity, communityPulse },
    weights.vitality,
  );
  return { vitality, canopy, water, biodiversity, communityPulse };
};
