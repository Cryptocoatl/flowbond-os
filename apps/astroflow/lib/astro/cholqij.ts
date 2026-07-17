// Cholq'ij — the living Maya count of the Guatemalan highlands.
//
// This is the SAME continuous 260-day count the archaeological Tzolk'in uses
// (GMT correlation, never broken by the K'iche'/Kaqchikel daykeepers), but named
// and read as the ajq'ijab' — the "counters of the days" — keep it in Guatemala
// today: 20 nawales (day-energies, in the K'iche' language) woven with 13 numbers
// (each a level of intensity). Your birth nawal is your face and your guide.
//
// The 20 nawales are index-aligned with TZOLKIN_NAMES in mayan.ts (the K'iche'
// name is the same day-sign as the Yucatec one at the same position), so the
// engine math is reused untouched — this file only adds the names + the meaning
// the abuelos teach.
//
// Sources: contemporary Guatemalan daykeeper teaching (guiaespiritualmaya.com,
// guatemala.com "significado de los nahuales mayas", Cholq'ij scholarship). The
// framing is energy/tendency, as an ajq'ij speaks it — never fixed fate.

export interface Nawal {
  kiche: string;        // K'iche' name of the day-energy
  yucatec: string;      // its archaeological (Tzolk'in) counterpart, for cross-reference
  symbol: string;       // the image the nawal carries
  meaning: string;      // how the daykeepers read it
  domain: string;       // the life-sphere it governs
}

// Index 0..19, aligned to TZOLKIN_NAMES (Imix..Ahau) in mayan.ts.
export const NAWALES: Nawal[] = [
  { kiche: 'Imox', yucatec: 'Imix', symbol: 'the primal water, the fish, the crocodile',
    meaning: 'The left hand of the cosmos — deep sensitivity, dreams and the waters of the unconscious. Great receptivity and healing gifts, with a call to keep the mind steady.',
    domain: 'sensitivity, dreams, healing, the hidden' },
  { kiche: 'Iq’', yucatec: 'Ik', symbol: 'the wind, the breath, the air',
    meaning: 'The spirit that moves through everything — breath, life, and the force that renews. Communication and vitality; the wind that clears and carries the word.',
    domain: 'breath, spirit, communication, renewal' },
  { kiche: 'Aq’ab’al', yucatec: 'Akbal', symbol: 'the dawn, the meeting of night and day',
    meaning: 'The first light that dispels darkness — the turning of a cycle, new clarity, the recovery of what was lost. Brings hidden things into the light.',
    domain: 'dawn, renewal, clarity, new cycles' },
  { kiche: 'K’at', yucatec: 'Kan', symbol: 'the net, the fire, the woven basket',
    meaning: 'The net that gathers abundance and the net that entangles — a day to unbind what traps us and to hold what nourishes. Weaving and liberation.',
    domain: 'abundance, entanglement, harvest, liberation' },
  { kiche: 'Kan', yucatec: 'Chicchan', symbol: 'the feathered serpent, the coiled energy',
    meaning: 'The creative force of the universe rising through the spine — awakening, justice, and the movement of life itself. Deep vital and spiritual power.',
    domain: 'life force, awakening, justice, evolution' },
  { kiche: 'Kame', yucatec: 'Cimi', symbol: 'the owl, the threshold of death and rebirth',
    meaning: 'The dissolver that ends and begins again — surrender, transformation, and connection with the ancestors. Neither feared nor final; the door that turns.',
    domain: 'transformation, ancestors, endings, rebirth' },
  { kiche: 'Kej', yucatec: 'Manik', symbol: 'the deer, the four pillars of the world',
    meaning: 'Strength held in balance — the deer that carries the four directions. Steadiness, leadership, and harmony with the natural world.',
    domain: 'balance, strength, nature, the four directions' },
  { kiche: 'Q’anil', yucatec: 'Lamat', symbol: 'the seed, the four colors of maize, the rabbit-star',
    meaning: 'The seed that ripens — fertility, creation, and the abundance of the earth. What is planted with care comes to fruit; a day of germination and life.',
    domain: 'fertility, seeds, creation, abundance' },
  { kiche: 'Toj', yucatec: 'Muluc', symbol: 'the offering, the fire, payment to the earth',
    meaning: 'Gratitude and reciprocity — the day of offering, of settling accounts with the Heart of Sky and Earth. Every gift asks a giving back; balance restored through thanks.',
    domain: 'offering, gratitude, reciprocity, balance' },
  { kiche: 'Tz’i’', yucatec: 'Oc', symbol: 'the dog, the guardian of law and justice',
    meaning: 'The faithful guardian — law, order, and the loyalty that guides. Watches over what is right; a spiritual and protective energy, guide between worlds.',
    domain: 'law, loyalty, justice, guardianship' },
  { kiche: 'B’atz’', yucatec: 'Chuen', symbol: 'the monkey, the thread of time, the weaver',
    meaning: 'The thread that ties past to present — the artist, the weaver of life. Wajxaqib’ B’atz’ (8 B’atz’) opens the daykeeper’s new year; the day of time itself unspooling into craft and continuity.',
    domain: 'time, weaving, art, continuity' },
  { kiche: 'E', yucatec: 'Eb', symbol: 'the sacred road, the path, the tooth',
    meaning: 'The road walked well — destiny, guidance, and safe passage. The traveler and the way opening ahead; protection on every journey, inner and outer.',
    domain: 'the path, destiny, journeys, guidance' },
  { kiche: 'Aj', yucatec: 'Ben', symbol: 'the reed, the home, the growing cane of maize',
    meaning: 'The living home and the strong reed — family, hearth, and the flourishing of what is cultivated. Uprightness and the abundance of a well-kept house.',
    domain: 'home, family, growth, uprightness' },
  { kiche: 'I’x', yucatec: 'Ix', symbol: 'the jaguar, the sacred altar, the feminine earth',
    meaning: 'The jaguar of the sacred mountain — the ceremonial center, the altar, the power of the earth and the feminine. Magic, strength, and deep connection to place.',
    domain: 'sacred ground, magic, the feminine, earth power' },
  { kiche: 'Tz’ikin', yucatec: 'Men', symbol: 'the bird, the eagle, the messenger between worlds',
    meaning: 'The bird of fortune — vision, freedom, and the messenger between earth and sky. An auspicious sign of abundance, love and good fortune; the intermediary.',
    domain: 'vision, fortune, love, the messenger' },
  { kiche: 'Ajmaq', yucatec: 'Cib', symbol: 'the owl-bee, the ancestors, forgiveness',
    meaning: 'The keeper of forgiveness — the weight of what was done, and the grace of release. Wisdom of the ancestors, accountability, and the pardon that frees.',
    domain: 'forgiveness, ancestors, accountability, wisdom' },
  { kiche: 'No’j', yucatec: 'Caban', symbol: 'the mind, the movement of the earth, knowledge',
    meaning: 'The wisdom that thinks clearly — intelligence, good counsel, and the ideas that move the world. Sharp mind and virtue; the day of understanding.',
    domain: 'wisdom, intellect, ideas, counsel' },
  { kiche: 'Tijax', yucatec: 'Etznab', symbol: 'the obsidian blade, the flint, the lightning',
    meaning: 'The double-edged knife that cuts to heal — discernment, the severing of what harms, the healer’s edge. Lightning and thunder; sharp truth that liberates.',
    domain: 'discernment, healing, cutting through, truth' },
  { kiche: 'Kawoq', yucatec: 'Cauac', symbol: 'the thunder, the storm, the community, the midwife',
    meaning: 'The gathering storm and the gathered people — family, community, fertility and the abundance that comes of union. The rain that feeds the seed; the day of the collective.',
    domain: 'community, fertility, the storm, abundance' },
  { kiche: 'Ajpu', yucatec: 'Ahau', symbol: 'the blowgunner hero, Grandfather Sun, the flower',
    meaning: 'The Hero and Grandfather Sun — mastery, light, and the regenerative force that overcomes. Great leadership and certainty; the day of the sun’s full flowering.',
    domain: 'mastery, light, leadership, regeneration' },
];

