import { describe, it, expect } from 'vitest';
import { jdFromUTC } from '../ephemeris';
import { chineseNewYearJD, chineseSummary, chineseYearOf } from '../chinese';

// The astronomically computed Chinese New Year day must match the published
// calendar (day-level, China time). These are hard, well-known anchors.
const KNOWN_CNY: Record<number, [number, number]> = {
  1984: [2, 2],   // Feb 2 1984 — Wood Rat
  1990: [1, 27],  // Jan 27 1990 — Metal Horse
  1994: [2, 10],  // Feb 10 1994 — Wood Dog
  2000: [2, 5],   // Feb 5 2000 — Metal Dragon
  2020: [1, 25],  // Jan 25 2020 — Metal Rat
  2024: [2, 10],  // Feb 10 2024 — Wood Dragon
  2025: [1, 29],  // Jan 29 2025 — Wood Snake
};

function cnyLocalDate(year: number): [number, number] {
  // start-of-day UTC JD → the calendar day in China (UTC+8)
  const jd = chineseNewYearJD(year) + 8 / 24 + 1e-6;
  const d = new Date((jd - 2440587.5) * 86400000);
  return [d.getUTCMonth() + 1, d.getUTCDate()];
}

describe('Chinese New Year — astronomical boundary', () => {
  for (const [y, [m, day]] of Object.entries(KNOWN_CNY)) {
    it(`CNY ${y} = ${m}/${day}`, () => {
      expect(cnyLocalDate(Number(y))).toEqual([m, day]);
    });
  }
});

describe('chineseSummary', () => {
  it('reference chart 1994-03-24 is a yang Wood Dog', () => {
    const s = chineseSummary(jdFromUTC(new Date(Date.UTC(1994, 2, 24, 12))));
    expect(s.year).toBe(1994);
    expect(s.animal.name).toBe('Dog');
    expect(s.element.name).toBe('Wood');
    expect(s.yang).toBe(true);
    expect(s.allies.map((a) => a.name).sort()).toEqual(['Horse', 'Tiger']);
    expect(s.clash.name).toBe('Dragon');
    expect(s.secretFriend.name).toBe('Rabbit');
  });

  it('a January birth belongs to the PREVIOUS Chinese year', () => {
    // 1994-01-20 is before CNY (Feb 10 1994) → Water Rooster of 1993
    const s = chineseSummary(jdFromUTC(new Date(Date.UTC(1994, 0, 20, 12))));
    expect(s.year).toBe(1993);
    expect(s.animal.name).toBe('Rooster');
    expect(s.element.name).toBe('Water');
    expect(s.yang).toBe(false);
  });

  it('year switches exactly at the boundary', () => {
    const cny = chineseNewYearJD(2000);
    expect(chineseYearOf(cny - 0.01)).toBe(1999);
    expect(chineseYearOf(cny + 0.01)).toBe(2000);
  });
});
