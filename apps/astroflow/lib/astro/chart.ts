import {
  jdFromUTC, sunLon, moonLon, geoLon, isRetrograde, ascendant, midheaven,
  meanNode, signOf, degInSign, OUTER, ZODIAC, type Sign,
} from './ephemeris';
import type { BirthData, Chart, Body } from './types';

const ELEMENT: Record<Sign, 'Fire' | 'Earth' | 'Air' | 'Water'> = {
  Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
  Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
  Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
  Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
};
const MODALITY: Record<Sign, 'Cardinal' | 'Fixed' | 'Mutable'> = {
  Aries: 'Cardinal', Cancer: 'Cardinal', Libra: 'Cardinal', Capricorn: 'Cardinal',
  Taurus: 'Fixed', Leo: 'Fixed', Scorpio: 'Fixed', Aquarius: 'Fixed',
  Gemini: 'Mutable', Virgo: 'Mutable', Sagittarius: 'Mutable', Pisces: 'Mutable',
};

/**
 * Convert a local birth date/time in an IANA zone to a UTC Date.
 * Uses the Intl API to resolve the zone's offset at that instant.
 */
export function localToUTC(date: string, time: string, tz: string): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  // First guess: treat the wall-clock as UTC, then correct by the zone offset.
  const guess = Date.UTC(y, mo - 1, d, hh, mm);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = dtf.formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
  const offset = asUTC - guess; // zone is `offset` ms ahead of UTC at this instant
  return new Date(guess - offset);
}

export function computeChart(birth: BirthData): Chart {
  const hasTime = birth.time !== null;
  const utc = hasTime
    ? localToUTC(birth.date, birth.time as string, birth.tz)
    : localToUTC(birth.date, '12:00', birth.tz); // noon if time unknown
  const JD = jdFromUTC(utc);

  const lon: Record<string, number> = { Sun: sunLon(JD), Moon: moonLon(JD) };
  for (const p of OUTER) lon[p] = geoLon(p, JD);

  const asc = hasTime ? ascendant(JD, birth.lat, birth.lng) : null;
  const mc = hasTime ? midheaven(JD, birth.lng) : null;
  const node = meanNode(JD);
  const ascSignIdx = asc !== null ? ZODIAC.indexOf(signOf(asc)) : 0;

  const bodies: Record<string, Body> = {};
  const elements = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalities = { Cardinal: 0, Fixed: 0, Mutable: 0 };
  for (const name of ['Sun', 'Moon', ...OUTER]) {
    const L = lon[name];
    const sign = signOf(L);
    const house = hasTime ? ((ZODIAC.indexOf(sign) - ascSignIdx + 12) % 12) + 1 : 0;
    bodies[name] = {
      abs: +L.toFixed(2), sign, deg: +degInSign(L).toFixed(2), house,
      retro: isRetrograde(name, JD),
    };
    elements[ELEMENT[sign]]++;
    modalities[MODALITY[sign]]++;
  }
  if (asc !== null) {
    elements[ELEMENT[signOf(asc)]]++;
    modalities[MODALITY[signOf(asc)]]++;
  }

  return {
    jd: JD,
    hasTime,
    bodies,
    asc: asc !== null ? { abs: +asc.toFixed(2), sign: signOf(asc), deg: +degInSign(asc).toFixed(2) } : null,
    mc: mc !== null ? { abs: +mc.toFixed(2), sign: signOf(mc), deg: +degInSign(mc).toFixed(2) } : null,
    node: { abs: +node.toFixed(2), sign: signOf(node), deg: +degInSign(node).toFixed(2) },
    elements,
    modalities,
  };
}
