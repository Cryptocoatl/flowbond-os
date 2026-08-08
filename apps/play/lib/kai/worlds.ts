// =============================================================================
// Kai World · Los Siete Mundos — content ported from the previous PWA build
// (kai.flowbond.life "Los Siete Mundos") into the new R3F game format.
//
// Seven worlds re-theme the SAME island (terrain recolor + fog/water tint +
// per-world mascot guide + centerpiece). Each world holds a list of missions;
// a mission is a small verb (recoger/tocar/limpiar/llevar/circulo/quiz/
// encontrar/anillos) with a bilingual teaching the guide speaks on completion.
//
// The mission data is transcribed faithfully from the original MUNDOS[] array.
// Missions are stored as terse tuples (identical shape to the old MDEF format)
// and parsed by `mdef()` so the port stays 1:1 and easy to diff.
// =============================================================================

export type Bi = { es: string; en: string };

export type MissionTipo =
  | 'recoger' // walk over N glowing pickups
  | 'tocar' // touch/activate N targets
  | 'limpiar' // clear N blights
  | 'llevar' // carry light to N points (climb towers)
  | 'circulo' // stand in N circles (a beat each)
  | 'quiz' // approach a crystal → question
  | 'encontrar' // find 1 hidden glowing thing
  | 'anillos' // pass through N rings, in order
  | 'construir'; // co-creation: place N of your own creations

export interface Quiz {
  q: Bi;
  /** options[0] is always the correct answer; the UI shuffles them. */
  options: Bi[];
}

export interface WorldMission {
  tipo: MissionTipo;
  n: number;
  emoji: string;
  title: Bi;
  desc: Bi;
  teach: Bi;
  quiz?: Quiz;
  xp: number;
}

export interface WorldTheme {
  fog: string;
  /** low → mid → high terrain colors (vertex recolor). */
  terrain: [string, string, string];
  water: string;
  hemi: string;
  /** gentler gravity / higher jump for underwater/space worlds. */
  grav?: number;
  jump?: number;
  /** buoyant swim movement (hold to rise) — underwater/space worlds. */
  swim?: boolean;
}

export interface KaiWorld {
  id: string;
  emoji: string;
  guideEmoji: string;
  color: string;
  name: Bi;
  guide: Bi;
  intro: Bi;
  fin: Bi;
  theme: WorldTheme;
  voice: { pitch: number; rate: number };
  missions: WorldMission[];
}

// ---- tuple → WorldMission --------------------------------------------------
// [tipo, n, emoji, title_es, desc_es, teach_es, title_en, desc_en, teach_en, quiz?]
// quiz = [q_es, a_es(correct), b_es, c_es, q_en, a_en(correct), b_en, c_en]
type QuizTuple = [string, string, string, string, string, string, string, string];
type Tuple = [
  MissionTipo,
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  QuizTuple?,
];

// XP scales gently with effort; quizzes reward learning a little extra.
const xpFor = (tipo: MissionTipo, n: number) =>
  tipo === 'quiz' ? 300 : 200 + Math.max(0, n - 1) * 15;

function mdef(t: Tuple): WorldMission {
  const [tipo, n, emoji, tEs, dEs, teEs, tEn, dEn, teEn, q] = t;
  const m: WorldMission = {
    tipo,
    n,
    emoji,
    title: { es: tEs, en: tEn },
    desc: { es: dEs, en: dEn },
    teach: { es: teEs, en: teEn },
    xp: xpFor(tipo, n),
  };
  if (q) {
    m.quiz = {
      q: { es: q[0], en: q[4] },
      options: [
        { es: q[1], en: q[5] },
        { es: q[2], en: q[6] },
        { es: q[3], en: q[7] },
      ],
    };
  }
  return m;
}

// ---------------------------------------------------------------------------
// WORLD 0 · TEMPLO DE LA SELVA — home world, restore-focused starter missions.
// (The old build used the jungle systems here; in the new format we author a
// small restore set so the home world has real missions like the others.)
// ---------------------------------------------------------------------------
const SELVA: Tuple[] = [
  ['recoger', 6, '🌰', 'Semillas de la ceiba', 'Junta 6 semillas doradas para el gran árbol.', 'Cada semilla es un bosque esperando su momento.', 'Ceiba seeds', 'Gather 6 golden seeds for the great tree.', 'Every seed is a forest waiting for its moment.'],
  ['tocar', 5, '🌺', 'Flores dormidas', 'Toca 5 flores grises para devolverles su color.', 'La selva florece cuando la miran con cariño.', 'Sleeping flowers', 'Touch 5 grey flowers to give them their color back.', 'The jungle blooms when it is looked at with love.'],
  ['limpiar', 5, '🍃', 'Limpia el sendero', 'Desaparece 5 manchas que ensucian la selva.', 'Cuidar la casa de todos empieza por no dejar huella.', 'Clear the path', 'Vanish 5 stains that dirty the jungle.', 'Caring for everyone\'s home starts with leaving no trace.'],
  ['circulo', 3, '🌳', 'Siembra el bosque', 'Párate en los 3 claros para sembrar árboles nuevos.', 'Un árbol que siembras hoy da sombra a quien no conoces.', 'Grow the forest', 'Stand in the 3 clearings to plant new trees.', 'A tree you plant today shades someone you\'ll never meet.'],
  ['quiz', 1, '🌱', 'La primera pregunta', 'La Abuela Ceiba tiene una pregunta. Acércate al cristal.', 'Un mundo sano empieza con manos que cuidan: las tuyas.', 'The first question', 'Grandma Ceiba has a question. Approach the crystal.', 'A healthy world starts with caring hands: yours.',
    ['¿Cómo sanamos un mundo?', 'Cuidándolo un poquito cada día', 'Esperando a que alguien más lo haga', 'Ignorándolo', 'How do we heal a world?', 'By caring for it a little each day', 'By waiting for someone else', 'By ignoring it']],
];

