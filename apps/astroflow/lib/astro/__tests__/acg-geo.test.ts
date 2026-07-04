import { describe, it, expect } from 'vitest';
import { computeChart } from '../chart';
import { polylinesOf, linesToGeoJSON, crossings, citiesAlong } from '../acg-geo';
import { CITIES } from '../../data/cities';
import { astrocartography } from '../astrocartography';
import type { BirthData } from '../types';

// Reuse the engine's locked reference chart (CDMX 1994-03-24).
const REF: BirthData = {
  date: '1994-03-24', time: '12:00', tz: 'America/Mexico_City',
  lat: 19.4326, lng: -99.1332, place: 'CDMX',
};

describe('acg-geo', () => {
  const chart = computeChart(REF);
  const lines = astrocartography(chart);

  it('renders MC meridians as one full-height vertical segment', () => {
    const mc = lines.find((l) => l.kind === 'MC')!;
    const segs = polylinesOf(mc);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toHaveLength(2);
    // constant longitude top to bottom
    expect(segs[0][0][0]).toBeCloseTo(segs[0][1][0], 6);
  });

  it('builds a valid LineString FeatureCollection with planet props', () => {
    const fc = linesToGeoJSON('Test', lines);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features.length).toBeGreaterThan(0);
    for (const f of fc.features) {
      expect(f.geometry.type).toBe('LineString');
      expect(f.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
      expect(f.properties.planet).toBeTruthy();
      expect(f.properties.color).toMatch(/^#/);
    }
  });

  it('keeps every coordinate in valid lng/lat range (antimeridian split holds)', () => {
    const fc = linesToGeoJSON('Test', lines);
    for (const f of fc.features)
      for (const [lng, lat] of f.geometry.coordinates) {
        expect(lng).toBeGreaterThanOrEqual(-180.001);
        expect(lng).toBeLessThanOrEqual(180.001);
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      }
  });

  it('reports cities along a line within orb, nearest first', () => {
    const mc = lines.find((l) => l.kind === 'MC')!;
    const hits = citiesAlong(polylinesOf(mc), CITIES, 5);
    expect(Array.isArray(hits)).toBe(true);
    for (let i = 1; i < hits.length; i++) expect(hits[i].orb).toBeGreaterThanOrEqual(hits[i - 1].orb);
    for (const h of hits) expect(h.orb).toBeLessThanOrEqual(5);
  });

  it('finds no crossings for a single person but does for two distinct charts', () => {
    const solo = crossings([{ name: 'A', color: '#fff', chart }]);
    expect(solo).toHaveLength(0);

    const other = computeChart({ ...REF, date: '1988-07-11', lng: -97.7431, lat: 30.2672, place: 'Austin' });
    const pair = crossings([
      { name: 'A', color: '#fff', chart },
      { name: 'B', color: '#0ff', chart: other },
    ]);
    expect(pair.length).toBeGreaterThan(0);
    for (const c of pair) {
      expect(c.a.person).not.toBe(c.b.person);
      expect(['harmonious', 'intense', 'mixed']).toContain(c.quality);
    }
  });
});
