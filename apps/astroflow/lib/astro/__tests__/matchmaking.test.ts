import { describe, it, expect } from 'vitest';
import { computeChart } from '../chart';
import type { AstroProfile } from '../types';
import { rankMatches, bestIntention, resonanceAcross, INTENTIONS } from '../matchmaking';

const me = computeChart({ date: '1994-03-24', time: '23:03', tz: 'America/Mexico_City', lat: 19.4326, lng: -99.1332, place: 'CDMX' });
const b = computeChart({ date: '1988-07-11', time: '06:15', tz: 'Asia/Tokyo', lat: 35.68, lng: 139.69, place: 'Tokyo' });
const c = computeChart({ date: '1979-11-02', time: '14:40', tz: 'Europe/London', lat: 51.5, lng: -0.12, place: 'London' });

const prof = (chart: any, handle: string): AstroProfile => ({
  fbid: handle, handle, displayName: handle, avatarColor: '#fff', visibility: 'specific',
  birth: { date: '', time: '', tz: '', lat: 0, lng: 0, place: '' } as any, chart,
});

describe('rankMatches', () => {
  const others = [prof(b, 'tokyo'), prof(c, 'london')];

  it('returns one match per charted profile, sorted by score desc', () => {
    const r = rankMatches(me, others, 'romance');
    expect(r).toHaveLength(2);
    expect(r[0].score).toBeGreaterThanOrEqual(r[1].score);
  });

  it('every match carries a band, panorama and score in range', () => {
    for (const m of rankMatches(me, others, 'friendship')) {
      expect(m.score).toBeGreaterThanOrEqual(0);
      expect(m.score).toBeLessThanOrEqual(100);
      expect(m.band.label).toBeTruthy();
      expect(m.panorama.context).toBe('friendship');
    }
  });

  it('skips profiles with no chart', () => {
    const withGhost = [...others, { ...prof(b, 'ghost'), chart: undefined as any }];
    expect(rankMatches(me, withGhost, 'romance')).toHaveLength(2);
  });

  it('the chosen intention drives the ordering (context matters)', () => {
    const romance = rankMatches(me, others, 'romance').map((m) => m.profile.handle);
    const business = rankMatches(me, others, 'business').map((m) => m.profile.handle);
    // Scores per context differ; at minimum the score values should differ.
    const rs = rankMatches(me, others, 'romance').map((m) => m.score);
    const bs = rankMatches(me, others, 'business').map((m) => m.score);
    expect(rs).not.toEqual(bs);
    expect(romance.sort()).toEqual(business.sort()); // same people, possibly reordered
  });
});

describe('bestIntention / resonanceAcross', () => {
  it('bestIntention returns a valid intention and its score is the max across lenses', () => {
    const { intention, score } = bestIntention(me, b);
    const all = resonanceAcross(me, b);
    expect(INTENTIONS.map((i) => i.ctx)).toContain(intention.ctx);
    expect(score).toBe(Math.max(...all.map((a) => a.score)));
  });

  it('resonanceAcross covers all four intentions, sorted high to low', () => {
    const r = resonanceAcross(me, c);
    expect(r).toHaveLength(4);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
  });
});
