// ── The Astral University ────────────────────────────────────────────────────
// FlowMe's generic knowledge, written down once and served from code — the
// collective growing memory of AstroFlow. Reading these costs ZERO tokens:
// the living reference loads instantly for everyone, and the same framework
// is what FlowMe holds (prompt-cached) when it channels a reading.

export interface Entry {
  glyph: string;
  name: string;
  key: string;     // one-line essence
  body: string;    // the teaching
  color?: string;
}

export const ELEMENT_COLOR: Record<string, string> = {
  Fire: '#e8956a', Earth: '#a8c97f', Air: '#e3c07a', Water: '#7bd0c6',
};

export const PLANETS: Entry[] = [
  { glyph: '☉', name: 'Sun', key: 'identity · vitality · purpose', body: 'The center of the chart and of the self: what you are here to embody, where your life force gathers, the role that makes you feel most alive. A strong Sun current asks to be expressed, not explained.' },
  { glyph: '☽', name: 'Moon', key: 'inner needs · emotional home', body: 'How you feel, what makes you feel safe, and how you self-soothe when the world is loud. The Moon is the private sky behind the public Sun — honor its needs and everything else steadies.' },
  { glyph: '☿', name: 'Mercury', key: 'mind · language · connection', body: 'How you think, learn, speak and listen. Mercury sets the rhythm of your conversations and the shape of your curiosity — it is the messenger between your inner world and everyone else’s.' },
  { glyph: '♀', name: 'Venus', key: 'love · values · magnetism', body: 'What you find beautiful, how you relate and attract, what you genuinely value. Venus shows the texture of your affection and the taste that runs through everything you choose.' },
  { glyph: '♂', name: 'Mars', key: 'drive · desire · courage', body: 'How you act, want, fight and begin. Mars is the engine — its sign shows whether you charge, strategize, simmer or dance your way into motion.' },
  { glyph: '♃', name: 'Jupiter', key: 'growth · faith · expansion', body: 'Where life says yes to you and where you say yes too easily. Jupiter shows your natural luck, your philosophy, and the direction in which you are meant to grow bigger than your story.' },
  { glyph: '♄', name: 'Saturn', key: 'structure · mastery · time', body: 'Where you must build slowly and honestly. Saturn marks the fear that becomes your greatest competence when faced — the mountain in your chart that turns into your authority.' },
  { glyph: '♅', name: 'Uranus', key: 'freedom · awakening · disruption', body: 'Where you cannot and should not be normal. Uranus breaks patterns to free the authentic self — the lightning that reroutes a life in one strike of clarity.' },
  { glyph: '♆', name: 'Neptune', key: 'dream · spirit · dissolution', body: 'Where the boundaries blur: imagination, compassion, music, the mystical — and also illusion and escape. Neptune asks you to dream with your eyes open.' },
  { glyph: '♇', name: 'Pluto', key: 'power · death & rebirth', body: 'The deepest current: what must die for you to regenerate. Pluto marks where you meet power — your own and others’ — and where transformation is not optional.' },
  { glyph: '☊', name: 'North Node', key: 'the growth edge', body: 'Not a planet but a direction: the unfamiliar quality your soul is stretching toward in this life. It rarely feels comfortable — that is how you know it is the way.' },
];

