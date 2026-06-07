// Gene Keys / Human Design gate layer — the 64 I Ching hexagrams mapped onto
// the ecliptic (the "mandala"), read at two moments:
//   personality = birth;  design = when the Sun sat exactly 88° of solar arc
//   earlier (~88 days before birth).
// Consumes the validated engine (sunLon/moonLon/geoLon/meanNode accept any JD);
// never recomputes orbital math itself.

import type { Chart } from './types';
import { geoLon, meanNode, moonLon, OUTER, sunLon } from './ephemeris';

// The mandala starts Gate 41 at 02°00' Aquarius (302°) and walks the canonical
// published gate order; each gate = 5.625°, each of its 6 lines = 0.9375°.
// Spot-anchors: Gate 25 spans the Aries point (28°15' Pisces – 3°52'30" Aries),
// Gate 1 starts 13°15' Scorpio, Gate 60 closes the wheel into 302°.
export const GATE_ORDER = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
  27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
  28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
] as const;

const WHEEL_START = 302; // 02°00' Aquarius
const GATE_SPAN = 360 / 64; // 5.625°
const LINE_SPAN = GATE_SPAN / 6; // 0.9375°

// Richard Rudd's shadow / gift / siddhi keynotes, indexed by gate (1–64).
export const GENE_KEYS: Record<number, { shadow: string; gift: string; siddhi: string }> = {
  1: { shadow: 'Entropy', gift: 'Freshness', siddhi: 'Beauty' },
  2: { shadow: 'Dislocation', gift: 'Orientation', siddhi: 'Unity' },
  3: { shadow: 'Chaos', gift: 'Innovation', siddhi: 'Innocence' },
  4: { shadow: 'Intolerance', gift: 'Understanding', siddhi: 'Forgiveness' },
  5: { shadow: 'Impatience', gift: 'Patience', siddhi: 'Timelessness' },
  6: { shadow: 'Conflict', gift: 'Diplomacy', siddhi: 'Peace' },
  7: { shadow: 'Division', gift: 'Guidance', siddhi: 'Virtue' },
  8: { shadow: 'Mediocrity', gift: 'Style', siddhi: 'Exquisiteness' },
  9: { shadow: 'Inertia', gift: 'Determination', siddhi: 'Invincibility' },
  10: { shadow: 'Self-Obsession', gift: 'Naturalness', siddhi: 'Being' },
  11: { shadow: 'Obscurity', gift: 'Idealism', siddhi: 'Light' },
  12: { shadow: 'Vanity', gift: 'Discrimination', siddhi: 'Purity' },
  13: { shadow: 'Discord', gift: 'Discernment', siddhi: 'Empathy' },
  14: { shadow: 'Compromise', gift: 'Competence', siddhi: 'Bounteousness' },
  15: { shadow: 'Dullness', gift: 'Magnetism', siddhi: 'Florescence' },
  16: { shadow: 'Indifference', gift: 'Versatility', siddhi: 'Mastery' },
  17: { shadow: 'Opinion', gift: 'Far-Sightedness', siddhi: 'Omniscience' },
  18: { shadow: 'Judgment', gift: 'Integrity', siddhi: 'Perfection' },
  19: { shadow: 'Co-dependence', gift: 'Sensitivity', siddhi: 'Sacrifice' },
  20: { shadow: 'Superficiality', gift: 'Self-Assurance', siddhi: 'Presence' },
  21: { shadow: 'Control', gift: 'Authority', siddhi: 'Valor' },
  22: { shadow: 'Dishonor', gift: 'Graciousness', siddhi: 'Grace' },
  23: { shadow: 'Complexity', gift: 'Simplicity', siddhi: 'Quintessence' },
  24: { shadow: 'Addiction', gift: 'Invention', siddhi: 'Silence' },
  25: { shadow: 'Constriction', gift: 'Acceptance', siddhi: 'Universal Love' },
  26: { shadow: 'Pride', gift: 'Artfulness', siddhi: 'Invisibility' },
  27: { shadow: 'Selfishness', gift: 'Altruism', siddhi: 'Selflessness' },
  28: { shadow: 'Purposelessness', gift: 'Totality', siddhi: 'Immortality' },
  29: { shadow: 'Half-Heartedness', gift: 'Commitment', siddhi: 'Devotion' },
  30: { shadow: 'Desire', gift: 'Lightness', siddhi: 'Rapture' },
  31: { shadow: 'Arrogance', gift: 'Leadership', siddhi: 'Humility' },
  32: { shadow: 'Failure', gift: 'Preservation', siddhi: 'Veneration' },
  33: { shadow: 'Forgetting', gift: 'Mindfulness', siddhi: 'Revelation' },
  34: { shadow: 'Force', gift: 'Strength', siddhi: 'Majesty' },
  35: { shadow: 'Hunger', gift: 'Adventure', siddhi: 'Boundlessness' },
  36: { shadow: 'Turbulence', gift: 'Humanity', siddhi: 'Compassion' },
  37: { shadow: 'Weakness', gift: 'Equality', siddhi: 'Tenderness' },
  38: { shadow: 'Struggle', gift: 'Perseverance', siddhi: 'Honor' },
  39: { shadow: 'Provocation', gift: 'Dynamism', siddhi: 'Liberation' },
  40: { shadow: 'Exhaustion', gift: 'Resolve', siddhi: 'Divine Will' },
  41: { shadow: 'Fantasy', gift: 'Anticipation', siddhi: 'Emanation' },
  42: { shadow: 'Expectation', gift: 'Detachment', siddhi: 'Celebration' },
  43: { shadow: 'Deafness', gift: 'Insight', siddhi: 'Epiphany' },
  44: { shadow: 'Interference', gift: 'Teamwork', siddhi: 'Synarchy' },
  45: { shadow: 'Dominance', gift: 'Synergy', siddhi: 'Communion' },
  46: { shadow: 'Seriousness', gift: 'Delight', siddhi: 'Ecstasy' },
  47: { shadow: 'Oppression', gift: 'Transmutation', siddhi: 'Transfiguration' },
  48: { shadow: 'Inadequacy', gift: 'Resourcefulness', siddhi: 'Wisdom' },
  49: { shadow: 'Reaction', gift: 'Revolution', siddhi: 'Rebirth' },
  50: { shadow: 'Corruption', gift: 'Equilibrium', siddhi: 'Harmony' },
  51: { shadow: 'Agitation', gift: 'Initiative', siddhi: 'Awakening' },
  52: { shadow: 'Stress', gift: 'Restraint', siddhi: 'Stillness' },
  53: { shadow: 'Immaturity', gift: 'Expansion', siddhi: 'Superabundance' },
  54: { shadow: 'Greed', gift: 'Aspiration', siddhi: 'Ascension' },
  55: { shadow: 'Victimization', gift: 'Freedom', siddhi: 'Freedom' },
  56: { shadow: 'Distraction', gift: 'Enrichment', siddhi: 'Intoxication' },
  57: { shadow: 'Unease', gift: 'Intuition', siddhi: 'Clarity' },
  58: { shadow: 'Dissatisfaction', gift: 'Vitality', siddhi: 'Bliss' },
  59: { shadow: 'Dishonesty', gift: 'Intimacy', siddhi: 'Transparency' },
  60: { shadow: 'Limitation', gift: 'Realism', siddhi: 'Justice' },
  61: { shadow: 'Psychosis', gift: 'Inspiration', siddhi: 'Sanctity' },
  62: { shadow: 'Intellect', gift: 'Precision', siddhi: 'Impeccability' },
  63: { shadow: 'Doubt', gift: 'Inquiry', siddhi: 'Truth' },
  64: { shadow: 'Confusion', gift: 'Imagination', siddhi: 'Illumination' },
};

