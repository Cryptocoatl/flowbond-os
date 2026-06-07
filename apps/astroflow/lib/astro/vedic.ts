// Vedic (sidereal) layer — derived from the validated tropical engine.
// Tropical longitude − ayanamsa = sidereal longitude; everything else
// (rashis, nakshatras, Vimshottari) is bookkeeping on top of that.
// Consumes Chart only; never recomputes planetary positions.

import type { Chart } from './types';
import { ZODIAC, type Sign } from './ephemeris';

// Index-aligned with ZODIAC (Aries…Pisces).
export const RASHIS = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
] as const;

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

// Vimshottari lords cycle through the 27 nakshatras three times (9 lords × 3).
export const DASHA_SEQUENCE = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
] as const;
export const DASHA_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

const NAK_SPAN = 360 / 27; // 13°20'

export interface VedicPosition {
  sidereal: number;        // sidereal ecliptic longitude 0–360
  rashi: string;           // Sanskrit sign
  sign: Sign;              // western equivalent of the sidereal sign
  degInRashi: number;
  nakshatra: string;
  nakshatraLord: string;   // Vimshottari lord
  pada: number;            // 1–4
}

export interface VedicChart {
  ayanamsa: number;
  bodies: Record<string, VedicPosition>;
  asc: VedicPosition | null;   // Lagna
  node: VedicPosition;         // Rahu (mean node)
}

// Lahiri/Chitrapaksha ayanamsa: anchored at 23.853° (J2000) plus the IAU 2006
// accumulated general precession in longitude (≈50.29″/yr). Good to well under
// 0.1° for 1900–2100 — plenty for sign/nakshatra/pada work.
export function lahiriAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000
  return 23.853 + (5028.796195 * T + 1.1054348 * T * T) / 3600;
}

export function toSidereal(abs: number, jd: number): number {
  return (((abs - lahiriAyanamsa(jd)) % 360) + 360) % 360;
}

function position(abs: number, jd: number): VedicPosition {
  const sid = toSidereal(abs, jd);
  const signIdx = Math.floor(sid / 30);
  const nakIdx = Math.floor(sid / NAK_SPAN);
  return {
    sidereal: sid,
    rashi: RASHIS[signIdx],
    sign: ZODIAC[signIdx],
    degInRashi: sid - signIdx * 30,
    nakshatra: NAKSHATRAS[nakIdx],
    nakshatraLord: DASHA_SEQUENCE[nakIdx % 9],
    pada: Math.floor((sid % NAK_SPAN) / (NAK_SPAN / 4)) + 1,
  };
}

export function vedicChart(chart: Chart): VedicChart {
  const bodies: Record<string, VedicPosition> = {};
  for (const [name, b] of Object.entries(chart.bodies)) bodies[name] = position(b.abs, chart.jd);
  return {
    ayanamsa: lahiriAyanamsa(chart.jd),
    bodies,
    asc: chart.asc ? position(chart.asc.abs, chart.jd) : null,
    node: position(chart.node.abs, chart.jd),
  };
}

// ── Vimshottari maha-dasha from the Moon's nakshatra at birth ───────────────
export interface Vimshottari {
  lord: string;                                  // birth (first) maha-dasha lord
  balanceYears: number;                          // remaining years of that dasha at birth
  sequence: { lord: string; years: number }[];   // full 120-year cycle from birth lord
}

export function vimshottariDasha(chart: Chart): Vimshottari {
  const moon = toSidereal(chart.bodies.Moon.abs, chart.jd);
  const nakIdx = Math.floor(moon / NAK_SPAN);
  const lord = DASHA_SEQUENCE[nakIdx % 9];
  const traversed = (moon % NAK_SPAN) / NAK_SPAN; // fraction of the nakshatra walked
  const start = DASHA_SEQUENCE.indexOf(lord as (typeof DASHA_SEQUENCE)[number]);
  return {
    lord,
    balanceYears: DASHA_YEARS[lord] * (1 - traversed),
    sequence: Array.from({ length: 9 }, (_, i) => {
      const l = DASHA_SEQUENCE[(start + i) % 9];
      return { lord: l, years: DASHA_YEARS[l] };
    }),
  };
}

// ── Summary lines for readings ──────────────────────────────────────────────
export function vedicSummary(v: VedicChart): string[] {
  const lines: string[] = [
    `Ayanamsa (Lahiri): ${v.ayanamsa.toFixed(2)}° — sidereal positions below`,
  ];
  for (const name of ['Sun', 'Moon'] as const) {
    const p = v.bodies[name];
    if (p) lines.push(`${name} in ${p.rashi} (${p.sign} sidereal) — ${p.nakshatra} pada ${p.pada}, ruled by ${p.nakshatraLord}`);
  }
  if (v.asc) lines.push(`Lagna (ascendant) in ${v.asc.rashi} — ${v.asc.nakshatra} pada ${v.asc.pada}`);
  lines.push(`Rahu in ${v.node.rashi} — ${v.node.nakshatra}`);
  return lines;
}
