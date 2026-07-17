// Deep nakshatra reference — the meaning layer for the Vedic current.
//
// The engine in vedic.ts computes WHICH nakshatra/pada/lord a body falls in
// (validated math). This file carries WHAT each of the 27 lunar mansions
// *means* in the classical tradition, so readings and /systems/vedic can speak
// with real depth instead of bare Sanskrit names.
//
// Sources: the shakti (power) of each nakshatra and its two "bases" come from
// the Taittiriya Brahmana I.5.1 with Bhattabhaskara Mishra's commentary, as
// rendered by David Frawley (American Institute of Vedic Studies) and Dennis
// Harness. Deity, symbol, gana (temperament), and purushartha (life aim) follow
// the standard Jyotish attributions. Framing throughout is pattern/tendency,
// never fixed fate — matching AstralFlow's voice.
//
// Index-aligned with NAKSHATRAS in vedic.ts (Ashwini … Revati, 0–26).

export type Gana = 'Deva' | 'Manushya' | 'Rakshasa';
export type Purushartha = 'Dharma' | 'Artha' | 'Kama' | 'Moksha';

export interface NakshatraLore {
  name: string;
  deity: string;        // presiding devata + gloss
  shakti: string;       // the Sanskrit power-name + its plain meaning
  basisAbove: string;   // what the shakti draws from
  basisBelow: string;   // what the shakti produces / rests on
  symbol: string;
  gana: Gana;           // temperament: Deva (divine), Manushya (human), Rakshasa (intense)
  purushartha: Purushartha; // the life-aim this mansion serves
  essence: string;      // one-line felt sense for the UI
}

// Plain-language temperament for the gana, for readings.
export const GANA_MEANING: Record<Gana, string> = {
  Deva: 'Deva — light, refined, generous; moves by grace',
  Manushya: 'Manushya — human, striving, balanced between spirit and matter',
  Rakshasa: 'Rakshasa — intense, protective, unafraid of the depths',
};

// The four aims of life (purushartha) each mansion leans toward.
export const PURUSHARTHA_MEANING: Record<Purushartha, string> = {
  Dharma: 'Dharma — purpose, right action, the path you are here to walk',
  Artha: 'Artha — resources, means, building a life that holds',
  Kama: 'Kama — desire, delight, connection and the pleasures of being here',
  Moksha: 'Moksha — release, spirit, the pull back toward the source',
};

