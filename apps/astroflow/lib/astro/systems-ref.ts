/**
 * Reference content for the personalized "currents" pages (/systems). The
 * generic library lives in university.ts (/cosmos); this adds the symbol sets
 * the deeper pages need (Mayan seals/tones, color families) plus per-system
 * metadata so each page reads like the canonical site for that current.
 */

export interface SystemMeta {
  key: 'western' | 'mayan' | 'vedic' | 'genekeys';
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
    key: 'mayan', title: 'Mayan · 13 Moons', glyph: '🌞', color: '#e8956a',
    tagline: 'your galactic signature — Tzolkin & Dreamspell',
    about: 'The sacred count of days. Your kin carries a seal (your face), a tone (your power), a color family, and an oracle of supporting energies.',
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
