// =============================================================================
// StateTween — drives RegionVisualState changes as a legible transition, not a
// jump. On a validated proof the world must visibly bloom in < 10s (build
// contract §4): we ramp fast and ease out. Pure/time-driven; no rendering here.
// =============================================================================

import type { RegionVisualState } from '@flowbond/state-engine';

const CHANNELS = ['vitality', 'canopy', 'water', 'biodiversity', 'communityPulse'] as const;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
// easeOutCubic — quick to move, gentle to settle; reads as a "bloom"
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export interface TweenOptions {
  /** transition duration in ms (bloom target ~2500ms, ambient drift longer) */
  durationMs: number;
}

/**
 * A stateful, idempotent tween between visual states. Call `retarget` whenever
 * a new stored state arrives (load, realtime update, or local bloom); call
 * `sample(now)` each animation frame to get the value to render.
 */
export class StateTween {
  private from: RegionVisualState;
  private to: RegionVisualState;
  private startedAt = 0;
  private duration: number;

  constructor(initial: RegionVisualState, opts: TweenOptions = { durationMs: 2500 }) {
    this.from = { ...initial };
    this.to = { ...initial };
    this.duration = opts.durationMs;
  }

  /** Point the tween at a new target from wherever it currently is. Idempotent. */
  retarget(next: RegionVisualState, now: number, durationMs?: number): void {
    this.from = this.sample(now);
    this.to = { ...next };
    this.startedAt = now;
    if (durationMs != null) this.duration = durationMs;
  }

  /** Current interpolated value at time `now`. */
  sample(now: number): RegionVisualState {
    if (this.duration <= 0) return { ...this.to };
    const raw = (now - this.startedAt) / this.duration;
    const t = easeOutCubic(raw < 0 ? 0 : raw > 1 ? 1 : raw);
    const out = {} as RegionVisualState;
    for (const c of CHANNELS) out[c] = lerp(this.from[c], this.to[c], t);
    return out;
  }

  /** True once the tween has reached its target (no more work to do). */
  settled(now: number): boolean {
    return now - this.startedAt >= this.duration;
  }
}
