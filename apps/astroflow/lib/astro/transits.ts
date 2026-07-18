// Transits — where the sky is NOW against your natal chart.
//
// The natal chart is fixed; the planets keep moving. A transit is a present-day
// planet making an aspect to a natal point — the "weather" over your chart today.
// This powers daily/weekly readings and the great life-cycles (Saturn return,
// Jupiter return, your solar return / cosmic birthday).
//
// Pure + deterministic: reuses the validated ephemeris (sunLon/moonLon/geoLon)
// and the same findAspect() the natal engine uses. Nothing is stored — transits
// change by the day, so they are always computed fresh for the moment asked.

import type { Chart } from './types';
import { sunLon, moonLon, geoLon, isRetrograde, signOf, degInSign, OUTER } from './ephemeris';
import { findAspect } from './aspects';

// Julian Day for "now" (or any Date).
export const jdOfDate = (d: Date = new Date()) => 2440587.5 + d.getTime() / 86400000;

const TRANSIT_BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const;
type Body = (typeof TRANSIT_BODIES)[number];

// Longitudes of every transiting body at a JD.
export function transitLongitudes(jd: number): Record<string, number> {
  const o: Record<string, number> = { Sun: sunLon(jd), Moon: moonLon(jd) };
  for (const p of OUTER) o[p] = geoLon(p, jd);
  return o;
}

// The natal points a transit can touch (planets + angles).
function natalPoints(chart: Chart): Record<string, number> {
  const o: Record<string, number> = {};
  for (const p of TRANSIT_BODIES) if (chart.bodies[p]) o[p] = chart.bodies[p].abs;
  if (chart.asc) o.Asc = chart.asc.abs;
  if (chart.mc) o.MC = chart.mc.abs;
  return o;
}

// How much weight each body carries as a TRANSITING agent — slow planets make
// the era-defining transits; the Moon is loud but brief.
const TRANSIT_WEIGHT: Record<string, number> = {
  Pluto: 3, Neptune: 2.7, Uranus: 2.6, Saturn: 2.4, Jupiter: 1.8,
  Mars: 1.2, Sun: 1, Venus: 0.9, Mercury: 0.8, Moon: 0.5,
};
// How much each natal point matters as a TARGET.
const NATAL_WEIGHT: Record<string, number> = {
  Sun: 1.6, Moon: 1.6, Asc: 1.5, MC: 1.3, Venus: 1.1, Mars: 1.1, Mercury: 1,
  Saturn: 1, Jupiter: 1, Uranus: 0.8, Neptune: 0.8, Pluto: 0.8,
};

const HARD = new Set(['conjunction', 'opposition', 'square', 'quincunx']);

export interface Transit {
  from: string;        // transiting body
  aspect: string;      // conjunction / opposition / trine / square / sextile / quincunx
  glyph: string;
  to: string;          // natal point
  orb: number;         // degrees from exact
  applying: boolean;   // tightening toward exact (stronger) vs separating
  retro: boolean;      // transiting body retrograde
  isCycle: boolean;    // transiting body aspecting its OWN natal position (a life cycle)
  score: number;       // significance ranking
}

// Every active transit at a JD, ranked by significance.
export function activeTransits(chart: Chart, jd: number = jdOfDate()): Transit[] {
  const T = transitLongitudes(jd);
  const Tnext = transitLongitudes(jd + 1); // one day later, to judge applying/separating
  const N = natalPoints(chart);
  const out: Transit[] = [];

  for (const from of TRANSIT_BODIES) {
    for (const to of Object.keys(N)) {
      const a = findAspect(T[from], N[to]);
      if (!a) continue;
      const next = findAspect(Tnext[from], N[to]);
      const applying = !!next && next.type === a.type && next.orb < a.orb;
      const isCycle = from === to;
      const base = TRANSIT_WEIGHT[from] * (NATAL_WEIGHT[to] ?? 0.8) * a.tight;
      const hardBoost = HARD.has(a.type) ? 1.15 : 1;
      const applyBoost = applying ? 1.2 : 1;
      const cycleBoost = isCycle ? 1.6 : 1; // returns & their phases are landmark events
      out.push({
        from, aspect: a.type, glyph: a.glyph, to, orb: a.orb, applying,
        retro: isRetrograde(from, jd), isCycle,
        score: base * hardBoost * applyBoost * cycleBoost,
      });
    }
  }
  return out.sort((x, y) => y.score - x.score);
}

// ── Moon phase (the daily emotional weather) ────────────────────────────────
export interface MoonPhase { angle: number; name: string; illum: number }
export function moonPhase(jd: number = jdOfDate()): MoonPhase {
  const angle = ((moonLon(jd) - sunLon(jd)) % 360 + 360) % 360;
  const names = [
    'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
    'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
  ];
  const name = names[Math.floor(((angle + 22.5) % 360) / 45)];
  const illum = (1 - Math.cos(angle * Math.PI / 180)) / 2; // 0=new, 1=full
  return { angle, name, illum };
}

