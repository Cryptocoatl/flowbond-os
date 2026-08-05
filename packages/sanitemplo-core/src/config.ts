/**
 * SANI TEMPLO · Fuente única de verdad
 * ------------------------------------------------------------------
 * Todo lo que el sistema no sabe todavía vive AQUÍ y solo aquí.
 * Buscar TODO_CONFIRM antes de cobrarle a un ser humano real.
 *
 * Regla: ningún otro archivo del repo define un precio, un color,
 * una tipografía o un porcentaje. Si lo hace, es un bug.
 */

/* ═══════════════════════════════════════════════════════════
   1 · LO QUE FALTA — tres decisiones bloquean el go-live
   ═══════════════════════════════════════════════════════════ */

export const UNKNOWNS = {
  /**
   * TODO_CONFIRM #1 · Logo
   * Colocar el SVG real en apps/reciprociudad/public/sanitemplo/logo.svg
   * Mientras no exista, <Wordmark/> renderiza el lockup tipográfico de respaldo
   * y BUILD falla en `pnpm check:brand` si NODE_ENV=production.
   */
  logoPath: "/sanitemplo/logo.svg",
  logoConfirmed: false,

  /**
   * TODO_CONFIRM #2 · Tokens de marca
   * Los hex de abajo están DERIVADOS del copy del sitio
   * ("loto y oro", "materiales nobles", "luz cálida"), no de su CSS.
   * Pedir a diseño los valores exactos y las tipografías reales.
   */
  tokensConfirmed: false,

  /**
   * TODO_CONFIRM #3 · Base del 33% al Fondo Reciprociudad
   * "gross"     → 33% de todo el ingreso. Equilibrio sube a 32 visitas/día.
   *               Mata los nodos rurales, que son los que el fondo debería servir.
   * "margin"    → 33% del margen de contribución. Alineado pero opaco:
   *               no se puede escribir en un panel.
   * "sponsorship" → 33% de cada peso de patrocinio. La visita paga la operación,
   *               el patrocinio es el extra. Equilibrio se queda en 15 visitas/día.
   *               ← RECOMENDADO. Es la única de las tres que se dice en una línea
   *                 y se audita en una línea.
   */
  fundBase: "sponsorship" as "gross" | "margin" | "sponsorship",
  fundBaseConfirmed: false,
} as const;

export function assertReadyForProduction(): string[] {
  const missing: string[] = [];
  if (!UNKNOWNS.logoConfirmed) missing.push("Logo SVG real de Sani Templo");
  if (!UNKNOWNS.tokensConfirmed) missing.push("Hex y tipografías exactas del sitio");
  if (!UNKNOWNS.fundBaseConfirmed) missing.push("Decisión de la base del 33% al fondo");
  if (!ECONOMICS.capexConfirmed) missing.push("Alcance del capex de $44,000 (¿incluye arte, altar, sanitario, kit?)");
  if (!ECONOMICS.opexConfirmed) missing.push("Costos reales de operación (5 renglones)");
  if (!LEGAL.acDonataria.verified) missing.push("Verificar que la A.C. es donataria autorizada vigente ante el SAT");
  return missing;
}

/* ═══════════════════════════════════════════════════════════
   2 · MARCA — ancestral futurista, no cyberpunk
   ═══════════════════════════════════════════════════════════ */

export const TOKENS = {
  color: {
    tinta:    "#0E0C09", // fondo · negro cálido, nunca azulado
    tinta2:   "#17140F",
    tinta3:   "#221E17",
    linea:    "#342E22",
    linea2:   "#463D2C",
    oro:      "#C9A227", // el acento. Se gana, no se reparte
    oro2:     "#E8D08A", // luz sobre oro
    oroDim:   "#7A6520",
    loto:     "#C98A93", // solo para alertas y lo que no se puede decir
    jade:     "#7BA57F", // impacto verificado. Nunca decorativo
    cal:      "#F5F1E6", // texto
    calDim:   "#9C9482",
  },
  font: {
    display: '"Marcellus", serif',        // inscripcional. Interletrado abierto, peso único
    body:    '"Karla", sans-serif',       // 300 por defecto. El templo no grita
    mono:    '"JetBrains Mono", monospace' // solo cifras. La cifra es sagrada aparte
  },
  /** Dirección de arte. Leer antes de tocar un pixel.
   *  ANCESTRAL FUTURISTA = el templo renderizado en luz, no en neón.
   *  - El oro es luz reflejada, no relleno plano. Siempre gradiente o línea.
   *  - El loto es línea, nunca silueta. Se dibuja, no se estampa.
   *  - Volumétrica cálida sobre obsidiana. Cero glow morado. Cero glassmorphism.
   *  - Un solo momento de asombro: entrar al templo. Todo lo demás es quieto.
   *  - Si parece Blade Runner, está mal. Si parece un códice iluminado
   *    proyectado en 2090, está bien.
   */
  motion: {
    entryMs: 1400,   // la cámara cruza la puerta. Una vez, al scroll.
    easeSacred: "cubic-bezier(0.16, 1, 0.3, 1)",
  }
} as const;

