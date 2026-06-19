import type { Chart } from './types';
import { vedicChart, NAKSHATRAS, RASHIS } from './vedic';
import { tzolkin, TZOLKIN_NAMES } from './mayan';
import { geneKeys, GENE_KEYS } from './genekeys';

// ── Collective "currents" layout ────────────────────────────────────────────
// Lay a constellation's members out through one tradition at a time, so an
// expert in that lens can read the whole crew at a glance. All math comes from
// the already-validated engines — this only re-projects each chart into the
// coordinates a given current's visual frame needs. Server-safe & pure: the
// client receives plain numbers/strings and never imports the engines.

export interface LensMember {
  name: string;
  color: string;
  chart?: Chart; // absent = sky not shared with the viewer (shown, not plotted)
}

export const ZODIAC = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export const SIGN_GLYPH: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

export const SIGN_ELEMENT: Record<string, 'Fire' | 'Earth' | 'Air' | 'Water'> = {
  Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
  Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
  Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
  Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
};

export const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☾', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

// The bodies we plot on the western collective wheel (the personal planets +
// the two social planets — enough signal without overcrowding the ring).
const WHEEL_BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const;

export interface WesternMember {
  name: string;
  color: string;
  shared: boolean;
  planets: { p: string; glyph: string; abs: number; sign: string }[];
  ascAbs: number | null;
}
export interface VedicMember {
  name: string;
  color: string;
  shared: boolean;
  moonNakIdx: number | null;   // 0–26
  moonNak: string | null;
  moonNakLord: string | null;
  lagnaIdx: number | null;     // 0–11 (rashi)
  lagna: string | null;
}
export interface MayanMember {
  name: string;
  color: string;
  shared: boolean;
  sealIdx: number | null;      // 0–19
  seal: string | null;
  tone: number | null;         // 1–13
  meaning: string | null;
}
export interface GeneKeysMember {
  name: string;
  color: string;
  shared: boolean;
  spheres: { key: string; label: string; gate: number; line: number }[];
}

export interface CurrentsData {
  western: WesternMember[];
  vedic: VedicMember[];
  mayan: MayanMember[];
  genekeys: {
    members: GeneKeysMember[];
    // gates carried by 2+ members = the collective's shared evolutionary themes
    resonance: { gate: number; count: number; gift: string; siddhi: string }[];
  };
  count: number;       // members with a shared chart (plotted)
  total: number;       // all members
}

const SPHERE_LABELS: { key: string; label: string }[] = [
  { key: 'lifesWork', label: "Life's Work" },
  { key: 'evolution', label: 'Evolution' },
  { key: 'radiance', label: 'Radiance' },
  { key: 'purpose', label: 'Purpose' },
];

export function buildCurrents(members: LensMember[]): CurrentsData {
  const western: WesternMember[] = [];
  const vedic: VedicMember[] = [];
  const mayan: MayanMember[] = [];
  const gk: GeneKeysMember[] = [];
  const gateCount = new Map<number, number>();

  for (const m of members) {
    const base = { name: m.name, color: m.color };
    if (!m.chart) {
      western.push({ ...base, shared: false, planets: [], ascAbs: null });
      vedic.push({ ...base, shared: false, moonNakIdx: null, moonNak: null, moonNakLord: null, lagnaIdx: null, lagna: null });
      mayan.push({ ...base, shared: false, sealIdx: null, seal: null, tone: null, meaning: null });
      gk.push({ ...base, shared: false, spheres: [] });
      continue;
    }
    const c = m.chart;

    // Western — personal+social planets on the ecliptic wheel
    western.push({
      ...base,
      shared: true,
      planets: WHEEL_BODIES.filter((p) => c.bodies[p]).map((p) => ({
        p,
        glyph: PLANET_GLYPH[p] ?? p[0],
        abs: c.bodies[p].abs,
        sign: c.bodies[p].sign,
      })),
      ascAbs: c.asc?.abs ?? null,
    });

    // Vedic — the Moon's nakshatra (the heart of jyotish) + the Lagna
    const v = vedicChart(c);
    const moon = v.bodies.Moon;
    const moonNakIdx = moon ? NAKSHATRAS.indexOf(moon.nakshatra as (typeof NAKSHATRAS)[number]) : -1;
    const lagnaIdx = v.asc ? RASHIS.indexOf(v.asc.rashi as (typeof RASHIS)[number]) : -1;
    vedic.push({
      ...base,
      shared: true,
      moonNakIdx: moonNakIdx >= 0 ? moonNakIdx : null,
      moonNak: moon?.nakshatra ?? null,
      moonNakLord: moon?.nakshatraLord ?? null,
      lagnaIdx: lagnaIdx >= 0 ? lagnaIdx : null,
      lagna: v.asc?.rashi ?? null,
    });

    // Mayan — the day-sign (seal) and galactic tone from the Tzolk'in count
    const tz = tzolkin(c.jd);
    const sealIdx = TZOLKIN_NAMES.indexOf(tz.dayName as (typeof TZOLKIN_NAMES)[number]);
    mayan.push({
      ...base,
      shared: true,
      sealIdx: sealIdx >= 0 ? sealIdx : null,
      seal: tz.dayName,
      tone: tz.number,
      meaning: tz.meaning,
    });

    // Gene Keys — the four prime-gift gates of the Activation Sequence
    const profile = geneKeys(c);
    const spheres = SPHERE_LABELS.map(({ key, label }) => {
      const g = (profile.spheres as Record<string, { gate: number; line: number }>)[key];
      return { key, label, gate: g.gate, line: g.line };
    });
    gk.push({ ...base, shared: true, spheres });
    for (const s of spheres) gateCount.set(s.gate, (gateCount.get(s.gate) ?? 0) + 1);
  }

  const resonance = [...gateCount.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([gate, count]) => ({
      gate,
      count,
      gift: GENE_KEYS[gate]?.gift ?? '',
      siddhi: GENE_KEYS[gate]?.siddhi ?? '',
    }));

  return {
    western,
    vedic,
    mayan,
    genekeys: { members: gk, resonance },
    count: members.filter((m) => m.chart).length,
    total: members.length,
  };
}