export interface GateLine { gate: number; line: number }

const norm = (x: number) => ((x % 360) + 360) % 360;

export function gateOf(abs: number): GateLine {
  const pos = norm(abs - WHEEL_START);
  // Clamp float edge cases (pos === 360 after rounding).
  const idx = Math.min(Math.floor(pos / GATE_SPAN), 63);
  const inGate = pos - idx * GATE_SPAN;
  return { gate: GATE_ORDER[idx], line: Math.min(Math.floor(inGate / LINE_SPAN), 5) + 1 };
}

// ── Design moment: Sun exactly 88° of solar arc before birth ────────────────
export function designJd(chart: Chart): number {
  const birthSun = chart.bodies.Sun.abs;
  // Solar arc from candidate jd to birth; in the 80–100-day-before window the
  // arc stays within ~(75°, 100°), so no 360° wrap ambiguity.
  const arc = (jd: number) => norm(birthSun - sunLon(jd));
  let lo = chart.jd - 100; // arc ≈ 98° (too much)
  let hi = chart.jd - 80;  // arc ≈ 79° (too little)
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (arc(mid) > 88) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ── Activations: gate+line for every body at one moment ────────────────────
export type Activations = Record<string, GateLine>;

function activationsAt(jd: number): Activations {
  const sun = sunLon(jd);
  const node = meanNode(jd);
  const out: Activations = {
    Sun: gateOf(sun),
    Earth: gateOf(sun + 180),
    Moon: gateOf(moonLon(jd)),
    'North Node': gateOf(node),
    'South Node': gateOf(node + 180),
  };
  for (const p of OUTER) out[p] = gateOf(geoLon(p, jd));
  return out;
}

export interface GeneKeysProfile {
  personality: Activations;  // conscious — birth moment
  design: Activations;       // unconscious — 88° of solar arc earlier
  designJd: number;
  // Gene Keys Activation Sequence (the four "prime gifts")
  spheres: {
    lifesWork: GateLine;   // personality Sun
    evolution: GateLine;   // personality Earth
    radiance: GateLine;    // design Sun
    purpose: GateLine;     // design Earth
  };
  profile: string;           // HD profile, e.g. "1/3" (personality/design Sun lines)
  incarnationCross: number[]; // the 4 sphere gates
}

export function geneKeys(chart: Chart): GeneKeysProfile {
  const dJd = designJd(chart);
  const personality = activationsAt(chart.jd);
  const design = activationsAt(dJd);
  const spheres = {
    lifesWork: personality.Sun,
    evolution: personality.Earth,
    radiance: design.Sun,
    purpose: design.Earth,
  };
  return {
    personality,
    design,
    designJd: dJd,
    spheres,
    profile: `${personality.Sun.line}/${design.Sun.line}`,
    incarnationCross: [spheres.lifesWork.gate, spheres.evolution.gate, spheres.radiance.gate, spheres.purpose.gate],
  };
  // NOTE: HD type/authority need full center+channel mechanics — out of scope here.
}

// ── Summary lines for readings ──────────────────────────────────────────────
const keynote = (g: GateLine) => {
  const k = GENE_KEYS[g.gate];
  return `Gate ${g.gate}.${g.line} — ${k.shadow} → ${k.gift} → ${k.siddhi}`;
};

export function geneKeysSummary(gk: GeneKeysProfile): string[] {
  return [
    `Profile ${gk.profile} · Incarnation cross gates ${gk.incarnationCross.join('/')}`,
    `Life's Work (personality Sun): ${keynote(gk.spheres.lifesWork)}`,
    `Evolution (personality Earth): ${keynote(gk.spheres.evolution)}`,
    `Radiance (design Sun): ${keynote(gk.spheres.radiance)}`,
    `Purpose (design Earth): ${keynote(gk.spheres.purpose)}`,
  ];
}
