import { describe, expect, it } from 'vitest';
import {
  dreamspell, haab, jdnFromDate, longCount, lordOfNight, mayanSummary, tzolkin,
} from '../mayan';

// JDN → jd at noon so floor(jd + 0.5) lands back on the same civil day.
const jdOf = (date: string) => jdnFromDate(date) - 0.5 + 0.5;

describe('GMT correlation (584283)', () => {
  it('anchors 0.0.0.0.0 = 4 Ahau 8 Cumku, G9', () => {
    const jd = 584283;
    expect(longCount(jd)).toEqual({ baktun: 0, katun: 0, tun: 0, uinal: 0, kin: 0 });
    expect(tzolkin(jd)).toMatchObject({ number: 4, dayName: 'Ahau' });
    expect(haab(jd)).toEqual({ day: 8, month: 'Cumku' });
    expect(lordOfNight(jd)).toBe('G9');
  });

  it('2012-12-21 = 13.0.0.0.0 = 4 Ahau 3 Kankin', () => {
    const jd = jdOf('2012-12-21');
    expect(jdnFromDate('2012-12-21')).toBe(2456283); // published JDN
    expect(longCount(jd)).toEqual({ baktun: 13, katun: 0, tun: 0, uinal: 0, kin: 0 });
    expect(tzolkin(jd)).toMatchObject({ number: 4, dayName: 'Ahau' });
    expect(haab(jd)).toEqual({ day: 3, month: 'Kankin' });
  });

  it('2000-01-01 = 12.19.6.15.2, 11 Ik (published cross-check)', () => {
    const jd = jdOf('2000-01-01');
    expect(longCount(jd)).toEqual({ baktun: 12, katun: 19, tun: 6, uinal: 15, kin: 2 });
    expect(tzolkin(jd)).toMatchObject({ number: 11, dayName: 'Ik' });
  });

  it('app reference birth date 1994-03-24', () => {
    const jd = jdOf('1994-03-24');
    expect(longCount(jd)).toEqual({ baktun: 12, katun: 19, tun: 0, uinal: 17, kin: 13 });
    expect(tzolkin(jd)).toMatchObject({ number: 8, dayName: 'Ben' });
    expect(haab(jd)).toEqual({ day: 11, month: 'Cumku' });
    expect(lordOfNight(jd)).toBe('G2');
  });
});

describe('Dreamspell', () => {
  it('anchor 2013-07-26 = Kin 164, Yellow Galactic Seed', () => {
    const ds = dreamspell('2013-07-26');
    expect(ds.kin).toBe(164);
    expect(ds.toneName).toBe('Galactic');
    expect(ds.sealName).toBe('Yellow Seed');
    // published oracle for kin 164
    expect(ds.oracle).toEqual({ guide: 8, analog: 15, antipode: 14, occult: 17 });
  });

  it("Argüelles 1939-01-24 = Kin 11, Blue Spectral Monkey (independent anchor)", () => {
    const ds = dreamspell('1939-01-24');
    expect(ds.kin).toBe(11);
    expect(ds.toneName).toBe('Spectral');
    expect(ds.sealName).toBe('Blue Monkey');
  });

  it('2012-12-21 = Kin 207, Blue Crystal Hand', () => {
    const ds = dreamspell('2012-12-21');
    expect(ds.kin).toBe(207);
    expect(ds.toneName).toBe('Crystal');
    expect(ds.sealName).toBe('Blue Hand');
  });

  it('app reference 1994-03-24 = Kin 125, Red Galactic Serpent', () => {
    const ds = dreamspell('1994-03-24');
    expect(ds.kin).toBe(125);
    expect(ds.toneName).toBe('Galactic');
    expect(ds.sealName).toBe('Red Serpent');
    expect(ds.color).toBe('Red');
  });

  it('Feb 29 carries no kin: it repeats Feb 28 and Mar 1 continues the count', () => {
    const feb28 = dreamspell('2020-02-28');
    const feb29 = dreamspell('2020-02-29');
    const mar01 = dreamspell('2020-03-01');
    expect(feb29.kin).toBe(feb28.kin);
    expect(mar01.kin).toBe((feb28.kin % 260) + 1);
  });

  it('kin 260 is Yellow Cosmic Sun (seal-order invariant)', () => {
    // find a date with kin 260 by walking from the anchor
    const ds = dreamspell('2013-10-30'); // anchor +96 days, no leap day → 164+96=260
    expect(ds.kin).toBe(260);
    expect(ds.toneName).toBe('Cosmic');
    expect(ds.sealName).toBe('Yellow Sun');
  });
});

describe('summary', () => {
  it('emits clearly labeled lines for both systems', () => {
    const lines = mayanSummary(jdOf('1994-03-24'), '1994-03-24');
    expect(lines[0]).toContain('Traditional (GMT)');
    expect(lines[0]).toContain('8 Ben');
    expect(lines[1]).toContain('Kin 125');
    expect(lines[2]).toContain('guide');
  });
});