/* ═══════════════════════════════════════════════════════════
   3 · GEOMETRÍA — medidas reales del proveedor, en cm
   ═══════════════════════════════════════════════════════════ */

export const GEOMETRY_CM = {
  posterior:  { w: 232, h: 183, qty: 1 },
  lateral:    { w: 115, h: 183, qty: 2 },
  frente:     { w: 56,  h: 183, qty: 2 },
  central:    { w: 108, h: 172.5, qty: 2 },
  puertaExt:  { w: 60,  h: 156, qty: 2 },
  puertaInt:  { w: 58,  h: 156, qty: 2 },
} as const;

/** metros, para Three.js */
export const UNIT_M = { W: 2.32, D: 1.15, H: 1.83 } as const;

/* ═══════════════════════════════════════════════════════════
   4 · INVENTARIO — dos rieles, nunca mezclados
   ═══════════════════════════════════════════════════════════
   RIEL A = exterior + interior comercial. Logo, CTA, campaña.
            Factura BrandMark. CFDI de publicidad. IVA 16%.
   RIEL B = interior sagrado. Nombre grabado. Sin logo, sin CTA.
            Factura la A.C. CFDI de donativo.

   La regla de una línea: afuera se anuncia, adentro se agradece.
   Un espacio NUNCA cambia de riel. Si un cliente quiere ambos,
   son dos órdenes, dos CFDI y dos superficies.
   ═══════════════════════════════════════════════════════════ */

export type Riel = "A" | "B";
export type Zona = "exterior" | "interior";

export interface Space {
  id: string;
  name: string;
  zona: Zona;
  riel: Riel;
  qty: number;
  /** MXN por templo por mes, tarifa lista */
  price: number;
  cm?: [number, number];
  /** true = no se vende jamás */
  sacred?: boolean;
  why: string;
}

export const SPACES: Space[] = [
  // ── EXTERIOR · Riel A ──────────────────────────────────
  { id: "sol",     name: "Sol",     zona: "exterior", riel: "A", qty: 1, price: 6000, cm: [232, 46],
    why: "Banda posterior full-width. Exclusivo: un solo patrocinador por templo." },
  { id: "loto",    name: "Loto",    zona: "exterior", riel: "A", qty: 2, price: 3500, cm: [108, 172.5],
    why: "1.86 m². Un mupi mide 2.16 m². Es el mismo objeto a la mitad de precio." },
  { id: "luna",    name: "Luna",    zona: "exterior", riel: "A", qty: 2, price: 1200, cm: [115, 40],
    why: "Banda lateral, visible en la aproximación." },
  { id: "milpa",   name: "Milpa",   zona: "exterior", riel: "A", qty: 2, price: 600,  cm: [56, 40],
    why: "Banda frontal, junto al tótem." },
  { id: "semilla", name: "Semilla", zona: "exterior", riel: "A", qty: 2, price: 400,  cm: [60, 25],
    why: "Banda de la puerta exterior." },

  // ── INTERIOR · Riel A ──────────────────────────────────
  { id: "aroma",   name: "Aroma",   zona: "interior", riel: "A", qty: 1, price: 3500,
    why: "Sin superficie: la esencia de la unidad. Sensorial, exclusivo, sin comparable en OOH mexicano. Nadie más lo está vendiendo." },
  { id: "repisa",  name: "Repisa",  zona: "interior", riel: "A", qty: 1, price: 2200, cm: [40, 12],
    why: "No es el anuncio del producto. Es el producto. Prueba real, no impresión." },
  { id: "espejo",  name: "Marco de espejo", zona: "interior", riel: "A", qty: 1, price: 1400, cm: [50, 8],
    why: "El único momento en que alguien se mira a sí mismo." },
  { id: "raiz",    name: "Raíz",    zona: "interior", riel: "A", qty: 2, price: 900,  cm: [58, 20],
    why: "Puerta interior. 60 a 90 segundos de atención cautiva sin competencia visual." },
  { id: "cta",     name: "CTA ritual", zona: "interior", riel: "A", qty: 1, price: 1800,
    why: "QR con destino por nodo y por fecha. El impreso se hace una vez y se revende infinitas veces." },

  // ── INTERIOR · Riel B ──────────────────────────────────
  { id: "placa",   name: "Placa de gratitud", zona: "interior", riel: "B", qty: 4, price: 0, cm: [20, 6],
    why: "Nombre grabado junto al altar. Sin logo, sin CTA, sin mensaje. Eso es exactamente lo que la hace deducible." },

  // ── NO SE VENDE ────────────────────────────────────────
  { id: "altar",   name: "Altar",   zona: "interior", riel: "B", qty: 1, price: 0, sacred: true,
    why: "Si el altar se vende, no queda templo que patrocinar." },
];

