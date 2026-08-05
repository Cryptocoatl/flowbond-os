/**
 * Reciprociudad — editable site copy.
 *
 * This file is the CANONICAL DEFAULT for every string on the home page. The
 * `reciprociudad.site_content` table only ever stores OVERRIDES; a key that is
 * absent from the DB renders the default below. That is what makes "Restaurar
 * original" in /admin a simple DELETE, and it means the site can never render
 * blank if the database is unreachable.
 *
 * Rich-text convention (kept deliberately tiny so it is safe to type by hand):
 *   **palabra**   → the accent <em> for that field (color set per field)
 *   line break    → <br/>
 * No HTML is ever interpreted — see lib/rich.tsx.
 */

export type FieldType = 'text' | 'textarea' | 'url';

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  def: string;
  /**
   * Accent class for **marked** words. Set on titles (renders a coloured <em>);
   * left unset on body copy, where **marked** words render as plain bold —
   * exactly how the design used them before this became editable.
   */
  accent?: string;
  hint?: string;
};

export type Group = {
  id: string;
  title: string;
  note?: string;
  fields: Field[];
};

/** Accent palette available to marked words (matches globals.css). */
export const ACCENTS = ['agua', 'oro', 'coral', 'selva'] as const;

export const GROUPS: Group[] = [
  // ──────────────────────────────────────────────────────────────── Nav ────
  {
    id: 'nav',
    title: 'Barra superior',
    note: 'Lo primero que se ve. Los enlaces apuntan a las secciones de la misma página.',
    fields: [
      { key: 'nav.brand', label: 'Nombre de la marca', type: 'text', def: 'Reciprociudad' },
      { key: 'nav.link1', label: 'Enlace 1', type: 'text', def: 'El viaje' },
      { key: 'nav.link2', label: 'Enlace 2', type: 'text', def: 'El sistema' },
      { key: 'nav.link3', label: 'Enlace 3', type: 'text', def: 'Cómo funciona' },
      { key: 'nav.link4', label: 'Enlace 4', type: 'text', def: 'Iniciativas' },
      { key: 'nav.link5', label: 'Enlace 5', type: 'text', def: 'Instagram' },
      { key: 'nav.cta', label: 'Botón (escritorio)', type: 'text', def: 'Entrar a la red' },
      { key: 'nav.ctaShort', label: 'Botón (celular)', type: 'text', def: 'Entrar' },
    ],
  },

  // ────────────────────────────────────────────────── El viaje inmersivo ────
  {
    id: 'journey',
    title: 'El viaje inmersivo',
    note: 'Los cinco actos que aparecen sobre la animación mientras la gente baja. Textos cortos: compiten con la imagen.',
    fields: [
      { key: 'journey.loader', label: 'Palabra de carga', type: 'text', def: 'Reciprociudad' },

      { key: 'journey.a0.eyebrow', label: 'Acto 1 · antetítulo', type: 'text', def: 'Reciprociudad · un viaje al futuro ancestral' },
      { key: 'journey.a0.title', label: 'Acto 1 · título', type: 'textarea', accent: 'oro cine-hero-word', def: 'Un viaje al\n**futuro ancestral**.' },
      { key: 'journey.a0.body', label: 'Acto 1 · texto', type: 'textarea', def: 'Del concreto gris a la ciudad-lago que se regenera. Guiados por la sabiduría que teje la vida, los modelos naturales de organización —reciprocidad, comunidad, ciclos— vuelven a **conquistar la tierra con amor**. Baja para descender al lago.' },

      { key: 'journey.a1.eyebrow', label: 'Acto 2 · antetítulo', type: 'text', def: 'El origen · el agua' },
      { key: 'journey.a1.title', label: 'Acto 2 · título', type: 'textarea', accent: 'oro', def: 'Todo empezó **en el agua**.' },
      { key: 'journey.a1.body', label: 'Acto 2 · texto', type: 'textarea', def: 'Chinampas que regeneraban, canales que conectaban, un tianguis que cerraba el círculo. Nada se desperdiciaba. Míralas encenderse otra vez.' },

      { key: 'journey.a2.eyebrow', label: 'Acto 3 · antetítulo', type: 'text', def: 'El regreso' },
      { key: 'journey.a2.title', label: 'Acto 3 · título', type: 'textarea', accent: 'agua cine-hero-word', def: 'Tenochtitlan no se fue.\n**Vuelve.**' },
      { key: 'journey.a2.body', label: 'Acto 3 · texto', type: 'textarea', def: 'Reciprociudad reenciende ese sistema ancestral — chinampa por chinampa, barrio por barrio — para que la ciudad vuelva a dar, recibir y regenerar.' },

      { key: 'journey.a3.eyebrow', label: 'Acto 4 · antetítulo', type: 'text', def: 'De México al mundo' },
      { key: 'journey.a3.title', label: 'Acto 4 · título', type: 'textarea', accent: 'oro cine-hero-word', def: 'Se replica en cada\n**esquina de la Tierra**.' },
      { key: 'journey.a3.body', label: 'Acto 4 · texto', type: 'textarea', def: 'México encendió la primera chinampa. Cada ciudad que adopta la reciprocidad se vuelve un nuevo punto de luz — hasta que el planeta entero recuerde cómo dar y recibir.' },

      { key: 'journey.a4.eyebrow', label: 'Acto 5 · antetítulo', type: 'text', def: 'Tu lugar en la red' },
      { key: 'journey.a4.title', label: 'Acto 5 · título', type: 'textarea', accent: 'agua', def: 'Siembra tu **chinampa**.' },
      { key: 'journey.a4.body', label: 'Acto 5 · texto', type: 'textarea', def: 'Sigue bajando para entrar a la red con tu identidad FBID.' },
      { key: 'journey.a4.cue', label: 'Acto 5 · señal de bajar', type: 'text', def: 'Sigue ↓' },
    ],
  },

  // ───────────────────────────────────────────────────────── El sistema ────
  {
    id: 'sistema',
    title: 'El sistema · tres fuerzas',
    fields: [
      { key: 'sistema.eyebrow', label: 'Antetítulo', type: 'text', def: 'El sistema' },
      { key: 'sistema.title', label: 'Título', type: 'textarea', accent: 'agua', def: 'Tres fuerzas que esta ciudad **ya conocía**.' },
      { key: 'sistema.sub', label: 'Bajada', type: 'textarea', def: 'Reciprociudad no inventa nada nuevo. Reactiva lo que el lago hacía: intercambiar, regenerar y sostener en comunidad.' },

      { key: 'sistema.f1.nahuatl', label: 'Fuerza 1 · náhuatl', type: 'text', def: 'Tianguis · el mercado' },
      { key: 'sistema.f1.title', label: 'Fuerza 1 · título', type: 'text', def: 'Reciprocidad' },
      { key: 'sistema.f1.body', label: 'Fuerza 1 · texto', type: 'textarea', def: 'Trueque, intercambio y apoyo mutuo. Lo que sobra de un lado le falta a otro: la red cierra el círculo.' },

      { key: 'sistema.f2.nahuatl', label: 'Fuerza 2 · náhuatl', type: 'text', def: 'Chinampa · la tierra fértil' },
      { key: 'sistema.f2.title', label: 'Fuerza 2 · título', type: 'text', def: 'Economía regenerativa' },
      { key: 'sistema.f2.body', label: 'Fuerza 2 · texto', type: 'textarea', def: 'Circular por diseño. Recursos, tiempo y dinero que regresan al ciclo y vuelven más fértiles.' },

      { key: 'sistema.f3.nahuatl', label: 'Fuerza 3 · náhuatl', type: 'text', def: 'Calpulli · la comunidad' },
      { key: 'sistema.f3.title', label: 'Fuerza 3 · título', type: 'text', def: 'Cultura viva' },
      { key: 'sistema.f3.body', label: 'Fuerza 3 · texto', type: 'textarea', def: 'La comunidad que sostiene y celebra el territorio: eventos, talleres y proyectos en la calle.' },
    ],
  },

  // ──────────────────────────────────────────────────────────── Tu viaje ────
  {
    id: 'viaje',
    title: 'Tu viaje · seis pasos',
    fields: [
      { key: 'viaje.eyebrow', label: 'Antetítulo', type: 'text', def: 'Tu viaje' },
      { key: 'viaje.title', label: 'Título', type: 'textarea', accent: 'coral', def: 'Un camino **por los canales**.' },
      { key: 'viaje.sub', label: 'Bajada', type: 'textarea', def: 'Empieza por entrar. De ahí la red se abre, canal por canal: tu lugar, las iniciativas, los eventos, los servicios y las causas que mueven tu barrio.' },

      { key: 'viaje.p1.title', label: 'Paso 01 · título', type: 'text', def: 'Únete' },
      { key: 'viaje.p1.body', label: 'Paso 01 · texto', type: 'textarea', def: 'Crea tu cuenta y entra a la red en menos de un minuto. Una sola identidad para todo lo que sigue.' },
      { key: 'viaje.p1.tag', label: 'Paso 01 · etiqueta', type: 'text', def: 'Identidad · FBID' },

      { key: 'viaje.p2.title', label: 'Paso 02 · título', type: 'text', def: 'Tu chinampa' },
      { key: 'viaje.p2.body', label: 'Paso 02 · texto', type: 'textarea', def: 'Tu perfil vivo: di qué siembras y qué buscas. La red lee tus señales y te conecta con quien encaja.' },
      { key: 'viaje.p2.tag', label: 'Paso 02 · etiqueta', type: 'text', def: 'Oferta · Demanda' },

      { key: 'viaje.p3.title', label: 'Paso 03 · título', type: 'text', def: 'Iniciativas' },
      { key: 'viaje.p3.body', label: 'Paso 03 · texto', type: 'textarea', def: 'Descubre y suma proyectos que regeneran tu colonia: huertos, compostaje, bancos de tiempo y más.' },
      { key: 'viaje.p3.tag', label: 'Paso 03 · etiqueta', type: 'text', def: 'Explorar · Sumarte' },

      { key: 'viaje.p4.title', label: 'Paso 04 · título', type: 'text', def: 'Eventos' },
      { key: 'viaje.p4.body', label: 'Paso 04 · texto', type: 'textarea', def: 'La agenda viva de la ciudad: encuentros, talleres y ferias de intercambio en tu zona.' },
      { key: 'viaje.p4.tag', label: 'Paso 04 · etiqueta', type: 'text', def: 'Agenda · Asistir' },

      { key: 'viaje.p5.title', label: 'Paso 05 · título', type: 'text', def: 'Servicios' },
      { key: 'viaje.p5.body', label: 'Paso 05 · texto', type: 'textarea', def: 'Ofrece y encuentra servicios dentro de la comunidad. Confianza de barrio, no de extraños.' },
      { key: 'viaje.p5.tag', label: 'Paso 05 · etiqueta', type: 'text', def: 'Ofrecer · Contratar' },

      { key: 'viaje.p6.title', label: 'Paso 06 · título', type: 'text', def: 'Proyectos y donaciones' },
      { key: 'viaje.p6.body', label: 'Paso 06 · texto', type: 'textarea', def: 'Aporta tiempo, recursos o dinero a las causas que sostienen la ciudad. Cada aporte queda visible y trazable.' },
      { key: 'viaje.p6.tag', label: 'Paso 06 · etiqueta', type: 'text', def: 'Aportar · Donar' },
    ],
  },

  // ───────────────────────────────────────────────────────── Iniciativas ────
  {
    id: 'iniciativas',
    title: 'Iniciativas · encabezado',
    note: 'Las tarjetas se editan en la pestaña "Iniciativas".',
    fields: [
      { key: 'iniciativas.eyebrow', label: 'Antetítulo', type: 'text', def: 'Chinampas vivas' },
      { key: 'iniciativas.title', label: 'Título', type: 'textarea', accent: 'selva', def: 'Lo que **ya está creciendo**.' },
      { key: 'iniciativas.sub', label: 'Bajada', type: 'textarea', def: 'Una muestra del tipo de iniciativas que viven dentro de la red. Cada una es una chinampa: abre una puerta para participar.' },
    ],
  },

  // ─────────────────────────────────────────────────────────── Instagram ────
  {
    id: 'social',
    title: 'Instagram',
    fields: [
      { key: 'social.eyebrow', label: 'Antetítulo', type: 'text', def: 'Vívelo en Instagram' },
      { key: 'social.title', label: 'Título', type: 'textarea', accent: 'coral', def: 'La red **ya late** ahí afuera.' },
      { key: 'social.body', label: 'Texto', type: 'textarea', def: 'Síguenos para ver las chinampas vivas en movimiento: trueques, huertos, ferias y la comunidad regenerando la ciudad, un reel a la vez.' },
      { key: 'social.handle', label: 'Usuario (@)', type: 'text', def: '@reciprociudad' },
      { key: 'social.url', label: 'Liga al perfil', type: 'url', def: 'https://www.instagram.com/reciprociudad' },
      { key: 'social.btn', label: 'Botón', type: 'text', def: 'Seguir @reciprociudad' },
      { key: 'social.cardTitle', label: 'Tarjeta · título', type: 'text', def: 'Ver la red en Instagram →' },
      { key: 'social.reel', label: 'Reel destacado (liga)', type: 'url', def: '', hint: 'Déjalo vacío para que la tarjeta lleve al perfil. Si pegas la liga de un reel, se incrusta el reel.' },
    ],
  },

  // ──────────────────────────────────────────────────────────────── Únete ────
  {
    id: 'unete',
    title: 'Únete · entrar con FBID',
    fields: [
      { key: 'unete.eyebrow', label: 'Antetítulo', type: 'text', def: 'Empieza el viaje' },
      { key: 'unete.title', label: 'Título', type: 'textarea', accent: 'agua', def: 'Siembra tu lugar **en el lago**.' },
      { key: 'unete.body', label: 'Texto', type: 'textarea', def: 'Entra con tu identidad **FBID** — una sola, para todo FlowBond. Sin contraseñas y sin app: entra con tu **correo o tu celular**, con lo que tengas a la mano.' },
      { key: 'unete.note', label: 'Nota al pie', type: 'textarea', def: 'Una identidad FBID, todas las posibilidades. Tú decides qué compartes. Sin spam, sin letras chiquitas.' },
      { key: 'unete.doneEyebrow', label: 'Ya dentro · antetítulo', type: 'text', def: 'Ya estás en la red' },
      { key: 'unete.doneTitle', label: 'Ya dentro · título', type: 'textarea', accent: 'agua', def: 'Bienvenida a **Reciprociudad**.' },
      { key: 'unete.doneNext', label: 'Ya dentro · siguiente paso', type: 'textarea', def: 'Lo que sigue: **registrar tu nodo** en el mapa, sumar tu comunidad y conectar con la red viva.' },
    ],
  },

  // ─────────────────────────────────────────────────────────── La red viva ────
  {
    id: 'red',
    title: 'La red viva · encabezado',
    note: 'Los nodos se moderan en la pestaña "Red viva".',
    fields: [
      { key: 'red.eyebrow', label: 'Antetítulo', type: 'text', def: 'La red viva' },
      { key: 'red.title', label: 'Título', type: 'textarea', accent: 'agua', def: 'Los **nodos** que ya laten.' },
      { key: 'red.sub', label: 'Bajada', type: 'textarea', def: 'Cada nodo es un lugar real de la red: lo que ofrece y lo que necesita. Así la ciudad se teje —comunidad con comunidad— para regenerarse.' },
      { key: 'red.empty', label: 'Cuando no hay nodos', type: 'textarea', def: 'Sé el primer nodo de tu zona. Entra y regístrate abajo.' },
      { key: 'red.gateTitle', label: 'Registro · título', type: 'text', def: 'Registra tu nodo' },
      { key: 'red.gateBody', label: 'Registro · invitación', type: 'textarea', def: 'Entra con tu identidad **FBID** para poner tu comunidad, chinampa o proyecto en el mapa vivo.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── Footer ────
  {
    id: 'footer',
    title: 'Pie de página',
    fields: [
      { key: 'footer.brand', label: 'Marca', type: 'text', def: 'Reciprociudad' },
      { key: 'footer.tagline', label: 'Frase de cierre', type: 'text', def: 'Hecha en la ciudad-lago · CDMX' },
    ],
  },
];

/** slot → default image, replaceable from /admin. */
export type MediaSlot = { slot: string; label: string; def: string; hint?: string };

export const MEDIA: MediaSlot[] = [
  {
    slot: 'journey.open',
    label: 'Apertura del viaje',
    def: '/vision/apertura-codice.webp',
    hint: 'La primera imagen que se ve. Se disuelve al bajar. Horizontal, mínimo 2000px de ancho.',
  },
  {
    slot: 'journey.tenochtitlan',
    label: 'Tenochtitlan renace',
    def: '/vision/tenochtitlan-renace.webp',
    hint: 'La ciudad-lago que emerge en el acto 3. Horizontal.',
  },
  {
    slot: 'journey.mundo',
    label: 'De México al mundo',
    def: '/vision/de-mexico-al-mundo.webp',
    hint: 'El planeta del acto 4. Horizontal.',
  },
  { slot: 'brand.logo', label: 'Sello / logo', def: '/logo-512.png', hint: 'Cuadrado, fondo transparente.' },
];

/** Cards shown while no `site_iniciativas` rows exist yet. */
export const INICIATIVAS_DEFAULT = [
  { id: 'd1', kind: 'tianguis', k: 'Tianguis', title: 'Mercadito de barrio', description: 'Cambia lo que ya no usas por lo que necesitas.', slot: 1 },
  { id: 'd2', kind: 'chinampa', k: 'Chinampa', title: 'Huertos urbanos', description: 'Azoteas y patios que vuelven a dar comida.', slot: 2 },
  { id: 'd3', kind: 'tiempo', k: 'Tiempo', title: 'Banco de tiempo', description: 'Una hora tuya vale una hora de alguien más.', slot: 3 },
  { id: 'd4', kind: 'cultura', k: 'Cultura', title: 'Ferias y talleres', description: 'Aprende y comparte oficios en comunidad.', slot: 4 },
  { id: 'd5', kind: 'ciclo', k: 'Ciclo', title: 'Compostaje vecinal', description: 'Tu orgánico se vuelve tierra fértil otra vez.', slot: 5 },
  { id: 'd6', kind: 'causas', k: 'Causas', title: 'Proyectos sociales', description: 'Suma recursos a lo que mueve tu colonia.', slot: 6 },
];

export type Iniciativa = (typeof INICIATIVAS_DEFAULT)[number];

export const ALL_FIELDS: Field[] = GROUPS.flatMap((g) => g.fields);

export const DEFAULTS: Record<string, string> = Object.fromEntries(
  ALL_FIELDS.map((f) => [f.key, f.def]),
);

export const FIELD_BY_KEY: Record<string, Field> = Object.fromEntries(
  ALL_FIELDS.map((f) => [f.key, f]),
);

export const MEDIA_DEFAULTS: Record<string, string> = Object.fromEntries(
  MEDIA.map((m) => [m.slot, m.def]),
);

/** The merged content the page renders: DB overrides on top of the defaults. */
export type SiteContent = {
  copy: Record<string, string>;
  media: Record<string, string>;
  iniciativas: Iniciativa[];
};

export const FALLBACK: SiteContent = {
  copy: DEFAULTS,
  media: MEDIA_DEFAULTS,
  iniciativas: INICIATIVAS_DEFAULT,
};

/**
 * Accent class for a key's **marked** words. `undefined` means "no accent" —
 * the marker then renders as plain bold instead of a coloured <em>.
 */
export function accentOf(key: string): string | undefined {
  return FIELD_BY_KEY[key]?.accent;
}
