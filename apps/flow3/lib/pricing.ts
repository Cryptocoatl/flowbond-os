// FlowCredits pricing — the markup formula over real API cost.
// Near-free passthrough early: barely above raw spend. ONE source of truth so
// every priced operation stays consistent across routes + UI.

export const CREDIT_VALUE_USD = 0.002; // 1 ⚡ ≈ $0.002  → 500 ⚡ welcome ≈ $1
export const MARGIN = 1.3; // near-free passthrough; bump later for margin

export type Operation =
  | 'text_to_video'
  | 'image_to_video'
  | 'upscale'
  | 'render'
  | 'music'
  | 'tts'
  | 'captions';

// Estimated raw provider cost. `perUnit` is multiplied by `units`
// (seconds for video, minutes for render/captions, 1k-chars for tts).
export const COST_TABLE: Record<Operation, { provider: string; perUnit: number; unit: string; base: number }> = {
  text_to_video: { provider: 'fal', perUnit: 0.006, unit: 'second', base: 0 },
  image_to_video: { provider: 'fal', perUnit: 0.012, unit: 'second', base: 0 },
  upscale: { provider: 'fal', perUnit: 0.004, unit: 'second', base: 0.005 },
  music: { provider: 'fal', perUnit: 0.0, unit: 'track', base: 0.04 },
  render: { provider: 'shotstack', perUnit: 0.06, unit: 'minute', base: 0 },
  tts: { provider: 'elevenlabs', perUnit: 0.15, unit: '1k_chars', base: 0 },
  captions: { provider: 'groq', perUnit: 0.0001, unit: 'minute', base: 0 },
};

export function rawCostUsd(op: Operation, units: number): number {
  const c = COST_TABLE[op];
  return c.base + c.perUnit * Math.max(0, units);
}

/** Convert real USD cost → FlowCredits with the passthrough markup. Min 1 ⚡. */
export function creditsFor(op: Operation, units: number): { credits: number; rawUsd: number } {
  const rawUsd = rawCostUsd(op, units);
  const credits = Math.max(1, Math.ceil((rawUsd / CREDIT_VALUE_USD) * MARGIN));
  return { credits, rawUsd: Number(rawUsd.toFixed(4)) };
}