// ---------------------------------------------------------------------------
// WORLD 1 · ATLANTIS
// ---------------------------------------------------------------------------
const ATLANTIS: Tuple[] = [
  ['recoger', 6, '🫧', 'Burbujas de aire', 'Junta 6 burbujas doradas para respirar en el fondo del mar.', 'Respira despacio, como el mar: dentro… y fuera.', 'Air bubbles', 'Gather 6 golden bubbles to breathe on the sea floor.', 'Breathe slowly, like the sea: in… and out.'],
  ['limpiar', 5, '🛍️', 'El fondo limpio', 'Camina hasta 5 bolsas de plástico y desaparécelas con tu magia.', 'El plástico parece medusa y las tortugas se confunden. Por eso lo recogemos.', 'A clean sea floor', 'Walk to 5 plastic bags and vanish them with your magic.', 'Plastic looks like jellyfish and turtles get confused. That\'s why we pick it up.'],
  ['tocar', 6, '🪸', 'Corales dormidos', 'Toca 6 corales grises para devolverles su color.', 'Los corales son animales que construyen ciudades para miles de peces.', 'Sleeping corals', 'Touch 6 grey corals to give them their color back.', 'Corals are animals that build cities for thousands of fish.'],
  ['quiz', 1, '🐋', 'La pregunta del océano', 'La ballena tiene una pregunta para ti. Acércate al cristal.', 'La mitad del aire que respiras nace en el mar. El mar respira por ti.', 'The ocean question', 'The whale has a question for you. Approach the crystal.', 'Half the air you breathe is born in the sea. The sea breathes for you.',
    ['¿Qué nos regala el océano?', 'La mitad del aire que respiramos', 'Solo olas para surfear', 'Nada importante', 'What does the ocean give us?', 'Half the air we breathe', 'Just waves for surfing', 'Nothing important']],
  ['recoger', 7, '🦪', 'Perlas de la memoria', 'Busca 7 perlas que guardan recuerdos de Atlantis.', 'Cada perla nace de la paciencia: capa tras capa, año tras año.', 'Memory pearls', 'Find 7 pearls that keep memories of Atlantis.', 'Each pearl is born of patience: layer by layer, year by year.'],
  ['encontrar', 1, '🛕', 'El templo hundido', 'En algún lugar brilla la puerta del templo. ¡Encuéntrala!', 'Las ciudades antiguas nos recuerdan: todo cambia, y aprender queda.', 'The sunken temple', 'Somewhere the temple door glows. Find it!', 'Ancient cities remind us: everything changes, and learning remains.'],
  ['llevar', 4, '🔱', 'Luces del tridente', 'Toma la luz del tridente y llévala a las 4 torres de coral.', 'Compartir tu luz no la apaga: la multiplica.', 'Trident lights', 'Take the trident\'s light to the 4 coral towers.', 'Sharing your light doesn\'t dim it: it multiplies it.'],
  ['quiz', 1, '🐠', 'La casa de los peces', 'Un pececito quiere saber si entendiste su hogar.', 'Cuidar un arrecife es cuidar un barrio entero del mar.', 'The fish house', 'A little fish wants to know if you understood its home.', 'Caring for a reef is caring for a whole sea neighborhood.',
    ['¿Qué es un arrecife de coral?', 'La casa de miles de peces', 'Una roca aburrida', 'Un juguete del mar', 'What is a coral reef?', 'A home for thousands of fish', 'A boring rock', 'A sea toy']],
  ['tocar', 5, '🎶', 'El canto de la ballena', 'Toca las 5 notas gigantes y canta con la ballena.', 'Las ballenas cantan canciones que cruzan océanos. Tu voz también llega lejos.', 'The whale song', 'Touch the 5 giant notes and sing with the whale.', 'Whales sing songs that cross oceans. Your voice travels far too.'],
];