// 27 mansions, in order. Shakti lines are the classical "power / from … / toward …".
export const NAKSHATRA_LORE: NakshatraLore[] = [
  {
    name: 'Ashwini', deity: 'Ashwins — the twin celestial healers, physicians of the gods',
    shakti: 'shidhra vyapani — the power to reach things quickly and heal',
    basisAbove: 'the things to be attained', basisBelow: 'the vitality that attains them',
    symbol: "a horse's head", gana: 'Deva', purushartha: 'Dharma',
    essence: 'a fast, fresh start — the healer who arrives at speed',
  },
  {
    name: 'Bharani', deity: 'Yama — lord of death, dharma and the boundary of things',
    shakti: 'apabharani — the power to take things away, to cleanse and carry off',
    basisAbove: 'the removal of life from the body', basisBelow: 'the carrying of the soul onward',
    symbol: 'the yoni — the vessel of birth and death', gana: 'Manushya', purushartha: 'Artha',
    essence: 'holding the extremes of creation — bearing, restraint, transformation',
  },
  {
    name: 'Krittika', deity: 'Agni — the sacred fire that carries offerings to the gods',
    shakti: 'dahana — the power to burn, purify and cut away the false',
    basisAbove: 'heat', basisBelow: 'light',
    symbol: 'a blade / a flame', gana: 'Rakshasa', purushartha: 'Kama',
    essence: 'sharp, refining fire — cuts through to what is real',
  },
  {
    name: 'Rohini', deity: 'Prajapati / Brahma — the creator, lord of growth',
    shakti: 'rohana — the power of growth, to make things rise and flourish',
    basisAbove: 'the plants', basisBelow: 'the waters that grow them',
    symbol: 'an ox-cart / a chariot', gana: 'Manushya', purushartha: 'Moksha',
    essence: 'fertile, magnetic growth — beauty that draws life toward it',
  },
  {
    name: 'Mrigashira', deity: 'Soma — the moon-nectar, the god of the sacred draught',
    shakti: 'prinana — the power to give fulfillment, to seek and soothe',
    basisAbove: 'extension', basisBelow: 'weaving',
    symbol: "a deer's head", gana: 'Deva', purushartha: 'Moksha',
    essence: 'the gentle seeker — searching, curious, never quite still',
  },
  {
    name: 'Ardra', deity: 'Rudra — the storm-god, the fierce form of Shiva',
    shakti: 'yatna — the power of effort, the storm that clears and renews',
    basisAbove: 'hunting / reaching out', basisBelow: 'reaching the goal',
    symbol: 'a teardrop / a human head', gana: 'Manushya', purushartha: 'Kama',
    essence: 'the cleansing storm — destruction that makes room for the new',
  },
  {
    name: 'Punarvasu', deity: 'Aditi — the boundless mother, source of the gods',
    shakti: 'vasutva prapana — the power to gain wealth and substance, to return anew',
    basisAbove: 'the wind / the air', basisBelow: 'the wetness / the rain',
    symbol: 'a quiver of arrows', gana: 'Deva', purushartha: 'Artha',
    essence: 'the return of the light — renewal, safe harbor, second chances',
  },
  {
    name: 'Pushya', deity: 'Brihaspati — guru of the gods, lord of sacred speech',
    shakti: 'brahmavarchasa — the power to create spiritual energy and nourishment',
    basisAbove: 'sacrificial worship', basisBelow: 'the honoring of the sacred',
    symbol: "a cow's udder / a lotus / an arrow", gana: 'Deva', purushartha: 'Dharma',
    essence: 'the most nourishing star — protection, care, spiritual increase',
  },
  {
    name: 'Ashlesha', deity: 'the Nagas — the serpent kings, keepers of hidden wisdom',
    shakti: 'visasleshana — the power to inflict with poison, and to withdraw it',
    basisAbove: 'the approach of the serpent', basisBelow: 'trembling and agitation',
    symbol: 'a coiled serpent', gana: 'Rakshasa', purushartha: 'Dharma',
    essence: 'the coiled kundalini — penetrating insight, hypnotic depth',
  },
  {
    name: 'Magha', deity: 'the Pitris — the ancestral fathers, the honored dead',
    shakti: 'tyage kshepani — the power to leave the body, to honor the lineage',
    basisAbove: 'mourning', basisBelow: 'leaving the body',
    symbol: 'a royal throne', gana: 'Rakshasa', purushartha: 'Artha',
    essence: 'the ancestral throne — dignity, legacy, standing on those before you',
  },
  {
    name: 'Purva Phalguni', deity: 'Bhaga — god of delight, fortune and the marriage bed',
    shakti: 'prajanana — the power of procreation, union and creative pleasure',
    basisAbove: 'the wife / the beloved', basisBelow: 'the husband / the lover',
    symbol: 'the front legs of a bed / a hammock', gana: 'Manushya', purushartha: 'Kama',
    essence: 'rest, romance and creative play — the art of enjoying the fruit',
  },
  {
    name: 'Uttara Phalguni', deity: 'Aryaman — god of patronage, contracts and friendship',
    shakti: 'chayani — the power of accumulation through union and generosity',
    basisAbove: 'wealth gained through one’s own nature', basisBelow: 'wealth gained through others',
    symbol: 'the back legs of a bed', gana: 'Manushya', purushartha: 'Moksha',
    essence: 'generous patronage — steady giving, kindness that builds bonds',
  },
  {
    name: 'Hasta', deity: 'Savitar — the inspiring form of the Sun, giver of skill',
    shakti: 'hasta sthapaniya agama — the power to gain what we seek and place it in hand',
    basisAbove: 'the seeking of gain', basisBelow: 'the placing of it in the hand',
    symbol: 'a hand / an open palm', gana: 'Deva', purushartha: 'Moksha',
    essence: 'skilled hands — craft, cleverness, making the wish material',
  },
  {
    name: 'Chitra', deity: 'Tvashtar / Vishvakarma — the divine architect and craftsman',
    shakti: 'punya cayani — the power to accumulate merit and to fashion beauty',
    basisAbove: 'law / dharma', basisBelow: 'truth',
    symbol: 'a bright jewel / a pearl', gana: 'Rakshasa', purushartha: 'Kama',
    essence: 'the brilliant maker — design, dazzle, the well-wrought form',
  },
  {
    name: 'Swati', deity: 'Vayu — the wind, the breath that moves through all things',
    shakti: 'pradhvamsa — the power to scatter like the wind, to move freely',
    basisAbove: 'moving in various directions', basisBelow: 'change of form',
    symbol: 'a young shoot swaying in the wind / coral', gana: 'Deva', purushartha: 'Artha',
    essence: 'independent as the wind — flexible, self-going, hard to pin down',
  },
  {
    name: 'Vishakha', deity: 'Indragni — Indra and Agni together, power and fire',
    shakti: 'vyapana — the power to achieve many and various fruits',
    basisAbove: 'plowing / cultivation', basisBelow: 'the harvest of grain',
    symbol: 'a triumphal archway / a potter’s wheel', gana: 'Rakshasa', purushartha: 'Dharma',
    essence: 'goal-focused fire — patient effort that arrives at the prize',
  },
  {
    name: 'Anuradha', deity: 'Mitra — god of friendship, devotion and sacred contracts',
    shakti: 'radhana — the power of worship, of honoring what one loves',
    basisAbove: 'ascension / honor', basisBelow: 'descent / following',
    symbol: 'a lotus / a triumphal archway', gana: 'Deva', purushartha: 'Dharma',
    essence: 'devoted friendship — the star that thrives among others',
  },
  {
    name: 'Jyeshtha', deity: 'Indra — king of the gods, the hero who leads',
    shakti: 'arohana — the power to rise and conquer, courage in the field',
    basisAbove: 'attack / the assault', basisBelow: 'defense / the shield',
    symbol: 'a circular amulet / an earring', gana: 'Rakshasa', purushartha: 'Artha',
    essence: 'the elder / the chief — seniority, protectiveness, hard-won authority',
  },
  {
    name: 'Mula', deity: 'Nirriti — goddess of dissolution, the ground beneath all',
    shakti: 'barhana — the power to ruin, to break apart and reach the root',
    basisAbove: 'breaking things apart', basisBelow: 'making things worse before renewal',
    symbol: 'a bunch of roots bound together', gana: 'Rakshasa', purushartha: 'Kama',
    essence: 'down to the root — radical inquiry, tearing away to the core truth',
  },
  {
    name: 'Purva Ashadha', deity: 'Apas — the cosmic waters, the goddesses of the flood',
    shakti: 'varchograhana — the power of invigoration, to energize and uplift',
    basisAbove: 'strength / vigor', basisBelow: 'connection / the bond',
    symbol: 'an elephant tusk / a winnowing fan', gana: 'Manushya', purushartha: 'Moksha',
    essence: 'unconquered water — early victory, buoyant conviction, persuasion',
  },
  {
    name: 'Uttara Ashadha', deity: 'the Vishvadevas — the ten universal gods',
    shakti: 'apradhrisya — the power to grant a victory that cannot be taken away',
    basisAbove: 'the strength to win', basisBelow: 'the goal that is won',
    symbol: 'an elephant tusk / the planks of a bed', gana: 'Manushya', purushartha: 'Moksha',
    essence: 'the later, lasting victory — integrity that wins for good',
  },
  {
    name: 'Shravana', deity: 'Vishnu — the preserver, who spans the worlds in three steps',
    shakti: 'samhanana — the power of connection, to link and to hear',
    basisAbove: 'the seeking of the path', basisBelow: 'the paths that are connected',
    symbol: 'an ear / three footprints', gana: 'Deva', purushartha: 'Artha',
    essence: 'deep listening — learning by hearing, weaving people together',
  },
  {
    name: 'Dhanishta', deity: 'the Vasus — the eight gods of light and abundance',
    shakti: 'khyapayitri — the power to give abundance and fame',
    basisAbove: 'birth / origin', basisBelow: 'prosperity / plenty',
    symbol: 'a drum / a flute', gana: 'Rakshasa', purushartha: 'Dharma',
    essence: 'rhythm and wealth — music, timing, the beat that gathers riches',
  },
  {
    name: 'Shatabhisha', deity: 'Varuna — lord of cosmic waters, oaths and the hidden order',
    shakti: 'bheshaja — the power of healing, to make firm and whole',
    basisAbove: 'pervasion over all', basisBelow: 'the support of the world',
    symbol: 'an empty circle / a hundred stars', gana: 'Rakshasa', purushartha: 'Dharma',
    essence: 'the hundred healers — mystic, private, mender of hidden things',
  },
  {
    name: 'Purva Bhadrapada', deity: 'Aja Ekapada — the one-footed goat, the fire of the deep',
    shakti: 'yajamana udyamana — the power to raise a person spiritually, the fire that lifts',
    basisAbove: 'what is good for people', basisBelow: 'what is good for the gods',
    symbol: 'the front legs of a funeral cot / a two-faced figure', gana: 'Manushya', purushartha: 'Artha',
    essence: 'the visionary fire — intensity, idealism, the flame of transformation',
  },
  {
    name: 'Uttara Bhadrapada', deity: 'Ahir Budhnya — the serpent of the deep, the ocean floor',
    shakti: 'varshodyamana — the power to bring the rain, cosmic depth and stability',
    basisAbove: 'the rain-bearing clouds', basisBelow: 'the growth of plants',
    symbol: 'the back legs of a funeral cot / twins', gana: 'Manushya', purushartha: 'Kama',
    essence: 'still, deep waters — wisdom, patience, the calm that holds the depths',
  },
  {
    name: 'Revati', deity: 'Pushan — the nourisher, shepherd and protector of travelers',
    shakti: 'kshiradyapani — the power of nourishment, to feed and see safely home',
    basisAbove: 'the cattle / what is nourished', basisBelow: 'the milk / the nourishment given',
    symbol: 'a fish / a drum', gana: 'Deva', purushartha: 'Moksha',
    essence: 'the safe passage — kindness, completion, guiding others gently home',
  },
];