export const SELLOUT = {
  exterior: 17400, // A
  interior: 10700, // A
  total:    28100, // A
};

/* ═══════════════════════════════════════════════════════════
   5 · ECONOMÍA
   ═══════════════════════════════════════════════════════════ */

export const ECONOMICS = {
  /** El precio de la visita NO SE NEGOCIA. Nunca. Con nadie.
   *  Un gobierno y una familia artesana pagan lo mismo por una visita digna.
   *  Lo que se negocia es la presencia. */
  visitPriceMxn: 11,

  /** TODO_CONFIRM · ¿los 44k incluyen arte impreso, estructura,
   *  sanitario desviador, altar y kit de arranque? ¿O es solo fabricación? */
  capexMxn: 44000,
  capexLifeMonths: 48,
  capexConfirmed: false,

  /** TODO_CONFIRM · cada renglón es estimado mío, ninguno es tuyo */
  opexMonthly: {
    mantenimiento: 1800, // 2 visitas/semana
    composta:       600, // retiro y manejo
    insumos:        700, // aserrín, papel, productos eco, incienso, agua de flor
    piso:           500, // permiso / anfitrión. 0 en evento con host
    seguroTelemetria: 180,
  },
  opexConfirmed: false,

  fundPct:      0.33, // Fondo Reciprociudad
  brandmarkPct: 0.12, // operador local, sobre presencia
  flowbondPct:  0.08, // tecnología, sobre bruto
  ivaPct:       0.16,

  /** impacto, por templo por mes */
  litrosMes:   18000,
  compostaKgMes:  15,
} as const;

export const OPEX_TOTAL = Object.values(ECONOMICS.opexMonthly).reduce((a, b) => a + b, 0); // 3780
export const CAPEX_MONTHLY = ECONOMICS.capexMxn / ECONOMICS.capexLifeMonths;               // 917
export const DIRECT_COST_MONTHLY = OPEX_TOTAL + CAPEX_MONTHLY;                             // 4697

/** El titular. 15 visitas al día y el templo se pagó solo. */
export const BREAKEVEN_VISITS_MONTH = Math.ceil(DIRECT_COST_MONTHLY / ECONOMICS.visitPriceMxn); // 428
export const BREAKEVEN_VISITS_DAY = Math.ceil(BREAKEVEN_VISITS_MONTH / 30);                     // 15

/* ═══════════════════════════════════════════════════════════
   6 · DESCUENTOS — solo sobre presencia, jamás sobre la visita
   ═══════════════════════════════════════════════════════════ */

export const VOLUME_TIERS = [
  { max: 2,        f: 1.00, label: "1–2" },
  { max: 5,        f: 0.94, label: "3–5" },
  { max: 11,       f: 0.90, label: "6–11" },
  { max: 19,       f: 0.86, label: "12–19" },
  { max: 49,       f: 0.82, label: "20–49" },
  { max: 99,       f: 0.78, label: "50–99" },
  { max: 249,      f: 0.74, label: "100–249" },
  { max: 499,      f: 0.70, label: "250–499" },
  { max: 999,      f: 0.66, label: "500–999" },
  { max: Infinity, f: 0.62, label: "1000+" },
] as const;

export const PERIODS = [
  { id: "d1",  label: "1 día",     mult: 0.22, months: 1 / 30 },
  { id: "d5",  label: "3–5 días",  mult: 0.45, months: 5 / 30, tag: "festival" },
  { id: "c14", label: "Catorcena", mult: 0.60, months: 14 / 30, tag: "unidad OOH" },
  { id: "d15", label: "15 días",   mult: 0.62, months: 0.5 },
  { id: "m1",  label: "30 días",   mult: 1.00, months: 1 },
  { id: "d90", label: "90 días",   mult: 0.90, months: 3 },
  { id: "m6",  label: "6 meses",   mult: 0.80, months: 6 },
  { id: "m12", label: "12 meses",  mult: 0.70, months: 12 },
  { id: "m24", label: "24 meses",  mult: 0.65, months: 24 },
] as const;