// ---------------------------------------------------------------------------
// WORLD 2 · EGIPTO ANTIGUO
// ---------------------------------------------------------------------------
const EGIPTO: Tuple[] = [
  ['tocar', 6, '📜', 'Piedras que hablan', 'Toca 6 piedras con jeroglíficos para despertar sus historias.', 'Escribir es guardar ideas para que viajen en el tiempo.', 'Stones that speak', 'Touch 6 hieroglyph stones to wake their stories.', 'Writing is saving ideas so they can travel through time.'],
  ['quiz', 1, '✍️', 'El invento más grande', 'Kura pregunta sobre la escritura. Busca su cristal.', 'Gracias a la escritura, un abuelo de hace cinco mil años aún te cuenta cosas.', 'The greatest invention', 'Kura asks about writing. Find her crystal.', 'Thanks to writing, a grandparent from five thousand years ago can still tell you things.',
    ['¿Para qué inventaron la escritura?', 'Para guardar ideas y recuerdos', 'Para hacer ruido', 'Para no jugar', 'Why was writing invented?', 'To keep ideas and memories', 'To make noise', 'To avoid playing']],
  ['recoger', 8, '🪲', 'Escarabajos dorados', 'Reúne 8 escarabajos de oro por el desierto.', 'Para Egipto, el escarabajo empujaba el sol: los pequeños mueven cosas gigantes.', 'Golden scarabs', 'Collect 8 golden scarabs across the desert.', 'In Egypt the scarab pushed the sun: small ones move giant things.'],
  ['llevar', 4, '🕯️', 'Luz a los obeliscos', 'Lleva la llama sagrada a los 4 obeliscos.', 'Los obeliscos eran rayos de sol hechos piedra.', 'Light for the obelisks', 'Carry the sacred flame to the 4 obelisks.', 'Obelisks were sunbeams made of stone.'],
  ['limpiar', 6, '🏺', 'El regalo del Nilo', 'Limpia 6 manchas para que el gran río respire.', 'Un río limpio da agua, pan y vida a todo un pueblo.', 'The Nile\'s gift', 'Clean 6 stains so the great river can breathe.', 'A clean river gives water, bread and life to a whole people.'],
  ['quiz', 1, '🔺', 'El secreto de las pirámides', '¿Cómo movieron piedras tan gigantes? Kura te espera.', 'Miles de personas trabajando JUNTAS: ese es el verdadero secreto.', 'The pyramid secret', 'How did they move such giant stones? Kura is waiting.', 'Thousands of people working TOGETHER: that\'s the real secret.',
    ['¿Cómo movían las piedras gigantes?', 'Juntos, con rampas y equipo', 'Con magia oscura', 'Un gigante solito', 'How did they move the giant stones?', 'Together, with ramps and teamwork', 'With dark magic', 'One lonely giant']],
  ['encontrar', 1, '⭐', 'La estrella Sirio', 'Encuentra la estrella que anunciaba la crecida del Nilo.', 'Mirar el cielo era su calendario: las estrellas cuentan el tiempo.', 'The star Sirius', 'Find the star that announced the Nile flood.', 'Watching the sky was their calendar: stars keep time.'],
  ['tocar', 5, '⚖️', 'La balanza de Ma\'at', 'Toca las 5 pesas de la verdad.', 'Ma\'at enseñaba: un corazón honesto pesa ligerito, como pluma.', 'The scale of Ma\'at', 'Touch the 5 weights of truth.', 'Ma\'at taught: an honest heart weighs light as a feather.'],
  ['quiz', 1, '🧮', 'Contar como egipcio', 'Kura te enseña números con dibujos.', 'Contaban con dibujos: el 10 era una cuerdita. ¡Tú también puedes inventar formas de contar!', 'Counting like an Egyptian', 'Kura teaches you numbers with drawings.', 'They counted with drawings: 10 was a little rope. You can invent ways to count too!',
    ['Si la cuerdita vale 10, ¿cuánto valen dos cuerditas?', '20', '11', '100', 'If the little rope is 10, what are two ropes?', '20', '11', '100']],
  ['recoger', 6, '🌾', 'Trigo del sol', 'Cosecha 6 espigas doradas para el pan de todos.', 'Del río nace el trigo, del trigo el pan, del pan la fiesta.', 'Sun wheat', 'Harvest 6 golden wheat stalks for everyone\'s bread.', 'From the river comes wheat, from wheat bread, from bread joy.'],
  ['encontrar', 1, '📚', 'La Gran Biblioteca', 'Encuentra la puerta de la casa del saber.', 'El tesoro más grande de Egipto no era oro: eran LIBROS.', 'The Great Library', 'Find the door to the house of knowledge.', 'Egypt\'s greatest treasure wasn\'t gold: it was BOOKS.'],
];

// ---------------------------------------------------------------------------
// WORLD 3 · EL MUNDO DE LOS ASTROS (12 zodiac houses)
// ---------------------------------------------------------------------------
const ASTROS: Tuple[] = [
  ['tocar', 3, '♈', 'Casa 1 · Quién eres', 'Enciende las 3 estrellas de la primera casa.', 'La Casa Uno dice: ser tú mismo es tu superpoder.', 'House 1 · Who you are', 'Light the 3 stars of the first house.', 'House One says: being yourself is your superpower.'],
  ['recoger', 4, '♉', 'Casa 2 · Tus tesoros', 'Junta 4 gemas y piensa: ¿qué valoras de verdad?', 'Los tesoros de verdad —abrazos, amigos, tiempo— no se compran.', 'House 2 · Your treasures', 'Gather 4 gems and think: what do you truly value?', 'Real treasures —hugs, friends, time— can\'t be bought.'],
  ['quiz', 1, '♊', 'Casa 3 · Las palabras', 'Piko pregunta sobre el poder de las palabras.', 'Las palabras amables construyen puentes invisibles.', 'House 3 · Words', 'Piko asks about the power of words.', 'Kind words build invisible bridges.',
    ['¿Qué hacen las palabras amables?', 'Construyen puentes entre personas', 'Nada', 'Solo hacen ruido', 'What do kind words do?', 'They build bridges between people', 'Nothing', 'They just make noise']],
  ['circulo', 1, '♋', 'Casa 4 · El hogar', 'Quédate quieto en el círculo y siente tu hogar en el corazón.', 'El hogar no es un lugar: es donde te quieren.', 'House 4 · Home', 'Stand still in the circle and feel your home in your heart.', 'Home isn\'t a place: it\'s where you are loved.'],
  ['tocar', 5, '♌', 'Casa 5 · Crear y jugar', 'Toca 5 chispas de colores: ¡jugar también es crear!', 'Cuando juegas de corazón, el universo juega contigo.', 'House 5 · Create and play', 'Touch 5 color sparks: playing is creating too!', 'When you play with your heart, the universe plays with you.'],
  ['limpiar', 4, '♍', 'Casa 6 · Cuidar cada día', 'Limpia 4 nubecitas grises con tus buenos hábitos.', 'Las cositas pequeñas de cada día hacen la vida grande.', 'House 6 · Daily care', 'Clean 4 grey clouds with your good habits.', 'The small things of each day make life big.'],
  ['llevar', 3, '♎', 'Casa 7 · Los amigos', 'Lleva 3 luces de amistad de un corazón a otro.', 'Un buen amigo es un espejo donde te ves mejor.', 'House 7 · Friends', 'Carry 3 friendship lights from one heart to another.', 'A good friend is a mirror where you see your best self.'],
  ['quiz', 1, '♏', 'Casa 8 · Transformarse', '¿Qué le pasa a la oruga? Piko quiere saber si sabes.', 'Cambiar da un poquito de miedo… y luego salen alas.', 'House 8 · Transformation', 'What happens to the caterpillar? Piko wants to know.', 'Change is a little scary… and then wings appear.',
    ['¿Qué le pasa a la oruga en su capullo?', 'Se transforma en mariposa', 'Se queda dormida para siempre', 'Desaparece', 'What happens to the caterpillar in its cocoon?', 'It becomes a butterfly', 'It sleeps forever', 'It disappears']],
  ['anillos', 5, '♐', 'Casa 9 · Viajar y aprender', '¡Monta a Quetzalcóatl y cruza 5 anillos de estrellas!', 'Cada viaje te regala ojos nuevos.', 'House 9 · Travel and learn', 'Ride Quetzalcóatl through 5 star rings!', 'Every journey gives you new eyes.'],
  ['encontrar', 1, '♑', 'Casa 10 · Tus sueños', 'Encuentra la estrella de la cima: tu sueño grande.', 'Paso a pasito también se llega a la montaña.', 'House 10 · Your dreams', 'Find the summit star: your big dream.', 'Step by little step you also reach the mountain.'],
  ['tocar', 6, '♒', 'Casa 11 · La comunidad', 'Enciende 6 estrellas juntas: una constelación.', 'Una estrella brilla; una comunidad ilumina.', 'House 11 · Community', 'Light 6 stars together: a constellation.', 'One star shines; a community lights the sky.'],
  ['circulo', 1, '♓', 'Casa 12 · Soñar y descansar', 'Respira en el círculo de plata hasta llenarte de calma.', 'Descansar también es crecer: los sueños ordenan el corazón.', 'House 12 · Dream and rest', 'Breathe in the silver circle until you fill with calm.', 'Resting is growing too: dreams tidy the heart.'],
];