// ── Life cycles — the great returns, astronomically real ────────────────────
// A body aspecting its OWN natal position marks a stage of that planet's cycle.
export interface LifeCycle { body: string; phase: string; orb: number; applying: boolean; note: string }

const CYCLE_NOTE: Record<string, Record<string, string>> = {
  Saturn: {
    conjunction: 'Saturn return — a threshold of maturity: what you build now is meant to last. Endings that clear the ground for who you are becoming.',
    opposition: 'Saturn opposition (mid-cycle) — a reckoning at the halfway point; the structures you set up ~14 years ago ask to be honored or released.',
    square: 'Saturn square (a turning quarter of the cycle) — pressure to adjust the foundation; real effort now pays off.',
  },
  Jupiter: {
    conjunction: 'Jupiter return (~every 12 years) — a new chapter of growth and possibility opens; plant boldly.',
    opposition: 'Jupiter opposition — expansion meets its limits; find the middle way between more and enough.',
    square: 'Jupiter square — growth with friction; watch for overreach, aim it well.',
  },
  Sun: { conjunction: 'Solar return — your cosmic birthday: the Sun returns to its birth degree, opening your personal new year.' },
  Moon: { conjunction: 'Lunar return — the monthly reset of your emotional tide; a day to feel where you truly stand.' },
  Uranus: {
    opposition: 'Uranus opposition (~age 40–42) — the great awakening / midlife turn: the urge to live more truly yourself.',
    square: 'Uranus square — a jolt toward freedom; something wants to break routine.',
  },
  Nodes: {},
};

export function lifeCycles(chart: Chart, jd: number = jdOfDate()): LifeCycle[] {
  const out: LifeCycle[] = [];
  for (const t of activeTransits(chart, jd)) {
    if (!t.isCycle) continue;
    const note = CYCLE_NOTE[t.from]?.[t.aspect];
    if (!note) continue;
    out.push({ body: t.from, phase: t.aspect, orb: t.orb, applying: t.applying, note });
  }
  return out;
}

// ── Themes for readings ─────────────────────────────────────────────────────
const TRANSIT_THEME: Record<string, string> = {
  Sun: 'vitality, identity, what is being spotlighted',
  Moon: 'mood, needs, the day’s emotional tide',
  Mercury: 'mind, messages, conversations, plans',
  Venus: 'love, values, money, what you draw close',
  Mars: 'drive, courage, friction, where to act',
  Jupiter: 'growth, luck, expansion, faith',
  Saturn: 'tests, structure, maturation, commitment',
  Uranus: 'disruption, awakening, freedom, surprise',
  Neptune: 'dreams, dissolving, inspiration, fog',
  Pluto: 'deep transformation, power, what must die and be reborn',
};
const NATAL_AREA: Record<string, string> = {
  Sun: 'your core self', Moon: 'your inner life and home', Mercury: 'your mind',
  Venus: 'your love and values', Mars: 'your drive', Jupiter: 'your growth',
  Saturn: 'your structures', Uranus: 'your need for freedom', Neptune: 'your dreams',
  Pluto: 'your depths', Asc: 'your identity and body', MC: 'your path and calling',
};
const ASPECT_QUALITY: Record<string, string> = {
  conjunction: 'fuses with / ignites', opposition: 'pulls against / brings to a head',
  trine: 'flows easily into', square: 'presses on / demands action from',
  sextile: 'opens an opportunity with', quincunx: 'asks an adjustment of',
};

export function describeTransit(t: Transit): string {
  const dir = t.applying ? 'building' : 'easing';
  const retro = t.retro ? ', retrograde' : '';
  return `Transiting ${t.from}${retro} ${ASPECT_QUALITY[t.aspect] ?? t.aspect} ${NATAL_AREA[t.to] ?? t.to} (${t.aspect}, orb ${t.orb}°, ${dir}) — ${TRANSIT_THEME[t.from]}`;
}

// Summary lines for a reading at a given moment (default: now).
export function transitSummary(chart: Chart, jd: number = jdOfDate(), topN = 6): string[] {
  const mp = moonPhase(jd);
  const cycles = lifeCycles(chart, jd);
  const top = activeTransits(chart, jd).slice(0, topN);
  const lines: string[] = [];
  const mSign = signOf(moonLon(jd));
  lines.push(`Sky now: ${mp.name} (${Math.round(mp.illum * 100)}% lit), Moon in ${mSign}. Sun in ${signOf(sunLon(jd))} ${degInSign(sunLon(jd)).toFixed(0)}°.`);
  if (cycles.length) {
    lines.push('LIFE CYCLES active now:');
    for (const c of cycles) lines.push(`  • ${c.note} (orb ${c.orb}°, ${c.applying ? 'approaching exact' : 'separating'})`);
  }
  lines.push('Strongest transits to your chart:');
  for (const t of top) lines.push(`  • ${describeTransit(t)}`);
  return lines;
}
