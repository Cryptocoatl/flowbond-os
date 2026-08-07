// =============================================================================
// RegionScene — the web renderer. Loads ONE Gaussian splat via Spark and binds
// a RegionVisualState to the scene through resolveSceneParams + a StateTween.
//
// This is ONE renderer against the state contract. A UE/console/dome client is
// another renderer calling the same kai_* APIs — no business logic lives here.
//
// Phase 0 goal: compiles + structurally correct. Items marked PHASE-1 are the
// GPU-tuned bits that must be verified in a real browser before they ship.
// =============================================================================

import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import type { RegionVisualState } from '@flowbond/state-engine';
import { resolveSceneParams } from '../visualMapping';
import type { MappingConfig } from '../visualMapping';
import { StateTween } from '../tween';
import type { SceneParams } from '../sceneParams';

export interface RegionSceneOptions {
  canvas: HTMLCanvasElement;
  /** R2 URL of the region's .spz splat */
  splatUrl: string;
  /** per-region visual mapping (from kai_regions.config) */
  mapping?: MappingConfig;
  /** initial state to render before any realtime update */
  initialState: RegionVisualState;
}

export class RegionScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly mapping?: MappingConfig;
  private readonly tween: StateTween;
  private splat?: SplatMesh;
  private fog: THREE.FogExp2;
  private raf = 0;
  private disposed = false;

  // VFX handles wired in Phase 1 (instanced foliage, wildlife agents, water).
  // Kept as fields so applyVisualState can update counts idempotently.
  private wildlife?: THREE.Points;
  private fireflies?: THREE.Points;

  constructor(private readonly opts: RegionSceneOptions) {
    this.mapping = opts.mapping;
    this.tween = new StateTween(opts.initialState);

    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    this.camera.position.set(0, 1.6, 6);

    this.fog = new THREE.FogExp2(0xcfe3d8, 0.02);
    this.scene.fog = this.fog;

    this.applyVisualState(opts.initialState);
  }

  /**
   * Stream in the splat. Resolves once the first frame is renderable — OR
   * degrades gracefully (renders the empty shell) when the asset isn't in R2
   * yet. It must NEVER reject or hang: the .spz is a Phase-1 asset, and until it
   * exists the app still has to boot. Preflight avoids SplatMesh's internal
   * fetch throwing an uncatchable error; the timeout guards a silent hang.
   */
  async load(): Promise<void> {
    const url = this.opts.splatUrl;

    // Preflight: is the splat actually reachable? (No R2 bucket yet → skip it.)
    let reachable = false;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      reachable = res.ok;
    } catch {
      reachable = false; // host/asset unavailable — degrade to empty shell
    }
    if (!reachable) return;

    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      try {
        const splat = new SplatMesh({ url, onLoad: done });
        this.splat = splat;
        // SplatMesh (Spark) ships its own three types; bypass the dual-copy clash.
        (this.scene as unknown as { add: (o: unknown) => void }).add(splat);
      } catch {
        done();
        return;
      }
      // Never let a missing onLoad hang the shell.
      setTimeout(done, 8000);
    });
  }

  /**
   * Idempotent, tweened. Called on load, on realtime state changes, and on a
   * local bloom after a validated proof. Retargets the tween; the render loop
   * applies interpolated params each frame.
   */
  applyVisualState(state: RegionVisualState): void {
    this.tween.retarget(state, performance.now());
    if (this.raf === 0 && !this.disposed) this.start();
  }

  /** Push resolved params onto the actual scene objects. */
  private applyParams(p: SceneParams): void {
    this.renderer.toneMappingExposure = p.exposure;
    this.fog.density = p.fogDensity;
    // PHASE-1: saturation grading via a post pass; foliage instancing;
    // water tint uniform; wildlife/firefly counts; lantern glow near shrine;
    // audio stem gains via AudioMixer. Counts below are the driving values.
    void p.saturation;
    void p.foliageCount;
    void p.waterTint;
    void p.waterVfx;
    void p.wildlifeCount;
    void p.fireflyCount;
    void p.lanternGlow;
    void p.audio;
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = height === 0 ? 1 : width / height;
    this.camera.updateProjectionMatrix();
  }

  private start(): void {
    const frame = () => {
      if (this.disposed) return;
      const now = performance.now();
      this.applyParams(resolveSceneParams(this.tween.sample(now), this.mapping));
      this.renderer.render(this.scene, this.camera);
      // keep animating while the tween is in flight; VFX (Phase 1) keep it live
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  dispose(): void {
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.splat?.dispose();
    this.wildlife?.geometry.dispose();
    this.fireflies?.geometry.dispose();
    this.renderer.dispose();
  }
}