// ---------------------------------------------------------------------------
// WORLD 4 · ESCUELA DE PERMACULTURA, CIENCIA Y ARTES
// ---------------------------------------------------------------------------
const ESCUELA: Tuple[] = [
  ['circulo', 4, '🥕', 'El huerto vivo', 'Párate en las 4 camas de cultivo para sembrar verduras.', 'La comida de verdad nace del suelo, no del paquete.', 'The living garden', 'Stand in the 4 garden beds to plant vegetables.', 'Real food is born from soil, not from a package.'],
  ['quiz', 1, '🌞', 'Plantas que comen luz', 'Sprout pregunta cómo comen las plantas.', 'Se llama fotosíntesis: hojas que convierten luz en vida.', 'Plants that eat light', 'Sprout asks how plants eat.', 'It\'s called photosynthesis: leaves turning light into life.',
    ['¿Qué "comen" las plantas?', 'Luz del sol, agua y aire', 'Dulces', 'Piedritas', 'What do plants "eat"?', 'Sunlight, water and air', 'Candy', 'Little rocks']],
  ['recoger', 6, '💧', 'Cosecha de lluvia', 'Junta 6 gotas gigantes para el tanque de lluvia.', 'El agua de lluvia es un regalo: guárdala, no la dejes ir.', 'Rain harvest', 'Collect 6 giant drops for the rain tank.', 'Rainwater is a gift: save it, don\'t let it go.'],
  ['llevar', 4, '🍂', 'El tesoro de Momo', 'Lleva restos verdes a los 4 cajones de composta.', 'Momo dice: la basura verde no es basura, es comida para el suelo.', 'Momo\'s treasure', 'Carry green scraps to the 4 compost bins.', 'Momo says: green waste isn\'t waste, it\'s food for the soil.'],
  ['tocar', 5, '🐝', 'Amigas abejas', 'Toca 5 flores para invitar a las abejas.', 'Sin abejas no hay manzanas: una de cada tres mordidas es gracias a ellas.', 'Bee friends', 'Touch 5 flowers to invite the bees.', 'No bees, no apples: one of every three bites is thanks to them.'],
  ['quiz', 1, '🌧️', 'El viaje del agua', '¿A dónde va el agua del charco? Busca el cristal.', 'Sube al cielo, se hace nube y vuelve como lluvia: el agua viaja en círculo.', 'The water journey', 'Where does puddle water go? Find the crystal.', 'It rises, becomes a cloud and returns as rain: water travels in a circle.',
    ['¿A dónde va el agua del charco con el sol?', 'Sube y se hace nube', 'Desaparece para siempre', 'Se esconde y ya', 'Where does puddle water go in the sun?', 'It rises and becomes a cloud', 'It disappears forever', 'It just hides']],
  ['limpiar', 5, '♻️', 'Separar es amar', 'Limpia 5 montoncitos revueltos separando los materiales.', 'Cada material tiene su camino: el vidrio vuelve a ser vidrio.', 'Sorting is caring', 'Clean 5 mixed piles by sorting materials.', 'Every material has its path: glass becomes glass again.'],
  ['tocar', 4, '🎵', 'El laboratorio del ritmo', 'Toca los 4 tambores y siente el compás.', 'La música es matemática que se baila.', 'The rhythm lab', 'Touch the 4 drums and feel the beat.', 'Music is mathematics you can dance.'],
  ['quiz', 1, '🎨', 'Mezcla de colores', 'En el taller de arte: ¿qué pasa si mezclas?', 'Con tres colores primarios pintas el mundo entero.', 'Color mixing', 'In the art workshop: what happens when you mix?', 'With three primary colors you can paint the whole world.',
    ['¿Qué sale de mezclar azul y amarillo?', 'Verde', 'Rojo', 'Café', 'What do blue and yellow make?', 'Green', 'Red', 'Brown']],
  ['recoger', 5, '🌰', 'Guardianes de semillas', 'Rescata 5 semillas nativas para la biblioteca de semillas.', 'Guardar semillas es guardar futuros.', 'Seed guardians', 'Rescue 5 native seeds for the seed library.', 'Saving seeds is saving futures.'],
  ['encontrar', 1, '🔬', 'La gran pregunta', 'Encuentra el experimento escondido del laboratorio.', 'La ciencia empieza así: con una pregunta y ojos curiosos.', 'The big question', 'Find the hidden experiment in the lab.', 'Science starts like this: with a question and curious eyes.'],
  ['tocar', 5, '🖌️', 'El mural de todos', 'Pinta 5 espacios del mural comunitario.', 'El arte que se hace juntos embellece dos veces.', 'Everyone\'s mural', 'Paint 5 spaces of the community mural.', 'Art made together is twice as beautiful.'],
  ['quiz', 1, '⭐', '¿Qué es una estrella?', 'La última clase de ciencia mira al cielo.', 'El sol es una estrella cercana: las estrellas son soles lejísimos.', 'What is a star?', 'The last science class looks at the sky.', 'The sun is a nearby star: stars are faraway suns.',
    ['¿Qué es una estrella?', 'Un sol muy, muy lejano', 'Un foquito del cielo', 'Un agujerito', 'What is a star?', 'A very, very distant sun', 'A tiny lightbulb', 'A little hole']],
  ['circulo', 3, '🌳', 'El bosque comestible', 'Siembra 3 árboles frutales para los que vienen.', 'Permacultura es diseñar como la naturaleza: todo alimenta a todo.', 'The food forest', 'Plant 3 fruit trees for those to come.', 'Permaculture is designing like nature: everything feeds everything.'],
  ['construir', 4, '🏡', 'Diseña tu huerto', 'Abre 🔨 y coloca 4 creaciones para diseñar la escuela viva.', 'Diseñar es soñar con las manos: pon cada cosa donde ayude a las demás.', 'Design your garden', 'Open 🔨 and place 4 creations to design the living school.', 'Designing is dreaming with your hands: put each thing where it helps the others.'],
];

