import { describe, it, expect } from 'vitest';
import { computeChart } from '../chart';

// Locks the engine to the Python-validated reference chart (validated to the degree).
// ANY change to ephemeris.ts / chart.ts must keep this green.
//   Sun Aries ~4.3° H5 · Moon Virgo ~2.9° H10 · Asc Sagittarius ~3.4° · MC Virgo ~7.4° · Node Scorpio
//   Mars Pisces · Saturn Pisces · Jupiter Scorpio ℞ · Pluto Scorpio
const chart = computeChart({
  date: '1994-03-24',
  time: '23:03',
  tz: 'America/Mexico_City',
  lat: 19.4326,
  lng: -99.1332, // CDMX — west of Greenwich → east-positive negative
  place: 'CDMX',
});

const near = (got: number, want: number, tol = 0.3) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);

describe('AstralFlow engine — validated CDMX reference chart', () => {
  it('Sun: Aries ~4.33° in House 5', () => {
    expect(chart.bodies.Sun.sign).toBe('Aries');
    near(chart.bodies.Sun.deg, 4.33);
    expect(chart.bodies.Sun.house).toBe(5);
  });

  it('Moon: Virgo ~2.9° in House 10', () => {
    expect(chart.bodies.Moon.sign).toBe('Virgo');
    near(chart.bodies.Moon.deg, 2.9);
    expect(chart.bodies.Moon.house).toBe(10);
  });

  it('Ascendant: Sagittarius ~3.4°', () => {
    expect(chart.asc?.sign).toBe('Sagittarius');
    near(chart.asc!.deg, 3.4, 0.6);
  });

  it('Midheaven: Virgo ~7.35°', () => {
    expect(chart.mc?.sign).toBe('Virgo');
    near(chart.mc!.deg, 7.35, 0.6);
  });

  it('North Node: Scorpio', () => {
    expect(chart.node.sign).toBe('Scorpio');
  });

  it('outer placements: Mars/Saturn Pisces, Jupiter Scorpio ℞, Pluto Scorpio', () => {
    expect(chart.bodies.Mars.sign).toBe('Pisces');
    expect(chart.bodies.Saturn.sign).toBe('Pisces');
    expect(chart.bodies.Jupiter.sign).toBe('Scorpio');
    expect(chart.bodies.Jupiter.retro).toBe(true);
    expect(chart.bodies.Pluto.sign).toBe('Scorpio');
  });
});
