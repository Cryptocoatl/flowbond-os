// The Guide — AstralFlow's own answers to "why?", written into the product.
// Zero tokens, instant, same on every device: why the app exists, why bonds,
// what every tradition is actually based on (with sources), and exactly how
// the resonance number is computed. Render-side wraps every string in t()
// so the whole guide speaks Spanish too (lib/i18n/frag/guide.ts).
//
// This is the token-efficiency pattern (see university.ts, nakshatras.ts):
// knowledge lives IN code, FlowMe only ever narrates on top of it.

export interface GuideQA { glyph: string; q: string; a: string }

/** Why AstralFlow / why the bond — the story, in plain words. */
export const WHY: GuideQA[] = [
  {
    glyph: '✦',
    q: 'Why AstralFlow?',
    a: 'Your birth chart is a photograph of the real sky at the moment you were born — where the Sun, Moon and planets actually stood. For thousands of years people have read that photo as a map of temperament and timing. AstralFlow computes it precisely, then helps you read it alone, with your people, and across four traditions — as patterns and tendencies, never fixed destiny.',
  },
  {
    glyph: '☌',
    q: 'Why the bond?',
    a: 'A chart is intimate — it says how you love, fight, rest and grow. So nothing here is public by default. A bond is mutual consent: both people say yes, and only then do your charts open to each other. No bond, no access. You can erase a bond at any time and everything closes again, both ways.',
  },
  {
    glyph: '◍',
    q: 'Is any of this "true"?',
    a: 'The astronomy is exact — planet positions come from the same celestial mechanics observatories use, computed to the degree. The meanings are traditions: symbolic languages refined over centuries for talking about character and timing. Treat every reading as a mirror to think with, not a verdict. You always have the last word on who you are.',
  },
  {
    glyph: '🔒',
    q: 'Where does my data live?',
    a: 'Your birth data stays in your own protected record — guarded at the database level, readable only by you and the people you have bonded with, at the depth you chose. Readings are channeled live and never stored. When FlowMe reads a chart it receives first names and chart symbols only — never emails, birth data or identities.',
  },
];

/** What each tradition is based on — provenance in plain language. */
export interface Basis {
  key: string;
  glyph: string;
  name: string;
  basedOn: string;   // the source, honestly named
  how: string;       // what AstralFlow computes from it
  explore: string;   // where to see it in the app
  color: string;
}

export const BASIS: Basis[] = [
  {
    key: 'western',
    glyph: '☉',
    name: 'Western astrology',
    basedOn: 'The Hellenistic tradition (~2,000 years old): the tropical zodiac anchored to the seasons, twelve signs, whole-sign houses — the oldest house system — and the classical aspects. Planet positions are computed from Jean Meeus’ “Astronomical Algorithms”, the standard reference for celestial mechanics.',
    how: 'Your Sun, Moon, rising sign, all planet placements, houses and the aspect web between them — calculated to the degree from your birth moment and place.',
    explore: 'Your chart page — the circular wheel — and the Cosmos library.',
    color: '#e3c07a',
  },
  {
    key: 'vedic',
    glyph: '🕉',
    name: 'Vedic · Jyotish',
    basedOn: 'India’s astrology, read against the actual stars (sidereal zodiac, Lahiri ayanamsha). The 27 nakshatras — lunar mansions — carry deity, symbol and shakti (power) from the Taittiriya Brahmana, one of the oldest astrological texts on Earth. Life chapters come from the Vimshottari dasha cycle.',
    how: 'Your sidereal chart, your Moon’s nakshatra with its deity and shakti, and the exact life chapter (maha-dasha) running for you right now, with its progress.',
    explore: 'Currents → Vedic.',
    color: '#b6abec',
  },
  {
    key: 'mayan',
    glyph: '☀',
    name: 'Mayan · Cholq’ij',
    basedOn: 'The living 260-day count still kept by K’iche’ and Kaqchikel daykeepers (ajq’ijab’) in Guatemala: 20 nawales × 13 numbers. Dates align through the GMT correlation, the correlation accepted by scholars and the daykeepers themselves. The modern Dreamspell is shown separately, clearly labeled as a 20th-century overlay.',
    how: 'Your nawal — the energy of your birth day — with its K’iche’ name, meaning and domain as the abuelos teach it, plus your Tzolk’in, Haab and Long Count.',
    explore: 'Currents → Mayan.',
    color: '#e8956a',
  },
  {
    key: 'genekeys',
    glyph: '⬡',
    name: 'Gene Keys',
    basedOn: 'Richard Rudd’s contemplative synthesis (2009) mapping the I Ching’s 64 hexagrams onto the Sun’s position in your chart. Each key is a spectrum: Shadow (the contracted pattern), Gift (the same energy unlocked), Siddhi (its highest expression).',
    how: 'Your activation sequence — Life’s Work, Evolution, Radiance, Purpose — each with its shadow → gift → siddhi arc.',
    explore: 'Currents → Gene Keys.',
    color: '#7bd0c6',
  },
];

