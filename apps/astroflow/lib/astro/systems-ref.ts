/**
 * Reference content for the personalized "currents" pages (/systems). The
 * generic library lives in university.ts (/cosmos); this adds the symbol sets
 * the deeper pages need (Mayan seals/tones, color families) plus per-system
 * metadata so each page reads like the canonical site for that current.
 */

export interface SystemMeta {
  key: 'western' | 'mayan' | 'vedic' | 'genekeys' | 'chinese';
  title: string;
  glyph: string;
  color: string;
  tagline: string;
  about: string;
}

export const SYSTEMS: SystemMeta[] = [
  {
    key: 'western', title: 'Western Chart', glyph: '☉', color: '#e3c07a',
    tagline: 'your birth sky — tropical',
    about: 'The map of where every planet stood the moment you were born: your big three, your placements, and the aspects that wire them together.',
  },
  {
    key: 'mayan', title: 'Mayan · Cholq’ij', glyph: '🌞', color: '#e8956a',
    tagline: 'your nawal — the living Maya count of Guatemala',
    about: 'The sacred count of days as the K’iche’ daykeepers still keep it: your nawal (your face and guide) woven with its number, plus the archaeological Tzolk’in and the modern Dreamspell overlay.',
  },
  {
    key: 'vedic', title: 'Vedic · Jyotish', glyph: '🪔', color: '#caa6f0',
    tagline: 'your karmic ground — sidereal',
    about: 'The sidereal lens: your Lagna, the Moon’s nakshatra and its lord, and the Vimshottari dasha that names the chapter of life you are living now.',
  },
  {
    key: 'genekeys', title: 'Gene Keys · Human Design', glyph: '🧬', color: '#7bd0c6',
    tagline: 'your evolutionary code — 64 keys',
    about: 'Four prime gifts drawn from your conscious and unconscious sky, each an arc from shadow through gift to siddhi — the contemplative path of your becoming.',
  },
  {
    key: 'chinese', title: 'Chinese · Year Animal', glyph: '🐉', color: '#e05e6a',
    tagline: 'your shēngxiào — animal, element, polarity',
    about: 'The twelve-animal cycle with its five elements, computed from the REAL Chinese New Year (the second new moon after the winter solstice) — so January births get their true animal. Allies, clash and secret friend included.',
  },
];

export const systemByKey = (k: string) => SYSTEMS.find((s) => s.key === k);

// ── Mayan Dreamspell reference ──────────────────────────────────────────────
export const COLOR_FAMILY: Record<string, { role: string; hex: string }> = {
  Red: { role: 'Initiates — the spark that begins', hex: '#e8736a' },
  White: { role: 'Refines — purifies and clears', hex: '#d8d8e8' },
  Blue: { role: 'Transforms — catalyses change', hex: '#7aa8e8' },
  Yellow: { role: 'Ripens — matures and harvests', hex: '#e3c07a' },
};

// 20 solar seals — your "face": keyword power for each (index = seal# - 1).
export const SEAL_KEY: string[] = [
  'Birth · nurturance · being',
  'Spirit · breath · communication',
  'Dreams · abundance · intuition',
  'Awareness · flowering · targeting',
  'Life force · instinct · survival',
  'Death · equality · surrender',
  'Knowing · healing · accomplishment',
  'Beauty · art · elegance',
  'Flow · universal water · purification',
  'Heart · loyalty · love',
  'Magic · play · illusion',
  'Free will · wisdom · influence',
  'Space · wakefulness · exploration',
  'Timelessness · receptivity · enchantment',
  'Vision · mind · creativity',
  'Intelligence · fearlessness · questioning',
  'Navigation · synchronicity · evolution',
  'Reflection · order · truth',
  'Self-generation · energy · catalysis',
  'Universal fire · life · enlightenment',
];

// 13 galactic tones — your "power": the creative pulse (index = tone# - 1).
export const TONE_KEY: string[] = [
  'Purpose · unify · attract',
  'Challenge · polarize · stabilize',
  'Service · activate · bond',
  'Form · define · measure',
  'Radiance · empower · command',
  'Equality · organize · balance',
  'Attunement · channel · inspire',
  'Integrity · harmonize · model',
  'Intention · pulse · realize',
  'Manifestation · perfect · produce',
  'Liberation · dissolve · release',
  'Cooperation · universalize · dedicate',
  'Presence · endure · transcend',
];

// Oracle roles — the four supporting energies around your kin.
export const ORACLE_ROLE: Record<string, string> = {
  guide: 'Guide — what leads you',
  analog: 'Analog — your ally & support',
  antipode: 'Antipode — your challenge & teacher',
  occult: 'Occult — your hidden power',
};