export const loreByName = (name: string): NakshatraLore | undefined =>
  NAKSHATRA_LORE.find((n) => n.name === name);

export const loreByIndex = (i: number): NakshatraLore | undefined =>
  NAKSHATRA_LORE[((i % 27) + 27) % 27];

// ── Vimshottari dasha lords: the chapter of life each planet names ───────────
// The maha-dasha you are living colors years at a time. Pattern, not fate.
export const DASHA_LORD_THEME: Record<string, string> = {
  Ketu: 'Ketu — a chapter of letting go, spiritual turns and loose ends resolving (7 yrs)',
  Venus: 'Venus — a chapter of love, art, beauty, comfort and relationship (20 yrs)',
  Sun: 'Sun — a chapter of self, authority, visibility and coming into your own (6 yrs)',
  Moon: 'Moon — a chapter of feeling, home, nurture and inner life (10 yrs)',
  Mars: 'Mars — a chapter of drive, courage, work and hard-won ground (7 yrs)',
  Rahu: 'Rahu — a chapter of hunger and ambition, worldly rise and unfamiliar terrain (18 yrs)',
  Jupiter: 'Jupiter — a chapter of growth, wisdom, teachers, faith and expansion (16 yrs)',
  Saturn: 'Saturn — a chapter of discipline, maturity, structure and long patience (19 yrs)',
  Mercury: 'Mercury — a chapter of learning, communication, trade and the agile mind (17 yrs)',
};