export const SIGNS: Entry[] = [
  { glyph: '♈', name: 'Aries', key: 'Fire · Cardinal — the spark', color: ELEMENT_COLOR.Fire, body: 'Initiates. Direct, brave, impatient, alive at the starting line. Aries energy teaches the courage to begin before you feel ready.' },
  { glyph: '♉', name: 'Taurus', key: 'Earth · Fixed — the garden', color: ELEMENT_COLOR.Earth, body: 'Stabilizes. Sensual, steady, loyal to what is real — touch, food, land, craft. Taurus teaches that slow is a superpower.' },
  { glyph: '♊', name: 'Gemini', key: 'Air · Mutable — the messenger', color: ELEMENT_COLOR.Air, body: 'Connects. Curious, quick, twin-minded; collects ideas and people. Gemini teaches that every conversation is a door.' },
  { glyph: '♋', name: 'Cancer', key: 'Water · Cardinal — the shell', color: ELEMENT_COLOR.Water, body: 'Protects. Feels everything, remembers everything, builds homes wherever it loves. Cancer teaches that care is a form of leadership.' },
  { glyph: '♌', name: 'Leo', key: 'Fire · Fixed — the sun-heart', color: ELEMENT_COLOR.Fire, body: 'Radiates. Creative, warm, born for the stage it eventually builds itself. Leo teaches that shining is generosity, not vanity.' },
  { glyph: '♍', name: 'Virgo', key: 'Earth · Mutable — the craftsman', color: ELEMENT_COLOR.Earth, body: 'Refines. Precise, devoted, healing through usefulness and detail. Virgo teaches that love often looks like fixing the small things.' },
  { glyph: '♎', name: 'Libra', key: 'Air · Cardinal — the balance', color: ELEMENT_COLOR.Air, body: 'Harmonizes. Relational, aesthetic, allergic to injustice and bad design. Libra teaches that peace is something you make, actively.' },
  { glyph: '♏', name: 'Scorpio', key: 'Water · Fixed — the depths', color: ELEMENT_COLOR.Water, body: 'Transforms. Intense, private, loyal to the bone; sees beneath every surface. Scorpio teaches that truth is more intimate than comfort.' },
  { glyph: '♐', name: 'Sagittarius', key: 'Fire · Mutable — the arrow', color: ELEMENT_COLOR.Fire, body: 'Seeks. Free, philosophical, funnier than it lets on; aims at meaning. Sagittarius teaches that the horizon is a direction, not a place.' },
  { glyph: '♑', name: 'Capricorn', key: 'Earth · Cardinal — the summit', color: ELEMENT_COLOR.Earth, body: 'Builds. Ambitious, dry-witted, patient with decades. Capricorn teaches that integrity is doing the work when no one is watching.' },
  { glyph: '♒', name: 'Aquarius', key: 'Air · Fixed — the future', color: ELEMENT_COLOR.Air, body: 'Liberates. Inventive, communal, gloriously strange. Aquarius teaches that belonging to everyone requires belonging to yourself first.' },
  { glyph: '♓', name: 'Pisces', key: 'Water · Mutable — the ocean', color: ELEMENT_COLOR.Water, body: 'Dissolves. Empathic, artistic, porous to every feeling in the room. Pisces teaches that boundaries make compassion sustainable.' },
];

export const HOUSES: Entry[] = [
  { glyph: 'I', name: '1st House', key: 'self · body · arrival', body: 'How you enter a room and a life: your instinctive style, your body, the first impression that precedes every word.' },
  { glyph: 'II', name: '2nd House', key: 'worth · money · resources', body: 'What you have and what you’re worth — to yourself first. Income, talents, and the self-esteem underneath both.' },
  { glyph: 'III', name: '3rd House', key: 'mind · words · neighborhood', body: 'Daily mind: conversations, siblings, short journeys, the way you write and learn. The local network of your life.' },
  { glyph: 'IV', name: '4th House', key: 'home · roots · the deep base', body: 'Family, ancestry, the home you came from and the one you are building. The root system of the whole chart.' },
  { glyph: 'V', name: '5th House', key: 'creation · play · romance', body: 'What you make for joy: art, games, flirtation, children. The courage to be seen enjoying your own life.' },
  { glyph: 'VI', name: '6th House', key: 'work · health · daily craft', body: 'The rituals that hold you together: routines, service, wellbeing, the daily work that quietly becomes a life.' },
  { glyph: 'VII', name: '7th House', key: 'partnership · the mirror', body: 'The other: partners, close allies, open enemies. What you meet in relationship is often what you haven’t met in yourself.' },
  { glyph: 'VIII', name: '8th House', key: 'intimacy · shared power', body: 'Merging: deep trust, shared resources, sexuality, grief, rebirth. Where two lives become one economy of souls.' },
  { glyph: 'IX', name: '9th House', key: 'meaning · travel · belief', body: 'The far horizon: philosophy, foreign places, teachers, faith. Where life becomes a question worth traveling for.' },
  { glyph: 'X', name: '10th House', key: 'vocation · legacy · the peak', body: 'Your public mountain: career, reputation, the contribution with your name on it. What you are building in the eyes of the world.' },
  { glyph: 'XI', name: '11th House', key: 'community · the collective', body: 'Friends, networks, movements, the future you are part of building. Where your gifts join everyone else’s.' },
  { glyph: 'XII', name: '12th House', key: 'the unseen · retreat · release', body: 'The hidden sky: dreams, solitude, endings, the compassion that needs no witness. Where you dissolve to begin again.' },
];

