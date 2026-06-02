import type { Chart, Aspect, RelContext, SynastryResult } from './types';

const ASPECTS = [
  { type: 'conjunction', angle: 0, orb: 8, glyph: '\u260C' },
  { type: 'opposition', angle: 180, orb: 7, glyph: '\u260D' },
  { type: 'trine', angle: 120, orb: 7, glyph: '\u25B3' },
  { type: 'square', angle: 90, orb: 6, glyph: '\u25A1' },
  { type: 'sextile', angle: 60, orb: 5, glyph: '\u2731' },
  { type: 'quincunx', angle: 150, orb: 3, glyph: '\u26BB' },
] as const;

const POINTS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

/** Base importance of each point in synastry. */
const W: Record<string, number> = {
  Sun: 3, Moon: 3, Mercury: 2, Venus: 2.5, Mars: 2.5, Jupiter: 1.6,
  Saturn: 2, Uranus: 1, Neptune: 1, Pluto: 1.2, Asc: 2.5, MC: 1.5,
};

/** Context multipliers — which planets carry weight for each relationship focus. */
const CW: Record<RelContext, Record<string, number>> = {
  friendship: { Mercury: 1.6, Jupiter: 1.5, Sun: 1.2, Moon: 1.1, Venus: 1.1, Mars: 0.8, Saturn: 0.7, Uranus: 0.9, Neptune: 0.7, Pluto: 0.7, Asc: 1, MC: 0.9 },
  romance: { Venus: 1.7, Mars: 1.6, Moon: 1.4, Sun: 1.3, Asc: 1.2, Pluto: 1, Saturn: 0.9, Mercury: 0.9, Jupiter: 1, Uranus: 0.8, Neptune: 0.9, MC: 0.8 },
  coliving: { Moon: 1.6, Mercury: 1.3, Mars: 1.1, Saturn: 1.4, Venus: 1, Sun: 1, Asc: 1.2, MC: 0.9, Jupiter: 0.9, Uranus: 0.7, Neptune: 0.7, Pluto: 0.7 },
  business: { Sun: 1.3, Saturn: 1.5, Mars: 1.4, Mercury: 1.4, Jupiter: 1.4, MC: 1.4, Asc: 1, Moon: 0.8, Venus: 0.8, Uranus: 0.9, Neptune: 0.6, Pluto: 1 },
};
const cw = (ctx: RelContext, p: string) => CW[ctx][p] ?? 0.8;

function pointsOf(c: Chart): Record<string, number> {
  const o: Record<string, number> = {};
  for (const p of POINTS) o[p] = c.bodies[p].abs;
  if (c.asc) o.Asc = c.asc.abs;
  if (c.mc) o.MC = c.mc.abs;
  return o;
}

export function findAspect(l1: number, l2: number) {
  let s = Math.abs(l1 - l2) % 360;
  if (s > 180) s = 360 - s;
  for (const a of ASPECTS) {
    const d = Math.abs(s - a.angle);
    if (d <= a.orb) return { type: a.type, glyph: a.glyph, orb: +d.toFixed(1), tight: 1 - d / a.orb };
  }
  return null;
}

function harmonyOf(p1: string, p2: string, type: string): number {
  if (type === 'trine' || type === 'sextile') return 1;
  if (type === 'square' || type === 'opposition') return -1;
  if (type === 'quincunx') return -0.5;
  const hard = ['Mars', 'Saturn', 'Pluto', 'Uranus'];
  const h1 = hard.includes(p1), h2 = hard.includes(p2);
  if (h1 && h2) return -0.6;
  if (!h1 && !h2) return 0.8;
  return 0.2;
}

/** All cross-aspects between two charts (or within one if sameChart). */
export function aspectsBetween(A: Record<string, number>, B: Record<string, number>, sameChart = false): Aspect[] {
  const out: Aspect[] = [];
  const ka = Object.keys(A), kb = Object.keys(B);
  for (let i = 0; i < ka.length; i++) {
    for (let j = 0; j < kb.length; j++) {
      if (sameChart && j <= i) continue;
      const a = findAspect(A[ka[i]], B[kb[j]]);
      if (a) out.push({ p1: ka[i], p2: kb[j], type: a.type, glyph: a.glyph, orb: a.orb, tight: a.tight, harmony: harmonyOf(ka[i], kb[j], a.type) });
    }
  }
  return out;
}

export function natalAspects(c: Chart): Aspect[] {
  const pts = pointsOf(c);
  return aspectsBetween(pts, pts, true).sort((a, b) => b.tight - a.tight);
}

/** Weighted synastry for a relationship context. Score 0–100 (50 = balanced). */
export function synastry(a: Chart, b: Chart, ctx: RelContext): SynastryResult {
  const A = pointsOf(a), B = pointsOf(b);
  const raw = aspectsBetween(A, B, false);
  let pos = 0, neg = 0;
  const aspects = raw.map((x) => {
    const weight = ((W[x.p1] + W[x.p2]) / 2) * ((cw(ctx, x.p1) + cw(ctx, x.p2)) / 2) * x.tight;
    const contrib = x.harmony * weight;
    if (contrib >= 0) pos += contrib; else neg += -contrib;
    return { ...x, weight, contrib };
  });
  const score = Math.round(50 + 50 * ((pos - neg) / (pos + neg + 0.001)));
  return { score: Math.max(3, Math.min(97, score)), context: ctx, aspects };
}

export const REL_CONTEXTS: RelContext[] = ['friendship', 'romance', 'coliving', 'business'];
