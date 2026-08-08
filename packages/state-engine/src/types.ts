// =============================================================================
// @flowbond/state-engine — canonical types
// Pure TypeScript, zero framework deps. Any renderer (web, UE, dome) and the
// scheduled ingestion job share these shapes. See docs/kai-world/01_STATE_LAYER_SPEC.md.
// =============================================================================

/**
 * The five visual channels a renderer consumes. All values are normalized 0..1.
 * This is the ONLY contract between the state layer and any renderer.
 * Mirrored by `applyVisualState` in @flowbond/world-runtime.
 */
export interface RegionVisualState {
  /** master health — global saturation/exposure + ambient audio richness */
  vitality: number;
  /** vegetation — foliage particle density + green grading */
  canopy: number;
  /** water presence/clarity — stream/mist VFX + water tint */
  water: number;
  /** observation density — bird/butterfly/firefly agent count */
  biodiversity: number;
  /** verified mission activity (decaying) — warm light pulses near the shrine */
  communityPulse: number;
}

/**
 * Raw indices sampled from the physical world for a region. Satellite-derived
 * values arrive in their native ranges; the engine normalizes them.
 */
export interface RegionIndices {
  /** Normalized Difference Vegetation Index, native range -1..1 */
  ndvi: number;
  /** Normalized Difference Water Index, native range -1..1 */
  ndwi: number;
  /** biodiversity observation count within the sampling window (e.g. GBIF/iNaturalist) */
  observations: number;
  /** unix ms the indices were sampled */
  sampledAt: number;
}

/**
 * A single verified-mission contribution to communityPulse. The pulse is the
 * decaying sum of these; it is the channel real-world action moves fastest.
 */
export interface PulseEvent {
  /** unix ms the proof was validated */
  validatedAt: number;
  /** magnitude of this mission's contribution, pre-decay (0..1) */
  weight: number;
}

/**
 * Per-region tuning. Lives in `kai_regions.config` in the DB (zero hardcoding);
 * these are only the defaults used when a region omits a value.
 */
export interface RegionWeights {
  /** contribution of each channel to master vitality; must sum to 1 */
  vitality: {
    canopy: number;
    water: number;
    biodiversity: number;
    communityPulse: number;
  };
  /** biodiversity saturates at this observation count (log-scaled below it) */
  observationCap: number;
  /** communityPulse half-life in days (how fast verified activity fades) */
  pulseHalfLifeDays: number;
  /** immediate vitality nudge applied on each validated proof, for legibility */
  bloomNudge: number;
}

export const DEFAULT_WEIGHTS: RegionWeights = {
  vitality: { canopy: 0.4, water: 0.2, biodiversity: 0.2, communityPulse: 0.2 },
  observationCap: 500,
  pulseHalfLifeDays: 14,
  bloomNudge: 0.05,
};
