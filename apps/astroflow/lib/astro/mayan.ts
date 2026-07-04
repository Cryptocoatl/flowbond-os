// Mayan calendars — BOTH counts:
//   A) Traditional/GMT: the archaeological correlation (Goodman–Martínez–
//      Thompson, constant 584283): Long Count, Tzolk'in, Haab, Lord of Night.
//   B) Dreamspell/13-Moon (José Argüelles): a modern civil-calendar overlay —
//      NOT a continuous day count; Feb 29 carries no kin (it repeats Feb 28).
// Pure calendar math; consumes a Julian Day (Chart.jd) or a civil date string.
// IMPORTANT: birth-day counts should use the LOCAL civil date — Chart.jd is
// UTC and can land on the next civil day (e.g. a 23:03 CDMX birth).

const GMT_CORRELATION = 584283; // JDN of Long Count 0.0.0.0.0 (4 Ahau 8 Cumku)

export const TZOLKIN_NAMES = [
  'Imix', 'Ik', 'Akbal', 'Kan', 'Chicchan', 'Cimi', 'Manik', 'Lamat', 'Muluc', 'Oc',
  'Chuen', 'Eb', 'Ben', 'Ix', 'Men', 'Cib', 'Caban', 'Etznab', 'Cauac', 'Ahau',
] as const;

const TZOLKIN_MEANING: Record<string, string> = {
  Imix: 'primal waters', Ik: 'breath, wind', Akbal: 'night, dream', Kan: 'seed, lizard',
  Chicchan: 'serpent, life force', Cimi: 'death, transformation', Manik: 'deer, hand',
  Lamat: 'star, rabbit', Muluc: 'water, offering', Oc: 'dog, loyalty',
  Chuen: 'monkey, artisan', Eb: 'road, grass', Ben: 'reed, pillar', Ix: 'jaguar, magician',
  Men: 'eagle, vision', Cib: 'owl, wisdom', Caban: 'earth, movement', Etznab: 'flint, mirror',
  Cauac: 'storm', Ahau: 'sun, lord',
};

export const HAAB_MONTHS = [
  'Pop', 'Uo', 'Zip', 'Zotz', 'Tzec', 'Xul', 'Yaxkin', 'Mol', 'Chen', 'Yax',
  'Zac', 'Ceh', 'Mac', 'Kankin', 'Muan', 'Pax', 'Kayab', 'Cumku', 'Wayeb',
] as const;

export interface LongCount { baktun: number; katun: number; tun: number; uinal: number; kin: number }
export interface Tzolkin { number: number; dayName: string; meaning: string }
export interface Haab { day: number; month: string }

// JDN of midnight (civil day) for a Julian Day value.
const jdn = (jd: number) => Math.floor(jd + 0.5);
// Positive modulo.
const pmod = (n: number, m: number) => ((n % m) + m) % m;