// ---------------------------------------------------------------------------
// WORLD 5 · EL ESPÍRITU (universal teachings, no religion named)
// ---------------------------------------------------------------------------
const ESPIRITU: Tuple[] = [
  ['circulo', 1, '🌬️', 'La respiración', 'Quédate en el círculo y respira lento, tres veces.', 'Tu calma vive a una respiración de distancia. Siempre.', 'The breath', 'Stay in the circle and breathe slowly, three times.', 'Your calm lives one breath away. Always.'],
  ['recoger', 5, '🙏', 'Luces de gratitud', 'Junta 5 luces; por cada una, piensa en algo que agradeces.', 'Dar gracias convierte lo que tienes en suficiente.', 'Gratitude lights', 'Gather 5 lights; for each, think of something you\'re thankful for.', 'Giving thanks turns what you have into enough.'],
  ['quiz', 1, '💗', 'La compasión', 'Kura pregunta con voz suave. Busca su cristal.', 'Compasión es sentir con el otro y querer ayudar.', 'Compassion', 'Kura asks softly. Find her crystal.', 'Compassion is feeling with someone and wanting to help.',
    ['Si un amigo está triste, ¿qué es compasión?', 'Sentir con él y acompañarlo', 'Burlarse', 'Ignorarlo', 'If a friend is sad, what is compassion?', 'Feeling with them and staying close', 'Mocking them', 'Ignoring them']],
  ['llevar', 4, '🕯️', 'Compartir la luz', 'Lleva tu velita a los 4 faroles apagados.', 'Una vela puede encender mil velas sin apagarse.', 'Sharing the light', 'Carry your candle to the 4 unlit lanterns.', 'One candle can light a thousand candles without going out.'],
  ['tocar', 5, '🔔', 'Campanas del silencio', 'Toca 5 campanas y escucha el silencio que dejan.', 'En el silencio se escuchan las cosas importantes.', 'Bells of silence', 'Ring 5 bells and listen to the silence they leave.', 'Important things are heard in silence.'],
  ['quiz', 1, '🤲', 'Soltar la piedra', '¿Qué es perdonar? La pregunta te espera.', 'Perdonar es soltar una piedra caliente que te quemaba a ti.', 'Letting go of the stone', 'What is forgiving? The question awaits.', 'Forgiving is dropping a hot stone that was burning you.',
    ['¿Qué es perdonar?', 'Soltar el enojo para estar en paz', 'Olvidar tu nombre', 'Ganar una pelea', 'What is forgiving?', 'Letting go of anger to be at peace', 'Forgetting your name', 'Winning a fight']],
  ['recoger', 6, '🌸', 'Flores para regalar', 'Recoge 6 flores… que son para dar, no para quedarte.', 'La generosidad es la alegría con las manos abiertas.', 'Flowers to give away', 'Pick 6 flowers… they\'re for giving, not keeping.', 'Generosity is joy with open hands.'],
  ['circulo', 1, '🪞', 'El espejo amable', 'Párate frente al espejo de luz y di algo bonito de ti.', 'Háblate como le hablarías a tu mejor amigo.', 'The kind mirror', 'Stand before the light mirror and say something kind about yourself.', 'Talk to yourself like you\'d talk to your best friend.'],
  ['quiz', 1, '🗣️', 'La verdad', 'Una pregunta sobre la honestidad.', 'La verdad construye confianza; la confianza construye todo lo demás.', 'Truth', 'A question about honesty.', 'Truth builds trust; trust builds everything else.',
    ['¿Por qué decir la verdad?', 'Porque crea confianza entre las personas', 'Para presumir', 'Porque es fácil', 'Why tell the truth?', 'Because it builds trust between people', 'To show off', 'Because it\'s easy']],
  ['tocar', 4, '👂', 'El arte de escuchar', 'Acércate despacito a 4 pájaros de luz: escucha.', 'Escuchar de verdad es un regalo que casi nadie da.', 'The art of listening', 'Approach 4 light birds slowly: listen.', 'Truly listening is a gift almost nobody gives.'],
  ['llevar', 3, '🍞', 'Pan para el camino', 'Lleva pan a las 3 mesas del pueblo.', 'Servir a otros es la manera más rápida de encontrarte.', 'Bread for the road', 'Take bread to the 3 village tables.', 'Serving others is the fastest way to find yourself.'],
  ['quiz', 1, '⏳', 'La semilla paciente', '¿Se puede jalar una semilla para que crezca más rápido?', 'Hay cosas que solo el tiempo sabe hacer. Confía.', 'The patient seed', 'Can you pull a seed to make it grow faster?', 'Some things only time knows how to do. Trust.',
    ['¿Cómo crece mejor una semilla?', 'Con tiempo, agua y paciencia', 'Jalándola fuerte', 'Gritándole', 'How does a seed grow best?', 'With time, water and patience', 'Pulling it hard', 'Yelling at it']],
  ['encontrar', 1, '🌟', 'El asombro', 'Encuentra la estrella escondida y mírala como si fuera la primera.', 'El mundo se vuelve mágico cuando lo miras despacio.', 'Wonder', 'Find the hidden star and look at it like your first one.', 'The world turns magical when you look slowly.'],
  ['tocar', 6, '🕊️', 'Palomas de paz', 'Libera 6 palomas de luz tocándolas suavecito.', 'La paz empieza del tamaño de un corazón: el tuyo.', 'Peace doves', 'Free 6 light doves with a gentle touch.', 'Peace starts the size of one heart: yours.'],
  ['circulo', 2, '🤝', 'Levantar al caído', 'Párate junto a las 2 lucecitas caídas para levantarlas.', 'Ayudar a levantarse es el músculo más bonito.', 'Lifting the fallen', 'Stand by the 2 fallen lights to lift them.', 'Helping someone up is the most beautiful muscle.'],
  ['quiz', 1, '😊', 'La alegría compartida', 'La pregunta de Kura sobre la alegría.', 'La alegría es de las pocas cosas que crecen al dividirse.', 'Shared joy', 'Kura\'s question about joy.', 'Joy is one of the few things that grows when divided.',
    ['¿Qué pasa con la alegría cuando la compartes?', 'Se hace más grande', 'Se acaba', 'Se esconde', 'What happens to joy when you share it?', 'It grows bigger', 'It runs out', 'It hides']],
  ['recoger', 7, '💞', 'Hilos de unión', 'Junta 7 hilos de luz que unen a todos los seres.', 'In Lak\'ech: tú eres mi otro yo. Lo que te hago, me lo hago.', 'Threads of union', 'Gather 7 light threads that join all beings.', 'In Lak\'ech: you are my other me. What I do to you, I do to myself.'],
  ['circulo', 1, '❤️', 'El corazón que une', 'Entra al gran círculo del corazón y quédate un momento.', 'Todas las enseñanzas del mundo caben en una palabra: amor.', 'The heart that unites', 'Enter the great heart circle and stay a moment.', 'All the world\'s teachings fit in one word: love.'],
];