/** How the resonance number is computed — the honest recipe, step by step. */
export const SCORE_STEPS: { n: string; text: string }[] = [
  { n: '1', text: 'We lay your two charts over each other and measure the angles between every pair of planets — your Sun to their Moon, your Venus to their Mars, all of them.' },
  { n: '2', text: 'Certain angles are classical aspects: 120° (trine) and 60° (sextile) flow easily; 90° (square) and 180° (opposition) create friction; 0° (conjunction) fuses two energies into one. The closer the angle is to exact, the stronger it counts.' },
  { n: '3', text: 'Each aspect is weighted by which planets are involved — Sun, Moon and Venus matter more than Pluto — and by the lens you chose: romance listens hardest to Venus, Mars and Moon; business to Saturn, Mars and Mercury; friendship to Mercury and Jupiter; co-living to Moon and Saturn.' },
  { n: '4', text: 'All the flowing weight and all the frictional weight are summed and balanced into one number from 0 to 100, where 50 means perfectly balanced. It is deterministic — same charts, same lens, same number, every time. No AI decides it.' },
];

export const SCORE_BANDS: { min: number; label: string; meaning: string; color: string }[] = [
  { min: 68, label: 'easy flow', meaning: 'The connection runs mostly on trines and sextiles — things tend to feel natural. The invitation: don’t coast on it.', color: '#7bd0c6' },
  { min: 55, label: 'real chemistry', meaning: 'More flow than friction, with enough spark to stay interesting. A little conscious effort goes far.', color: '#9ecfc7' },
  { min: 45, label: 'ease and friction', meaning: 'A genuine mix — some currents click, others rub. This is the most common and most workable kind of connection.', color: '#cfc8e8' },
  { min: 0, label: 'growth pairing', meaning: 'The heavy aspects outweigh the easy ones. Not a bad match — a demanding one: squares are the gym of a relationship.', color: '#e8956a' },
];

export const SCORE_TRUTH =
  'This number is not a grade and not a verdict. It measures ease vs. friction between two skies — and friction, worked consciously, is where relationships grow strongest. A 40 that talks beats an 80 that coasts.';

export function scoreBand(score: number) {
  return SCORE_BANDS.find((b) => score >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
}

/** Composed one-breath answers for the FlowMe dock — served locally, instantly. */
export const BASIS_SUMMARY =
  'The astronomy is real: planet positions are computed from standard celestial mechanics (Meeus), exact to the degree for your birth moment and place. On top of that sky, AstralFlow reads four traditions — ☉ Western (the ~2,000-year Hellenistic tradition), 🕉 Vedic Jyotish (sidereal zodiac, the 27 nakshatras of the Taittiriya Brahmana), ☀ the Mayan Cholq’ij (the living 260-day count still kept by daykeepers in Guatemala), and ⬡ Gene Keys (the I Ching’s 64 hexagrams mapped to your Sun). Every source is named openly in the Guide.';

export const SCORE_SUMMARY =
  'The resonance number is pure math, computed on your device — no AI decides it. We measure the angles between every planet in your two charts; flowing angles (120°, 60°) add ease, demanding ones (90°, 180°) add friction; each is weighted by planet importance and by the lens you chose (romance weighs Venus & Mars; business weighs Saturn & Mercury…). Everything is balanced into 0–100, where 50 = balanced. It measures ease vs. friction — not whether a relationship is “good”. Tap “Where does this number come from?” under any score to see the exact aspects behind it.';

/** Map of the app — where to explore, what each place means. */
export interface ExploreStop { path: string; icon: string; name: string; what: string }

export const EXPLORE: ExploreStop[] = [
  { path: '/', icon: '✦', name: 'Constellation', what: 'Your sky of bonded people. Tap a star to read someone; switch to Combine and tap two or more to weave them together.' },
  { path: '/chart', icon: '◉', name: 'Your chart', what: 'Your full resume: the circular wheel, placements, aspects, power places and all four traditions. Tap anything on the wheel to learn what it means.' },
  { path: '/today', icon: '☽', name: 'Today', what: 'The sky is still moving. See the transits touching your chart right now — including real life cycles like your Saturn return.' },
  { path: '/systems', icon: '🕉', name: 'Currents', what: 'You, read through each tradition in depth — Western, Vedic, Mayan Cholq’ij and Gene Keys — with the full symbol reference for each.' },
  { path: '/atlas', icon: '🗺', name: 'Atlas', what: 'Your chart projected onto the Earth: the planetary lines that cross the planet for you, and the cities where your sky is strongest.' },
  { path: '/cosmos', icon: '📖', name: 'Cosmos', what: 'The open library — every planet, sign, house, aspect and element with its glyph and teaching. Study the language of the sky.' },
  { path: '/dreams', icon: '💭', name: 'Dreams', what: 'The community roadmap. Post what you wish AstralFlow could do, vote on others’ dreams, and watch them get built.' },
  { path: '/privacy', icon: '🔒', name: 'Data & Sovereignty', what: 'Your privacy hub: who you’re bonded with, who can see you, who has read you — and the power to close any door.' },
];