// JDN from a civil 'YYYY-MM-DD' (proleptic Gregorian, Fliegel–Van Flandern).
export function jdnFromDate(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
    Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

export function longCount(jd: number): LongCount {
  const days = jdn(jd) - GMT_CORRELATION;
  return {
    baktun: Math.floor(days / 144000),
    katun: pmod(Math.floor(days / 7200), 20),
    tun: pmod(Math.floor(days / 360), 20),
    uinal: pmod(Math.floor(days / 20), 18),
    kin: pmod(days, 20),
  };
}

export function tzolkin(jd: number): Tzolkin {
  const days = jdn(jd) - GMT_CORRELATION;
  const dayName = TZOLKIN_NAMES[pmod(days + 19, 20)]; // epoch day = 4 Ahau
  return { number: pmod(days + 3, 13) + 1, dayName, meaning: TZOLKIN_MEANING[dayName] };
}

export function haab(jd: number): Haab {
  const doy = pmod(jdn(jd) - GMT_CORRELATION + 348, 365); // epoch = 8 Cumku
  return { day: pmod(doy, 20), month: HAAB_MONTHS[Math.floor(doy / 20)] };
}

export function lordOfNight(jd: number): string {
  return `G${pmod(jdn(jd) - GMT_CORRELATION + 8, 9) + 1}`; // epoch = G9
}

// ── Dreamspell (Argüelles 13-Moon count) ────────────────────────────────────
// Canonical seal order — kin 260 must land on Yellow Cosmic Sun.
export const DREAMSPELL_SEALS = [
  'Red Dragon', 'White Wind', 'Blue Night', 'Yellow Seed', 'Red Serpent',
  'White Worldbridger', 'Blue Hand', 'Yellow Star', 'Red Moon', 'White Dog',
  'Blue Monkey', 'Yellow Human', 'Red Skywalker', 'White Wizard', 'Blue Eagle',
  'Yellow Warrior', 'Red Earth', 'White Mirror', 'Blue Storm', 'Yellow Sun',
] as const;

export const DREAMSPELL_TONES = [
  'Magnetic', 'Lunar', 'Electric', 'Self-Existing', 'Overtone', 'Rhythmic',
  'Resonant', 'Galactic', 'Solar', 'Planetary', 'Spectral', 'Crystal', 'Cosmic',
] as const;

export interface Dreamspell {
  kin: number;                     // 1–260
  tone: number; toneName: string;  // 1–13
  seal: number; sealName: string;  // 1–20
  color: 'Red' | 'White' | 'Blue' | 'Yellow';
  oracle: { guide: number; antipode: number; occult: number; analog: number }; // seal numbers
}

// Anchor: 2013-07-26 = Kin 164 (Yellow Galactic Seed). Cross-verified against
// Argüelles' own 1939-01-24 = Kin 11 (Blue Spectral Monkey) through the
// leap-day-skip arithmetic.
const DS_ANCHOR_JDN = jdnFromDate('2013-07-26');
const DS_ANCHOR_KIN = 164;

// Count Feb 29s in (from, to] civil-day range given as JDNs — Dreamspell days
// that don't advance the kin.
function leapDaysBetween(fromJdn: number, toJdn: number): number {
  const [lo, hi] = fromJdn <= toJdn ? [fromJdn, toJdn] : [toJdn, fromJdn];
  let count = 0;
  // Feb 29 of year y exists when y is a Gregorian leap year.
  const loYear = yearOfJdn(lo), hiYear = yearOfJdn(hi);
  for (let y = loYear; y <= hiYear; y++) {
    if (!(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) continue;
    const feb29 = jdnFromDate(`${y}-02-29`);
    if (feb29 > lo && feb29 <= hi) count++;
  }
  return fromJdn <= toJdn ? count : -count;
}

function yearOfJdn(j: number): number {
  // Inverse Fliegel–Van Flandern, year part only.
  const a = j + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return 100 * b + d - 4800 + Math.floor(m / 10);
}

const wrapSeal = (n: number) => pmod(n - 1, 20) + 1;

export function dreamspell(date: string): Dreamspell {
  let j = jdnFromDate(date);
  const [, m, d] = date.split('-').map(Number);
  if (m === 2 && d === 29) j -= 1; // Feb 29 carries Feb 28's kin

  const raw = j - DS_ANCHOR_JDN;                       // civil days from anchor
  const adj = raw - leapDaysBetween(DS_ANCHOR_JDN, j); // minus skipped Feb 29s
  const kin = pmod(DS_ANCHOR_KIN - 1 + adj, 260) + 1;

  const tone = pmod(kin - 1, 13) + 1;
  const seal = pmod(kin - 1, 20) + 1;
  const color = (['Red', 'White', 'Blue', 'Yellow'] as const)[pmod(seal - 1, 4)];

  // Guide seal offset depends on the tone family.
  const guideOffset = [0, 12, 4, 16, 8][pmod(tone - 1, 5)];
  return {
    kin, tone, toneName: DREAMSPELL_TONES[tone - 1], seal, sealName: DREAMSPELL_SEALS[seal - 1], color,
    oracle: {
      guide: wrapSeal(seal + guideOffset),
      analog: wrapSeal(19 - seal),
      antipode: wrapSeal(seal + 10),
      occult: wrapSeal(21 - seal),
    },
  };
}

// ── Summary lines for readings ──────────────────────────────────────────────
export function mayanSummary(jd: number, date: string): string[] {
  const lc = longCount(jd), tz = tzolkin(jd), hb = haab(jd);
  const ds = dreamspell(date);
  return [
    `Traditional (GMT): ${tz.number} ${tz.dayName} (${tz.meaning}) · ${hb.day} ${hb.month} · Long Count ${lc.baktun}.${lc.katun}.${lc.tun}.${lc.uinal}.${lc.kin} · ${lordOfNight(jd)}`,
    `Dreamspell: Kin ${ds.kin} — ${ds.color} ${ds.toneName} ${ds.sealName.split(' ').slice(1).join(' ')} (tone ${ds.tone}, seal ${ds.seal})`,
    `Dreamspell oracle: guide ${DREAMSPELL_SEALS[ds.oracle.guide - 1]}, analog ${DREAMSPELL_SEALS[ds.oracle.analog - 1]}, antipode ${DREAMSPELL_SEALS[ds.oracle.antipode - 1]}, occult ${DREAMSPELL_SEALS[ds.oracle.occult - 1]}`,
  ];
}
