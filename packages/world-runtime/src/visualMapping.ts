// =============================================================================
// visualMapping — data-driven RegionVisualState (0..1) → SceneParams.
// NO hardcoded scene numbers in the renderer: every region ships its own
// MappingConfig (from kai_regions.config.visualMapping) and this pure function
// resolves it. Version 1 proves the mapping; version 100 only swaps config.
// =============================================================================

import type { RegionVisualState } from '@flowbond/state-engine';
import type { SceneParams } from './sceneParams';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerp3 = (
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/**
 * Endpoints for the region at its lowest and highest expression of each
 * channel. Concrete scene numbers live here (in config), never in shaders.
 */
export interface MappingConfig {
  /** SceneParams when every channel is 0 (a degraded, muted world) */
  low: SceneParams;
  /** SceneParams when every channel is 1 (paradise) */
  high: SceneParams;
}

/**
 * Default mapping for a temperate valley region ("Valle Espejo"). Each channel
 * drives the params it owns per §5 of the build contract:
 *   vitality → exposure/saturation + audio motif
 *   canopy   → foliage + green grading (saturation)
 *   water    → water tint/vfx + audio water
 *   biodiversity → wildlife/firefly counts + audio birds
 *   communityPulse → lantern glow near the shrine
 */
export const DEFAULT_MAPPING: MappingConfig = {
  low: {
    exposure: 0.7,
    saturation: 0.35,
    fogDensity: 0.06,
    foliageCount: 0,
    waterTint: [0.35, 0.34, 0.3], // muddy
    waterVfx: 0,
    wildlifeCount: 0,
    fireflyCount: 0,
    lanternGlow: 0,
    audio: { wind: 0.8, birds: 0, water: 0, motif: 0 },
  },
  high: {
    exposure: 1.15,
    saturation: 1.2,
    fogDensity: 0.012,
    foliageCount: 4000,
    waterTint: [0.15, 0.45, 0.55], // clear turquoise
    waterVfx: 1,
    wildlifeCount: 40,
    fireflyCount: 120,
    lanternGlow: 1,
    audio: { wind: 0.5, birds: 1, water: 1, motif: 1 },
  },
};

/**
 * Resolve SceneParams from a RegionVisualState. Each param is interpolated
 * between the config's low/high endpoints by the channel that owns it, so a
 * region can be re-themed entirely from data.
 */
export const resolveSceneParams = (
  s: RegionVisualState,
  cfg: MappingConfig = DEFAULT_MAPPING,
): SceneParams => {
  const { low, high } = cfg;
  return {
    exposure: lerp(low.exposure, high.exposure, s.vitality),
    // green grading is driven by canopy; overall vibrancy by vitality — blend
    saturation: lerp(low.saturation, high.saturation, 0.5 * s.vitality + 0.5 * s.canopy),
    fogDensity: lerp(low.fogDensity, high.fogDensity, s.vitality),
    foliageCount: Math.round(lerp(low.foliageCount, high.foliageCount, s.canopy)),
    waterTint: lerp3(low.waterTint, high.waterTint, s.water),
    waterVfx: lerp(low.waterVfx, high.waterVfx, s.water),
    wildlifeCount: Math.round(lerp(low.wildlifeCount, high.wildlifeCount, s.biodiversity)),
    fireflyCount: Math.round(lerp(low.fireflyCount, high.fireflyCount, s.biodiversity)),
    lanternGlow: lerp(low.lanternGlow, high.lanternGlow, s.communityPulse),
    audio: {
      wind: lerp(low.audio.wind, high.audio.wind, s.vitality),
      birds: lerp(low.audio.birds, high.audio.birds, s.biodiversity),
      water: lerp(low.audio.water, high.audio.water, s.water),
      motif: lerp(low.audio.motif, high.audio.motif, s.vitality),
    },
  };
};
