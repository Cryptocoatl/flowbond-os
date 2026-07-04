import { describe, expect, it } from 'vitest';
import { computeChart } from '../chart';
import { sunLon } from '../ephemeris';
import { designJd, gateOf, GATE_ORDER, GENE_KEYS, geneKeys, geneKeysSummary } from '../genekeys';

// Same reference birth as engine.test.ts — CDMX 1994-03-24.
const chart = computeChart({
  date: '1994-03-24',
  time: '23:03',
  tz: 'America/Mexico_City',
  lat: 19.4326,
  lng: -99.1332,
  place: 'Mexico City',
});

describe('mandala wheel', () => {
  it('covers all 64 gates exactly once', () => {
    expect(new Set(GATE_ORDER).size).toBe(64);
    expect([...GATE_ORDER].sort((a, b) => a - b)[0]).toBe(1);
    expect([...GATE_ORDER].sort((a, b) => a - b)[63]).toBe(64);
  });

  it('starts Gate 41 line 1 at 302° (02° Aquarius)', () => {
    expect(gateOf(302)).toEqual({ gate: 41, line: 1 });
    expect(gateOf(301.99)).toEqual({ gate: 60, line: 6 }); // wheel closes with Gate 60
  });

  it('Gate 25 spans the Aries point (published anchor)', () => {
    expect(gateOf(358.25).gate).toBe(25);
    expect(gateOf(0).gate).toBe(25);
    expect(gateOf(3.8).gate).toBe(25);
    expect(gateOf(3.9).gate).toBe(17); // 3°52'30" Aries boundary
  });

  it('Gate 1 starts at 13°15\' Scorpio (223.25°)', () => {
    expect(gateOf(223.25)).toEqual({ gate: 1, line: 1 });
    expect(gateOf(223.24).gate).toBe(44);
  });

  it('every gate has a Gene Keys keynote triplet', () => {
    for (let g = 1; g <= 64; g++) {
      expect(GENE_KEYS[g].shadow).toBeTruthy();
      expect(GENE_KEYS[g].gift).toBeTruthy();
      expect(GENE_KEYS[g].siddhi).toBeTruthy();
    }
  });
});

describe('design moment', () => {
  it('is 85–95 days before birth with solar arc 88°±0.01', () => {
    const dJd = designJd(chart);
    expect(chart.jd - dJd).toBeGreaterThan(85);
    expect(chart.jd - dJd).toBeLessThan(95);
    const arc = (((chart.bodies.Sun.abs - sunLon(dJd)) % 360) + 360) % 360;
    expect(arc).toBeCloseTo(88, 2);
  });
});

describe('reference chart (regression pins)', () => {
  const gk = geneKeys(chart);

  it('personality Sun = Gate 17 line 1 (tropical Sun ≈ 4.3° Aries)', () => {
    expect(gk.personality.Sun).toEqual({ gate: 17, line: 1 });
  });

  it('Earth is always opposite the Sun on the wheel', () => {
    expect(gk.personality.Earth).toEqual(gateOf(chart.bodies.Sun.abs + 180));
    expect(gk.spheres.evolution.gate).toBe(18);
  });

  it('spheres map to the right activations', () => {
    expect(gk.spheres.lifesWork).toEqual(gk.personality.Sun);
    expect(gk.spheres.evolution).toEqual(gk.personality.Earth);
    expect(gk.spheres.radiance).toEqual(gk.design.Sun);
    expect(gk.spheres.purpose).toEqual(gk.design.Earth);
    expect(gk.incarnationCross).toHaveLength(4);
  });

  it('profile is personalitySunLine/designSunLine', () => {
    expect(gk.profile).toBe(`${gk.personality.Sun.line}/${gk.design.Sun.line}`);
    expect(gk.profile).toMatch(/^[1-6]\/[1-6]$/);
  });

  it('summary lines carry the shadow → gift → siddhi arc', () => {
    const lines = geneKeysSummary(gk);
    expect(lines[0]).toContain('Profile');
    expect(lines[1]).toContain('Opinion → Far-Sightedness → Omniscience'); // Gate 17
    expect(lines).toHaveLength(5);
  });
});
