// Chinese year (生肖 shēngxiào + wǔxíng element) — the fifth current.
//
// The zodiac year does NOT start on January 1: it turns at Chinese New Year,
// the day (China time) of the second new moon after the December solstice.
// Someone born 1994-01-20 is a Water Rooster (1993), not a Wood Dog (1994).
// We compute that boundary ASTRONOMICALLY with the same validated Meeus
// Sun/Moon ephemeris the whole app runs on — no lookup tables, in-house,
// exact for 1900–2100. (The one historical exception to the second-new-moon
// rule in that range — the 2033 leap month 11 — is handled explicitly.)
//
// Meanings follow the classical tradition: the twelve earthly branches, the
// five elements from the heavenly stems (two years each), yin/yang polarity,
// the compatibility trines, the six clashes and the six secret friends.

import { sunLon, moonLon, jdFromUTC } from './ephemeris';

const elong = (jd: number) => (((moonLon(jd) - sunLon(jd)) % 360) + 360) % 360;

/** First new moon (Sun–Moon conjunction) strictly after `jd`. */
export function nextNewMoonJD(jd: number): number {
  // Elongation grows ~12.2°/day and wraps 360→0 at the new moon. March in
  // half-day steps until the wrap, then bisect the crossing.
  let a = jd, ea = elong(a);
  let b = a + 0.5, eb = elong(b);
  while (eb >= ea) { a = b; ea = eb; b += 0.5; eb = elong(b); }
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2;
    const g = ((elong(m) + 180) % 360) - 180; // <0 before conjunction, >0 after
    if (g < 0) a = m; else b = m;
  }
  return (a + b) / 2;
}

/** December solstice (Sun at 270°) of `year`, as JD. */
function decSolsticeJD(year: number): number {
  let a = jdFromUTC(new Date(Date.UTC(year, 11, 17)));
  let b = jdFromUTC(new Date(Date.UTC(year, 11, 26)));
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2;
    const g = ((sunLon(m) - 270 + 180) % 360 + 360) % 360 - 180;
    if (g < 0) a = m; else b = m;
  }
  return (a + b) / 2;
}

/** JD (UTC) when the Chinese year labeled `year` begins — midnight, China time, of New Year's day. */
export function chineseNewYearJD(year: number): number {
  const sol = decSolsticeJD(year - 1);
  let nm = nextNewMoonJD(sol);
  nm = nextNewMoonJD(nm + 1);
  if (year === 2034) nm = nextNewMoonJD(nm + 1); // leap month 11 in 2033
  // The year turns at 00:00 China Standard Time (UTC+8) of the new-moon day.
  const local = nm + 8 / 24;
  return Math.floor(local + 0.5) - 0.5 - 8 / 24;
}

/** Gregorian label of the Chinese year a moment belongs to (e.g. 1994 = Wood Dog). */
export function chineseYearOf(jd: number): number {
  const y = new Date((jd - 2440587.5) * 86400000).getUTCFullYear();
  return jd >= chineseNewYearJD(y) ? y : y - 1;
}

export interface CnEntry { glyph: string; name: string; key: string; body: string }