export const ASPECTS: Entry[] = [
  { glyph: '☌', name: 'Conjunction', key: '0° — fusion', body: 'Two currents occupy the same point and amplify each other. Enormous power, little perspective: the energies act as one.' },
  { glyph: '△', name: 'Trine', key: '120° — gift', body: 'Effortless flow between currents of the same element. Talent so natural you may forget it’s rare — the work is to use it on purpose.', color: '#7bd0c6' },
  { glyph: '✶', name: 'Sextile', key: '60° — opportunity', body: 'Friendly energies one nudge apart. The door is unlocked but not open: sextiles reward the person who actually knocks.', color: '#7bd0c6' },
  { glyph: '□', name: 'Square', key: '90° — friction that forges', body: 'Two currents at cross-purposes generating heat. Squares are the gym of the chart — the tension that, worked, becomes strength.', color: '#e8956a' },
  { glyph: '☍', name: 'Opposition', key: '180° — the polarity', body: 'Two currents face each other across the whole sky. What you disown gets projected onto others until you learn to hold both ends.', color: '#e8956a' },
];

export const ELEMENTS: Entry[] = [
  { glyph: '🜂', name: 'Fire', key: 'spirit · action · vision', color: ELEMENT_COLOR.Fire, body: 'The current of initiative and inspiration. Fire people light rooms and start things; their lesson is sustaining what they ignite.' },
  { glyph: '🜃', name: 'Earth', key: 'body · matter · craft', color: ELEMENT_COLOR.Earth, body: 'The current of manifestation. Earth people make things real — gardens, companies, homes; their lesson is staying open to change.' },
  { glyph: '🜁', name: 'Air', key: 'mind · word · relation', color: ELEMENT_COLOR.Air, body: 'The current of connection and ideas. Air people weave people and concepts together; their lesson is landing thought into feeling and form.' },
  { glyph: '🜄', name: 'Water', key: 'feeling · memory · depth', color: ELEMENT_COLOR.Water, body: 'The current of emotion and intuition. Water people sense everything beneath the surface; their lesson is boundaries that let them keep feeling.' },
];

export const TRADITIONS: Entry[] = [
  { glyph: '🕉', name: 'Vedic — the karmic ground', key: 'sidereal zodiac · nakshatras · dasha cycles', body: 'India’s jyotish reads the sky against the actual stars (sidereal). Beneath the western personality layer it describes karmic texture: the Moon’s nakshatra (lunar mansion) names the soul’s flavor, and the Vimshottari dasha clock names the CHAPTER of life you are living right now. Not a contradiction of your western chart — a deeper stratum of the same sky.' },
  { glyph: '☀', name: 'Mayan — the face of your day', key: 'tzolk’in 260 · day signs · tones', body: 'Mesoamerica counts time as living beings: 20 day signs × 13 tones = the 260-day tzolk’in. The Traditional (GMT) count is the ancestral calendar still kept in Guatemala; Dreamspell is its modern galactic overlay. Your day sign is the face you wear in time — and the oracle around it (guide, analog, antipode, occult) is your working team of energies.' },
  { glyph: '⬡', name: 'Gene Keys — the evolutionary arc', key: '64 keys · shadow → gift → siddhi', body: 'A contemplative map crossing the I Ching’s 64 hexagrams with your chart. Each key holds a spectrum: the Shadow (the contracted pattern you’ll recognize), the Gift (the same energy unlocked), and the Siddhi (its far star). The four prime spheres — Life’s Work, Evolution, Radiance, Purpose — form the spine of a lifelong unfolding.' },
];