/** Tomar los 10 espacios de riel A de un templo */
export const PACK_BUNDLE = 0.70;

/** Piso duro de presencia por templo/mes. Ninguna negociación lo cruza. */
export const PRESENCE_FLOOR = 4200;

export const COST_CURVE = [
  { max: 5,        c: DIRECT_COST_MONTHLY },
  { max: 19,       c: DIRECT_COST_MONTHLY * 0.94 },
  { max: 49,       c: DIRECT_COST_MONTHLY * 0.88 },
  { max: 99,       c: DIRECT_COST_MONTHLY * 0.83 },
  { max: Infinity, c: DIRECT_COST_MONTHLY * 0.78 },
] as const;

/* ═══════════════════════════════════════════════════════════
   7 · PERFILES — un solo SKU, siete puertas de entrada
   ═══════════════════════════════════════════════════════════ */

export interface Profile {
  id: string; name: string; blurb: string;
  visits: number; nodes: number; periodId: string;
  riel: Riel; spaces: string[]; perVisitBasis?: "persona";
}

export const PROFILES: Profile[] = [
  { id: "fiesta", name: "Fiesta del pueblo", blurb: "La feria patronal, 15 días, un templo.",
    visits: 500, nodes: 1, periodId: "d15", riel: "B", spaces: ["placa"] },
  { id: "artesana", name: "Familia artesana", blurb: "Un taller que sostiene su calle.",
    visits: 300, nodes: 1, periodId: "m1", riel: "B", spaces: ["placa"] },
  { id: "festival", name: "Festival", blurb: "Tres días, aforo alto, marca completa.",
    visits: 9000, nodes: 1, periodId: "d5", riel: "A",
    spaces: ["sol", "loto", "luna", "milpa", "semilla", "aroma", "repisa", "espejo", "raiz", "cta"] },
  { id: "equipo", name: "Beneficio de equipo", blurb: "Visitas dignas como prestación. Se renueva solo.",
    visits: 40, nodes: 3, periodId: "m12", riel: "A", spaces: ["raiz", "cta"], perVisitBasis: "persona" },
  { id: "campana", name: "Campaña localizada", blurb: "90 días, tres nodos, destino distinto en cada uno.",
    visits: 6000, nodes: 3, periodId: "d90", riel: "A", spaces: ["loto", "cta", "luna"] },
  { id: "institucional", name: "Institucional / gobierno", blurb: "Cobertura de red, informe auditable.",
    visits: 100000, nodes: 20, periodId: "m12", riel: "A",
    spaces: ["sol", "loto", "luna", "milpa", "semilla", "aroma", "repisa", "espejo", "raiz", "cta"] },
  { id: "padrino", name: "Padrino de templo", blurb: "Un templo entero, un año, tu nombre.",
    visits: 24000, nodes: 1, periodId: "m12", riel: "A",
    spaces: ["sol", "loto", "luna", "milpa", "semilla", "aroma", "repisa", "espejo", "raiz", "cta"] },
];

/* ═══════════════════════════════════════════════════════════
   8 · LEGAL — lo que el sistema tiene prohibido dejar pasar
   ═══════════════════════════════════════════════════════════ */

export const LEGAL = {
  acDonataria: {
    /** TODO_CONFIRM · ¿Más Amor A.C. es donataria autorizada VIGENTE?
     *  Verificar en el padrón del SAT. Sin esto el Riel B no existe.
     *  Si no lo es: lanzar solo con Riel A. No anunciar B. */
    razonSocial: "TODO_CONFIRM",
    rfc: "TODO_CONFIRM",
    verified: false,
    /** Si es false, el checkout oculta el Riel B por completo.
     *  No lo muestra "próximamente". Lo oculta. */
  },

  /** Frases que el sistema RECHAZA en cualquier campo de campaña,
   *  arte o copy de patrocinador. No es exceso de cautela:
   *  la claim recae sobre el patrocinador, y por eso su legal mata el deal. */
  forbiddenClaims: [
    "carbono neutral", "carbon neutral", "carbono-neutral",
    "compensado", "compensada", "offset", "huella cero",
    "cero emisiones", "net zero", "climáticamente neutral",
  ],

  /** Lo que SÍ se puede decir, con cifra y auditoría */
  allowedClaims: [
    "litros de agua no usados",
    "kilos de residuo desviados a compostaje",
    "visitas dignas financiadas",
    "templos sostenidos",
  ],

  /** Riel B: el sistema rechaza logo, imagen y CTA. Solo texto plano. */
  rielBAllows: { logo: false, cta: false, imagen: false, textoLibre: false, soloNombre: true },

  disclaimer:
    "No hay créditos de carbono emitidos ni verificados. El claim de origen se reserva sin costo, " +
    "sin cantidad prometida y sin fecha. Metodología y registro pendientes de definir.",
} as const;