export const CN_ANIMALS: CnEntry[] = [
  { glyph: '🐀', name: 'Rat', key: 'wit · resourcefulness · beginnings', body: 'First to arrive: quick-minded, adaptable, charming. Rats find the opening others miss; their lesson is trusting people as much as they trust their own cleverness.' },
  { glyph: '🐂', name: 'Ox', key: 'endurance · honesty · harvest', body: 'The steady builder. Oxen carry what others drop and finish what others abandon; their lesson is asking for help before the load becomes the identity.' },
  { glyph: '🐅', name: 'Tiger', key: 'courage · passion · command', body: 'Born to leap. Tigers act while others deliberate — magnetic, brave, protective; their lesson is patience, so the leap lands where the heart intended.' },
  { glyph: '🐇', name: 'Rabbit', key: 'grace · diplomacy · refuge', body: 'The gentle strategist. Rabbits read a room instantly and keep the peace beautifully; their lesson is saying the hard thing even when harmony would be easier.' },
  { glyph: '🐉', name: 'Dragon', key: 'vision · fortune · fire from heaven', body: 'The only mythical animal: charisma and luck at scale. Dragons dream in public and pull others upward; their lesson is listening on the way up.' },
  { glyph: '🐍', name: 'Snake', key: 'wisdom · intuition · transformation', body: 'The quiet knower. Snakes sense what is really happening beneath the words and shed old skins without announcement; their lesson is letting themselves be truly seen.' },
  { glyph: '🐎', name: 'Horse', key: 'freedom · momentum · open sky', body: 'Movement itself. Horses bring energy, independence and honest speed; their lesson is that some treasures only appear when you stay.' },
  { glyph: '🐐', name: 'Goat', key: 'art · kindness · shelter', body: 'The soft-hearted creator. Goats make beauty and community wherever they graze; their lesson is backing their own gift as fiercely as they back everyone else’s.' },
  { glyph: '🐒', name: 'Monkey', key: 'genius · play · a thousand tricks', body: 'The problem-solver. Monkeys turn obstacles into games and games into inventions; their lesson is finishing the game before starting three more.' },
  { glyph: '🐓', name: 'Rooster', key: 'precision · pride · the dawn call', body: 'The perfectionist herald. Roosters see every detail and say what they see; their lesson is that not every truth needs to crow at dawn.' },
  { glyph: '🐕', name: 'Dog', key: 'loyalty · justice · the faithful watch', body: 'The guardian. Dogs are honest, protective and constitutionally unable to abandon their people; their lesson is resting the watch — not every night holds a wolf.' },
  { glyph: '🐖', name: 'Pig', key: 'generosity · pleasure · good fortune shared', body: 'The open hand. Pigs enjoy life sincerely and share it without keeping score; their lesson is boundaries, so generosity never becomes an open door for takers.' },
];

export const CN_ELEMENTS: CnEntry[] = [
  { glyph: '木', name: 'Wood', key: 'growth · spring', body: 'The element of expansion: planning, idealism, new shoots. Wood years grow things.' },
  { glyph: '火', name: 'Fire', key: 'radiance · summer', body: 'The element of expression: passion, visibility, warmth. Fire years light things up.' },
  { glyph: '土', name: 'Earth', key: 'stability · the turning point', body: 'The element of grounding: patience, nourishment, trust. Earth years consolidate.' },
  { glyph: '金', name: 'Metal', key: 'clarity · autumn', body: 'The element of refinement: structure, resolve, harvest of what matters. Metal years cut clean.' },
  { glyph: '水', name: 'Water', key: 'depth · winter', body: 'The element of flow: intuition, memory, quiet power. Water years run deep.' },
];

// Compatibility geometry of the twelve branches.
const TRINES = [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]]; // allies
const SECRET: Record<number, number> = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };

export interface ChineseSummary {
  year: number;          // Chinese year label (turns at CNY, not Jan 1)
  animal: CnEntry;
  element: CnEntry;
  yang: boolean;         // yang (even stems) or yin (odd)
  allies: CnEntry[];     // same trine — natural teammates
  clash: CnEntry;        // opposite branch — the growth mirror
  secretFriend: CnEntry; // the quiet unconditional ally
  line: string;          // compact fact line for readings
}

export function chineseSummary(jd: number): ChineseSummary {
  const year = chineseYearOf(jd);
  const branch = (((year - 4) % 12) + 12) % 12;
  const stem = (((year - 4) % 10) + 10) % 10;
  const animal = CN_ANIMALS[branch];
  const element = CN_ELEMENTS[Math.floor(stem / 2)];
  const yang = stem % 2 === 0;
  const allies = TRINES.find((tr) => tr.includes(branch))!.filter((i) => i !== branch).map((i) => CN_ANIMALS[i]);
  const clash = CN_ANIMALS[(branch + 6) % 12];
  const secretFriend = CN_ANIMALS[SECRET[branch]];
  return {
    year, animal, element, yang, allies, clash, secretFriend,
    line: `${element.name} ${animal.name} (${year}, ${yang ? 'yang' : 'yin'}); allies ${allies.map((a) => a.name).join(' & ')}, clash ${clash.name}, secret friend ${secretFriend.name}`,
  };
}