// ---------------------------------------------------------------------------
// WORLD 6 · EL NUEVO MUNDO
// ---------------------------------------------------------------------------
const NUEVO: Tuple[] = [
  ['circulo', 4, '🌳', 'Bosque comestible', 'Siembra 4 árboles de frutas para todos.', 'En el mundo que queremos, la comida crece en las calles.', 'Food forest', 'Plant 4 fruit trees for everyone.', 'In the world we want, food grows in the streets.'],
  ['limpiar', 5, '🏞️', 'El río cristalino', 'Limpia 5 manchas del río del nuevo mundo.', 'Un pueblo se conoce por cómo trata a su río.', 'The crystal river', 'Clean 5 stains from the new world\'s river.', 'You know a town by how it treats its river.'],
  ['tocar', 4, '☀️', 'Energía del sol', 'Activa los 4 paneles solares tocándolos.', 'El sol manda energía gratis todos los días. Solo hay que recibirla.', 'Sun power', 'Activate the 4 solar panels with a touch.', 'The sun sends free energy every day. We just have to receive it.'],
  ['tocar', 4, '🌬️', 'Molinos de viento', 'Despierta 4 molinos para que giren con el viento.', 'El viento también trabaja para el pueblo, sin ensuciar el cielo.', 'Windmills', 'Wake 4 windmills so they spin with the wind.', 'The wind works for the village too, without dirtying the sky.'],
  ['llevar', 5, '📚', 'La biblioteca de todos', 'Lleva 5 libros a la biblioteca libre.', 'Un libro que se comparte enseña dos veces.', 'Everyone\'s library', 'Take 5 books to the free library.', 'A shared book teaches twice.'],
  ['quiz', 1, '🏫', '¿Para qué es la escuela?', 'Teko pregunta mientras construye.', 'La escuela del nuevo mundo: aprender juntos lo que amamos.', 'What is school for?', 'Teko asks while building.', 'The new world\'s school: learning together what we love.',
    ['¿Para qué es la escuela del nuevo mundo?', 'Para aprender juntos y crear', 'Para aburrirse', 'Solo para competir', 'What is the new world\'s school for?', 'To learn together and create', 'To be bored', 'Just to compete']],
  ['recoger', 6, '🧱', 'Manos a la obra', 'Junta 6 materiales para la casa común.', 'Construir juntos hace casas… y hermanos.', 'Hands to work', 'Gather 6 materials for the common house.', 'Building together makes houses… and siblings.'],
  ['circulo', 3, '🏥', 'La casa de cuidados', 'Levanta 3 espacios donde cuidamos a quien lo necesita.', 'Un pueblo es tan fuerte como cuida a sus más frágiles.', 'The care house', 'Raise 3 spaces where we care for those in need.', 'A town is as strong as how it cares for its most fragile.'],
  ['quiz', 1, '🤝', 'El trueque', '¿Cómo conseguimos cosas sin dinero?', 'Intercambiando lo que sabemos y hacemos: todos tienen algo que dar.', 'Barter', 'How do we get things without money?', 'Trading what we know and make: everyone has something to give.',
    ['¿Qué es el trueque?', 'Intercambiar sin dinero', 'Esconder cosas', 'Comprar más caro', 'What is barter?', 'Trading without money', 'Hiding things', 'Buying at a higher price']],
  ['tocar', 5, '🎪', 'Fiesta de culturas', 'Enciende 5 faroles de la gran fiesta del mundo.', 'Cada cultura es un color: juntas hacen el arcoíris.', 'Festival of cultures', 'Light 5 lanterns of the great world festival.', 'Every culture is a color: together they make the rainbow.'],
  ['recoger', 5, '🥖', 'Pan para todos', 'Junta 5 panes del horno comunitario para repartir.', 'En el nuevo mundo nadie se queda sin pan.', 'Bread for all', 'Gather 5 loaves from the community oven to share.', 'In the new world nobody goes without bread.'],
  ['llevar', 4, '💧', 'Fuentes de agua limpia', 'Lleva agua pura a las 4 fuentes del pueblo.', 'El agua limpia es un derecho de todos los seres.', 'Clean water fountains', 'Carry pure water to the 4 village fountains.', 'Clean water is a right of all beings.'],
  ['quiz', 1, '♻️', 'Basura cero', '¿Qué hacemos aquí con la "basura"?', 'En la naturaleza no existe la basura: todo se transforma.', 'Zero waste', 'What do we do with "trash" here?', 'In nature there is no trash: everything transforms.',
    ['En el nuevo mundo, ¿qué es la basura?', 'Materia que se transforma en algo útil', 'Algo que se tira al río', 'Un adorno', 'In the new world, what is trash?', 'Matter transformed into something useful', 'Something thrown in the river', 'A decoration']],
  ['tocar', 4, '🎨', 'Murales de colores', 'Pinta 4 muros grises con arte.', 'El arte en las calles es un abrazo para desconocidos.', 'Color murals', 'Paint 4 grey walls with art.', 'Street art is a hug for strangers.'],
  ['circulo', 1, '🕊️', 'La plaza de la paz', 'Quédate en la plaza y siembra un momento de paz.', 'Los pueblos también necesitan lugares para no hacer nada… juntos.', 'The peace square', 'Stay in the square and plant a moment of peace.', 'Towns also need places to do nothing… together.'],
  ['recoger', 6, '🌺', 'Jardines polinizadores', 'Planta 6 flores para abejas, colibríes y mariposas.', 'Si florece para las abejas, florece para todos.', 'Pollinator gardens', 'Plant 6 flowers for bees, hummingbirds and butterflies.', 'If it blooms for the bees, it blooms for everyone.'],
  ['quiz', 1, '🗳️', 'Decidir juntos', '¿Cómo se decide en el nuevo mundo?', 'Escuchando todas las voces, hasta las más chiquitas.', 'Deciding together', 'How are decisions made in the new world?', 'By listening to every voice, even the smallest.',
    ['¿Cómo decidimos juntos?', 'Escuchando todas las voces', 'Gana el que grita', 'Decide uno solo', 'How do we decide together?', 'By listening to all voices', 'Loudest wins', 'One person decides']],
  ['llevar', 3, '🌟', 'El árbol de los deseos', 'Lleva 3 sueños brillantes al gran árbol.', 'Los sueños compartidos se vuelven planes.', 'The wishing tree', 'Carry 3 shining dreams to the great tree.', 'Shared dreams become plans.'],
  ['tocar', 6, '🫂', 'Abrazos de bienvenida', 'Recibe con luz a 6 viajeros nuevos.', 'En el nuevo mundo, nadie es extranjero.', 'Welcome hugs', 'Greet 6 new travelers with light.', 'In the new world, no one is a stranger.'],
  ['circulo', 1, '🌈', 'El corazón del nuevo mundo', 'Entra al círculo arcoíris: el mundo que soñamos ya empezó… contigo.', 'El nuevo mundo no se espera: se siembra hoy, jugando.', 'The heart of the new world', 'Enter the rainbow circle: the world we dream already began… with you.', 'The new world isn\'t waited for: it\'s planted today, by playing.'],
  ['construir', 5, '🏗️', 'Construye tu pueblo', 'Abre 🔨 y coloca 5 creaciones para dar vida al nuevo mundo.', 'Crear juntos es el superpoder del nuevo mundo: lo imaginas y aparece.', 'Build your village', 'Open 🔨 and place 5 creations to bring the new world to life.', 'Creating together is the new world\'s superpower: you imagine it and it appears.'],
  ['construir', 8, '🌇', 'Tu ciudad soñada', 'Sigue construyendo: coloca 8 creaciones más y hazla tuya.', 'El mundo que sueñas cabe en tus manos. Constrúyelo.', 'Your dream city', 'Keep building: place 8 more creations and make it yours.', 'The world you dream of fits in your hands. Build it.'],
];

