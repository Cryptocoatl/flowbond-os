// =============================================================================
// CesiumDescent — OPTIONAL cinematic intro (space → Mexico → Morelos) using
// CesiumJS + Google Photorealistic 3D Tiles, handing off to the splat scene.
//
// Ships behind the `descent` feature flag (see ADR-0004). Cesium is heavy and
// requires a Google Map Tiles API key, so it is NEVER a build-time dependency:
// this module lazy-imports 'cesium' only when the flag is on. If it threatens
// the timeline, the app renders the splat directly and this is never loaded.
// =============================================================================

export interface DescentOptions {
  container: HTMLElement;
  /** Google Map Tiles API key (Photorealistic 3D Tiles) */
  googleTilesKey: string;
  /** final camera target — the region's center */
  target: { lat: number; lng: number; height: number };
  /** seconds for the full descent before handoff */
  durationSec?: number;
}

export interface Descent {
  /** run the flight; resolves when the camera reaches the region (handoff point) */
  play(): Promise<void>;
  dispose(): void;
}

/**
 * Lazily construct a Descent. Returns null if Cesium can't load (missing dep or
 * key) so the caller falls back to the splat scene without the intro.
 */
export async function createDescent(opts: DescentOptions): Promise<Descent | null> {
  try {
    // Lazy, optional. 'cesium' is intentionally not a package dependency; it is
    // resolved from the host app only when the descent flag is enabled.
    // @ts-expect-error — optional peer, resolved at runtime in the app bundle
    const Cesium = await import('cesium');
    void Cesium;
    void opts;
    // PHASE-4: build the Cesium viewer, add Google Photorealistic 3D Tiles,
    // fly the camera from space to opts.target, then resolve play() at handoff.
    return {
      async play() {
        /* implemented in Phase 4 behind the flag */
      },
      dispose() {},
    };
  } catch {
    return null;
  }
}