/* ═══════════════════════════════════════════════════════════
   9 · NODOS — la red crece por nodos, no por ciudades
   ═══════════════════════════════════════════════════════════
   TODO_CONFIRM · split_local_pct está en null a propósito.
   No está definido qué gana el nodo local.
   Si el nodo no gana, no hay red: hay una flota.
   Esto importa más que el onchain.
   ═══════════════════════════════════════════════════════════ */

export type NodeStatus = "abierto" | "apertura" | "solicitud";

export interface Node {
  id: string; num: string; name: string; status: NodeStatus;
  capacity: number; lat: number; lng: number;
  splitLocalPct: number | null; // TODO_CONFIRM
}

export const NODES: Node[] = [
  { id: "cdmx",  num: "001", name: "Ciudad de México", status: "abierto",   capacity: 400, lat: 19.4326, lng: -99.1332, splitLocalPct: null },
  { id: "xochi", num: "002", name: "Xochimilco",       status: "abierto",   capacity: 180, lat: 19.2571, lng: -99.1035, splitLocalPct: null },
  { id: "vdb",   num: "003", name: "Valle de Bravo",   status: "abierto",   capacity: 40,  lat: 19.1953, lng: -100.1310, splitLocalPct: null },
  { id: "tulum", num: "004", name: "Tulum",            status: "abierto",   capacity: 120, lat: 20.2114, lng: -87.4654, splitLocalPct: null },
  { id: "oax",   num: "005", name: "Oaxaca",           status: "apertura",  capacity: 80,  lat: 17.0732, lng: -96.7266, splitLocalPct: null },
  { id: "gdl",   num: "006", name: "Guadalajara",      status: "apertura",  capacity: 150, lat: 20.6597, lng: -103.3496, splitLocalPct: null },
  { id: "mer",   num: "007", name: "Mérida",           status: "apertura",  capacity: 90,  lat: 20.9674, lng: -89.5926, splitLocalPct: null },
  { id: "mty",   num: "008", name: "Monterrey",        status: "solicitud", capacity: 100, lat: 25.6866, lng: -100.3161, splitLocalPct: null },
];

/* ═══════════════════════════════════════════════════════════
   10.5 · COMPARATIVA OOH — el ticket mínimo de mobiliario urbano
   ═══════════════════════════════════════════════════════════
   El argumento de venta: un panel compite contra un mupi y pierde por aforo.
   "Visitas dignas medidas" no compite contra nada. Estas cifras son el piso
   típico del mobiliario urbano; viven aquí, no en el componente. */

export const OOH_BENCHMARK = {
  label: "Mobiliario urbano · 20 caras",
  mensualMxn: 150000, // ticket mínimo típico por circuito
  caras: 20,
  m2: 43,
  medicion: false, // sin aforo auditado: cero visitas medidas
} as const;

/* ═══════════════════════════════════════════════════════════
   10 · ONCHAIN — la respuesta honesta
   ═══════════════════════════════════════════════════════════ */

export const ONCHAIN = {
  /** Lo único que vale hoy: el ancla del ledger y la atestación de gratitud. */
  v1: {
    impactMerkleRoot: { enabled: false, note: "Publicar el root por periodo. La data vive en Postgres. Centavos, verificable, sin ataduras." },
    gratitudeAttestation: { enabled: false, note: "Soulbound, no transferible, no mueve dinero, no promete rendimiento. Encaja con MUSE." },
  },
  /** Todo lo demás es ceremonia cara. */
  roadmap: {
    fundVoting: "Off-chain en FBID. El peso del voto no está diseñado. Poner onchain una gobernanza sin diseñar solo la vuelve inmutablemente mala. Diseñar, correr 3 rondas, después anclar.",
    carbonCredits: "Sin fecha. Registro y metodología sin definir.",
    payments: "Off-chain. Se necesita CFDI y deducibilidad. Onchain no da ninguno de los dos.",
  },
} as const;