export const WORLDS: KaiWorld[] = [
  {
    id: 'selva', emoji: '🌳', guideEmoji: '🌳', color: '#3fae72',
    name: { es: 'Templo de la Selva', en: 'Jungle Temple' },
    guide: { es: 'Abuela Ceiba', en: 'Grandma Ceiba' },
    intro: { es: 'Bienvenido a la selva, hogar de todo lo vivo. Ayúdala a florecer.', en: 'Welcome to the jungle, home of all living things. Help it bloom.' },
    fin: { es: 'La selva canta contigo. ¡Estás listo para viajar a otros mundos!', en: 'The jungle sings with you. You\'re ready to travel to other worlds!' },
    theme: { fog: '#1a3326', terrain: ['#5a5133', '#37672f', '#6fb26a'], water: '#20343a', hemi: '#dce9ff' },
    voice: { pitch: 1, rate: 0.98 },
    missions: SELVA.map(mdef),
  },
  {
    id: 'atlantis', emoji: '🌊', guideEmoji: '🐋', color: '#4fc9e8',
    name: { es: 'Atlantis', en: 'Atlantis' },
    guide: { es: 'Tef y la ballena', en: 'Tef and the whale' },
    intro: { es: 'Bienvenido a Atlantis, la ciudad bajo el mar. Aquí todo flota… respira despacio.', en: 'Welcome to Atlantis, the city under the sea. Everything floats here… breathe slowly.' },
    fin: { es: 'Atlantis brilla de nuevo. ¡El mar entero te nombra su Guardián!', en: 'Atlantis shines again. The whole sea names you its Guardian!' },
    theme: { fog: '#06283a', terrain: ['#1a5566', '#2b8a94', '#7fd8cf'], water: '#0e5a6a', hemi: '#4fd0e0', grav: 6, jump: 7, swim: true },
    voice: { pitch: 1.15, rate: 1 },
    missions: ATLANTIS.map(mdef),
  },
  {
    id: 'egipto', emoji: '🏜️', guideEmoji: '🐢', color: '#d9a24a',
    name: { es: 'Egipto Antiguo', en: 'Ancient Egypt' },
    guide: { es: 'Kura, la tortuga sabia', en: 'Kura, the wise turtle' },
    intro: { es: 'Bienvenido al antiguo Egipto, donde las piedras hablan y las estrellas cuentan el tiempo.', en: 'Welcome to ancient Egypt, where stones speak and stars keep time.' },
    fin: { es: 'Egipto guarda tu nombre en sus piedras, Guardián del saber.', en: 'Egypt keeps your name in its stones, Guardian of knowledge.' },
    theme: { fog: '#5a4526', terrain: ['#8a6a3a', '#d9b06a', '#f0dca8'], water: '#3a6a5a', hemi: '#ffe0b0' },
    voice: { pitch: 1, rate: 0.92 },
    missions: EGIPTO.map(mdef),
  },
  {
    id: 'astros', emoji: '🌌', guideEmoji: '🌸', color: '#c9b3f0',
    name: { es: 'El Mundo de los Astros', en: 'The World of the Stars' },
    guide: { es: 'Piko, la flor de las emociones', en: 'Piko, the emotion bloom' },
    intro: { es: 'Bienvenido al cielo. Las doce casas de estrellas te van a enseñar quién eres.', en: 'Welcome to the sky. The twelve star houses will teach you who you are.' },
    fin: { es: 'Las doce casas brillan contigo. ¡Eres un mapa de estrellas caminando!', en: 'The twelve houses shine with you. You are a walking star map!' },
    theme: { fog: '#0a0a24', terrain: ['#232355', '#3d3d8a', '#8a8ae0'], water: '#1a1a4a', hemi: '#8888ff', grav: 5, jump: 7, swim: true },
    voice: { pitch: 1.2, rate: 1 },
    missions: ASTROS.map(mdef),
  },
  {
    id: 'escuela', emoji: '📚', guideEmoji: '🌱', color: '#7ec850',
    name: { es: 'Escuela de Permacultura, Ciencia y Artes', en: 'School of Permaculture, Science & Arts' },
    guide: { es: 'Sprout y Momo', en: 'Sprout and Momo' },
    intro: { es: '¡La escuela viva! Aquí la tierra, la ciencia y el arte juegan juntos.', en: 'The living school! Here soil, science and art play together.' },
    fin: { es: 'Ya sabes sembrar, preguntar y crear. ¡La escuela viva te celebra!', en: 'You know how to plant, to ask and to create. The living school celebrates you!' },
    theme: { fog: '#2e4a2e', terrain: ['#3a5a2a', '#5a9a3f', '#b8e08a'], water: '#2a6a5a', hemi: '#d8ffd0' },
    voice: { pitch: 1.12, rate: 1 },
    missions: ESCUELA.map(mdef),
  },
  {
    id: 'espiritu', emoji: '🕊️', guideEmoji: '🐢', color: '#f0a8c8',
    name: { es: 'El Espíritu', en: 'The Spirit' },
    guide: { es: 'Kura, guardiana antigua', en: 'Kura, ancient guide' },
    intro: { es: 'Bienvenido al jardín silencioso, donde viven las enseñanzas más antiguas del corazón.', en: 'Welcome to the silent garden, where the heart\'s oldest teachings live.' },
    fin: { es: 'Ahora llevas todas las enseñanzas donde nadie las puede perder: dentro de ti.', en: 'Now you carry every teaching where no one can lose it: inside you.' },
    theme: { fog: '#463a5e', terrain: ['#4a3a6a', '#8a7ab0', '#e8e0f8'], water: '#3a2a5a', hemi: '#f0e8ff' },
    voice: { pitch: 1, rate: 0.9 },
    missions: ESPIRITU.map(mdef),
  },
  {
    id: 'nuevo', emoji: '🌈', guideEmoji: '🦦', color: '#ffd166',
    name: { es: 'El Nuevo Mundo', en: 'The New World' },
    guide: { es: 'Teko, el constructor', en: 'Teko, the builder' },
    intro: { es: 'Este mundo está casi vacío… porque lo vamos a crear TÚ y yo, misión por misión.', en: 'This world is almost empty… because YOU and I are going to create it, mission by mission.' },
    fin: { es: 'Mira lo que construimos. El nuevo mundo ya existe: empezó contigo. In Lak\'ech.', en: 'Look what we built. The new world already exists: it began with you. In Lak\'ech.' },
    theme: { fog: '#2a4a5a', terrain: ['#2a6a4a', '#4aba7a', '#c8f0a8'], water: '#1a5a6a', hemi: '#eafff0' },
    voice: { pitch: 1.1, rate: 1 },
    missions: NUEVO.map(mdef),
  },
];

export const TOTAL_MISSIONS = WORLDS.reduce((s, w) => s + w.missions.length, 0);

export const worldById = (id: string) => WORLDS.find((w) => w.id === id) ?? WORLDS[0];
export const worldIndex = (id: string) => Math.max(0, WORLDS.findIndex((w) => w.id === id));
