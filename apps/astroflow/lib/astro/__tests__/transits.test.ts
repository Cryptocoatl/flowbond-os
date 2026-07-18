import { describe, it, expect } from 'vitest';
import { computeChart } from '../chart';
import { activeTransits, lifeCycles, moonPhase, transitLongitudes, jdOfDate } from '../transits';

// Reference chart (same birth data the engine test locks).
const chart = computeChart({
  date: '1994-03-24', time: '23:03', tz: 'America/Mexico_City',
  lat: 19.4326, lng: -99.1332, place: 'CDMX',
});

describe('transits engine', () => {
  it('at the exact moment of birth, every body conjuncts its own natal position', () => {
    // The cleanest self-consistency check: transits AT birth = all returns exact.
    const ts = activeTransits(chart, chart.jd);
    const cycles = ts.filter((t) => t.isCycle && t.aspect === 'conjunction');
    const bodies = new Set(cycles.map((c) => c.from));
    for (const b of ['Sun', 'Moon', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury']) {
      expect(bodies.has(b)).toBe(true);
    }
    // Those conjunctions are essentially exact.
    for (const c of cycles) expect(c.orb).toBeLessThan(1);
  });

  it('lifeCycles at birth surfaces the Saturn, Jupiter, solar and lunar returns', () => {
    const lc = lifeCycles(chart, chart.jd);
    const has = (body: string, phase: string) => lc.some((c) => c.body === body && c.phase === phase);
    expect(has('Saturn', 'conjunction')).toBe(true); // Saturn return
    expect(has('Jupiter', 'conjunction')).toBe(true); // Jupiter return
    expect(has('Sun', 'conjunction')).toBe(true);     // solar return (birthday)
    expect(has('Moon', 'conjunction')).toBe(true);    // lunar return
  });

  it('isCycle is set only when a body aspects itself', () => {
    const ts = activeTransits(chart, chart.jd + 5000);
    for (const t of ts) expect(t.isCycle).toBe(t.from === t.to);
  });

  it('moonPhase returns a valid phase and illumination', () => {
    const mp = moonPhase(chart.jd);
    expect([
      'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
      'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
    ]).toContain(mp.name);
    expect(mp.illum).toBeGreaterThanOrEqual(0);
    expect(mp.illum).toBeLessThanOrEqual(1);
  });

  it('transit longitudes are all in [0,360) for today', () => {
    const T = transitLongitudes(jdOfDate());
    for (const v of Object.values(T)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(360);
    }
  });

  it('every active transit is within its aspect orb', () => {
    for (const t of activeTransits(chart, jdOfDate())) {
      expect(t.orb).toBeLessThanOrEqual(8);
    }
  });
});
