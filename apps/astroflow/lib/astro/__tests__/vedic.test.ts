import { describe, expect, it } from 'vitest';
import { computeChart } from '../chart';
import {
  DASHA_YEARS, lahiriAyanamsa, NAKSHATRAS, toSidereal, vedicChart, vedicSummary, vimshottariDasha,
} from '../vedic';

// Same reference birth as engine.test.ts — CDMX 1994-03-24.
const chart = computeChart({
  date: '1994-03-24',
  time: '23:03',
  tz: 'America/Mexico_City',
  lat: 19.4326,
  lng: -99.1332,
  place: 'Mexico City',
});

const NAK_SPAN = 360 / 27;

describe('lahiriAyanamsa', () => {
  it('is in the published band for 1994 (≈23.77°)', () => {
    const ay = lahiriAyanamsa(chart.jd);
    expect(ay).toBeGreaterThan(23.7);
    expect(ay).toBeLessThan(23.9);
  });

  it('grows ~50.29″/yr (one century ≈ +1.397°)', () => {
    const d = lahiriAyanamsa(2451545 + 36525) - lahiriAyanamsa(2451545);
    expect(d).toBeGreaterThan(1.35);
    expect(d).toBeLessThan(1.45);
  });
});

describe('sidereal conversion', () => {
  it('sidereal = tropical − ayanamsa (mod 360) for every body', () => {
    const v = vedicChart(chart);
    const ay = lahiriAyanamsa(chart.jd);
    for (const [name, b] of Object.entries(chart.bodies)) {
      const expected = (((b.abs - ay) % 360) + 360) % 360;
      expect(v.bodies[name].sidereal).toBeCloseTo(expected, 8);
    }
  });

  it('nakshatra index and pada are consistent with the sidereal longitude', () => {
    const v = vedicChart(chart);
    for (const p of Object.values(v.bodies)) {
      expect(p.nakshatra).toBe(NAKSHATRAS[Math.floor(p.sidereal / NAK_SPAN)]);
      const pada = Math.floor((p.sidereal % NAK_SPAN) / (NAK_SPAN / 4)) + 1;
      expect(p.pada).toBe(pada);
      expect(p.pada).toBeGreaterThanOrEqual(1);
      expect(p.pada).toBeLessThanOrEqual(4);
    }
  });

  it('toSidereal wraps negative results into 0–360', () => {
    expect(toSidereal(10, chart.jd)).toBeGreaterThan(340); // 10° − ~23.8° wraps
  });
});

describe('vimshottariDasha', () => {
  it('full cycle sums to 120 years', () => {
    const d = vimshottariDasha(chart);
    expect(d.sequence.reduce((s, x) => s + x.years, 0)).toBe(120);
  });

  it('starts at the Moon-nakshatra lord with a sane balance', () => {
    const d = vimshottariDasha(chart);
    const moonSid = toSidereal(chart.bodies.Moon.abs, chart.jd);
    const lord = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'][
      Math.floor(moonSid / NAK_SPAN) % 9
    ];
    expect(d.lord).toBe(lord);
    expect(d.sequence[0].lord).toBe(lord);
    expect(d.balanceYears).toBeGreaterThan(0);
    expect(d.balanceYears).toBeLessThanOrEqual(DASHA_YEARS[lord]);
  });
});

describe('reference snapshot (regression pin)', () => {
  // Pinned from this module's own formulas at first green run — guards drift.
  it('reference chart sidereal Sun/Moon land where they landed', () => {
    const v = vedicChart(chart);
    expect(v.ayanamsa).toBeCloseTo(23.772, 2);
    // Tropical Sun ≈ 4.33° Aries → sidereal ≈ 340.56° = Meena (Pisces)
    expect(v.bodies.Sun.rashi).toBe('Meena');
    expect(v.bodies.Sun.nakshatra).toBe('Uttara Bhadrapada');
    expect(Math.floor(v.bodies.Sun.sidereal)).toBe(340);
  });

  it('summary lines are labeled and complete', () => {
    const lines = vedicSummary(vedicChart(chart));
    expect(lines[0]).toContain('Ayanamsa');
    expect(lines.some((l) => l.startsWith('Sun in'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Moon in'))).toBe(true);
    expect(lines.some((l) => l.includes('Lagna'))).toBe(true);
  });
});
