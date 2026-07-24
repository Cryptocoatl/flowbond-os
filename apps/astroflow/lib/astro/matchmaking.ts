// The Matchmaker — dynamic resonance ranking for romance and every other kind
// of connection. Pure + deterministic (same charts → same order), built on the
// validated synastry engine. No LLM, no randomness: the ranking IS the math.
//
// Privacy: this only ever runs over charts the caller can already see (their
// own circle). Discovery of new people happens through opt-in "open_to" +
// sparks in the DB layer, where charts stay hidden until a mutual match bonds.

import type { AstroProfile, Chart, RelContext } from './types';
import { synastry } from './aspects';
import { panorama, type Panorama } from './interpret';
import { scoreBand } from './guide';

export interface Intention {
  ctx: RelContext;
  glyph: string;
  label: string;      // warm, human name
  color: string;
  blurb: string;      // one line: what this lens looks for
  weighs: string;     // which planets it listens to (for the "how it works" note)
}

// The four intentions map onto the engine's relationship contexts, reframed as
// things a person actually comes here wanting.
export const INTENTIONS: Intention[] = [
  { ctx: 'romance', glyph: '💘', label: 'Romance', color: '#e0708f',
    blurb: 'chemistry, tenderness and lasting spark', weighs: 'Venus, Mars, Moon & the Ascendant' },
  { ctx: 'friendship', glyph: '🤝', label: 'Friendship', color: '#7bd0c6',
    blurb: 'easy rapport, play and mutual growth', weighs: 'Mercury, Jupiter, Sun & Moon' },
  { ctx: 'coliving', glyph: '🏡', label: 'Living together', color: '#e3c07a',
    blurb: 'daily rhythm, comfort and shared space', weighs: 'Moon, Mercury, Saturn & Mars' },
  { ctx: 'business', glyph: '💼', label: 'Building together', color: '#8f7cff',
    blurb: 'drive, structure and a shared mission', weighs: 'Saturn, Mars, Mercury & Midheaven' },
];

export const intentionOf = (ctx: RelContext) => INTENTIONS.find((i) => i.ctx === ctx)!;

export interface Match {
  profile: AstroProfile;
  score: number;
  band: ReturnType<typeof scoreBand>;
  panorama: Panorama;
  topFlow?: string;   // the strongest thing that flows between you
  topTend?: string;   // the main thing to tend
}

/**
 * Rank a set of people against `me` for one intention, best resonance first.
 * Only profiles that carry a chart are considered.
 */
export function rankMatches(me: Chart, others: AstroProfile[], ctx: RelContext): Match[] {
  return others
    .filter((p) => p.chart)
    .map((p) => {
      const pan = panorama(me, p.chart!, ctx);
      return {
        profile: p,
        score: pan.score,
        band: scoreBand(pan.score),
        panorama: pan,
        topFlow: pan.flows[0]?.text,
        topTend: pan.friction[0]?.text,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Across all four intentions, which one does this pair score highest in?
 * Powers the playful "you two are strongest as ___" hint.
 */
export function bestIntention(me: Chart, other: Chart): { intention: Intention; score: number } {
  let best = INTENTIONS[0], bestScore = -1;
  for (const it of INTENTIONS) {
    const s = synastry(me, other, it.ctx).score;
    if (s > bestScore) { bestScore = s; best = it; }
  }
  return { intention: best, score: bestScore };
}

/** A compact resonance profile of one pair across every lens — for the deep card. */
export function resonanceAcross(me: Chart, other: Chart): { intention: Intention; score: number }[] {
  return INTENTIONS.map((it) => ({ intention: it, score: synastry(me, other, it.ctx).score }))
    .sort((a, b) => b.score - a.score);
}