export const nawalByKiche = (name: string) => NAWALES.find((n) => n.kiche === name);
export const nawalByIndex = (i: number) => NAWALES[((i % 20) + 20) % 20];

// ── The 13 numbers (K'iche') — each a level of energy on the wave ────────────
// The daykeepers read the number as intensity: low = gentle/seed, the middle a
// pivot, high = culminating/cosmic. 8 (Wajxaqib’) is the ceremonial number of
// the new year; 13 (Oxlajuj) the fullness of the cycle.
export const KICHE_NUMBERS = [
  'Jun', 'Keb’', 'Oxib’', 'Kajib’', 'Job’', 'Waqib’', 'Wuqub’',
  'Wajxaqib’', 'B’elejeb’', 'Lajuj', 'Junlajuj', 'Kab’lajuj', 'Oxlajuj',
] as const;

export const NUMBER_ENERGY: string[] = [
  'unity, the seed, the single beginning',
  'duality, the pair, the polarity that gives balance',
  'movement, rhythm, the spark of action',
  'stability, the four corners, foundation',
  'the center, empowerment, the gathering of force',
  'flow, family, the ripening of the day',
  'the pivot, the delicate heart of the wave, reflection',
  'harmony and ceremony — the sacred number of the new year, justice restored',
  'gestation, patience, the feminine fullness before birth',
  'manifestation, the material world, authority made real',
  'renewal through complexity, purification, the shedding of the old',
  'understanding, the gathering of all threads, community',
  'the totality, transcendence, the cosmic fullness of the count',
];

export interface CholqijInfo {
  number: number;         // 1..13
  numberName: string;     // K'iche' name of the number
  numberEnergy: string;   // what that intensity carries
  nawal: Nawal;           // the day-energy
}

// Build the Cholq'ij reading from the day-sign index + number the engine already
// computes (mayan.ts owns the correlation math; this is pure lookup).
export function cholqijFrom(dayIndex: number, number: number): CholqijInfo {
  const n = ((number - 1) % 13 + 13) % 13;
  return {
    number,
    numberName: KICHE_NUMBERS[n],
    numberEnergy: NUMBER_ENERGY[n],
    nawal: nawalByIndex(dayIndex),
  };
}
