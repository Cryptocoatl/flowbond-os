import { describe, it, expect } from 'vitest';
import { computeChart } from '../chart';
import { buildFacts, hashChart } from '../memory';
import type { BirthData } from '../types';

const REF: BirthData = {
  date: '1994-03-24', time: '12:00', tz: 'America/Mexico_City',
  lat: 19.4326, lng: -99.1332, place: 'CDMX',
};

describe('memory: cached facts', () => {
  const chart = computeChart(REF);

  it('hashChart is stable for the same chart and differs for a different one', () => {
    expect(hashChart(chart)).toBe(hashChart(computeChart(REF)));
    const other = computeChart({ ...REF, date: '1988-07-11' });
    expect(hashChart(chart)).not.toBe(hashChart(other));
  });

  it('buildFacts is deterministic and complete', () => {
    const a = buildFacts(chart, REF.date);
    const b = buildFacts(chart, REF.date);
    expect(a).toEqual(b); // pure
    for (const k of ['placements', 'aspects', 'elements', 'modalities', 'vedic', 'vimshottari', 'mayan', 'geneKeys', 'strongestSpot'])
      expect(a).toHaveProperty(k);
    expect(Array.isArray(a.placements)).toBe(true);
    expect(a.placements.length).toBeGreaterThan(0);
    expect(Array.isArray(a.aspects)).toBe(true);
  });
});
