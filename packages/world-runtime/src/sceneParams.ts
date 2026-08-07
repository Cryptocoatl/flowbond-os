// =============================================================================
// SceneParams — the concrete, renderer-agnostic visual parameters produced by
// mapping a RegionVisualState through a data-driven MappingConfig. A web/three
// renderer, a UE renderer, or a dome player all consume the same SceneParams.
// =============================================================================

/** Concrete visual/audio parameters a renderer applies to the scene. */
export interface SceneParams {
  /** camera/tone exposure multiplier */
  exposure: number;
  /** global color saturation 0..1.5 */
  saturation: number;
  /** volumetric fog density (lower = clearer, healthier air) */
  fogDensity: number;
  /** foliage particle / instanced-detail count */
  foliageCount: number;
  /** water surface tint, linear rgb 0..1 */
  waterTint: [number, number, number];
  /** stream/mist VFX intensity 0..1 */
  waterVfx: number;
  /** flying wildlife agent count (birds/butterflies) */
  wildlifeCount: number;
  /** firefly/spark agent count (dusk life) */
  fireflyCount: number;
  /** warm lantern glow near the mission shrine 0..1 */
  lanternGlow: number;
  /** audio stem gains 0..1, crossfaded by state */
  audio: {
    wind: number;
    birds: number;
    water: number;
    motif: number;
  };
}
