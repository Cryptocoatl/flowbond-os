/* TEP · Tu Estratega Patrimonial — single source of copy.
 *
 * INTEGRITY RULE FOR THIS FILE
 * Anything the firm has not confirmed in writing is modelled as a `Pendiente`,
 * never as prose. A `Pendiente` renders as a visible slot, so an unanswered
 * question looks unanswered instead of looking like a claim. Do not "fill in"
 * a Pendiente to make a section feel finished — that is how a marketing site
 * ends up asserting a regulatory status the firm does not hold.
 *
 * Open inputs are tracked in docs/PENDIENTES.md (BUILD_PROMPT §9).
 */

export type Pendiente = {
  readonly pendiente: true;
  /** What we asked the firm for. Shown in the slot while unresolved. */
  readonly solicitado: string;
  /** Why it is blocked / who owns the answer. */
  readonly nota: string;
};

export const pendiente = (solicitado: string, nota: string): Pendiente => ({
  pendiente: true,
  solicitado,
  nota,
});

export const esPendiente = (v: unknown): v is Pendiente =>
  typeof v === 'object' && v !== null && (v as Pendiente).pendiente === true;

/** Flip to true only when every §9 input is signed off by the firm. */
export const LISTO_PARA_INDEXAR = false;

/* Los slots de Pendiente son una superficie de revisión INTERNA. En staging
 * (tep-site.pages.dev) se muestran para que la firma vea qué falta; en el
 * dominio del cliente no, porque un recuadro "Bloqueante · pendiente de la
 * firma" en tuestratega.mx es andamio editorial a la vista del público.
 *
 * false = página reducida: el dato que falta simplemente no se publica. La
 * diferencia con "rellenar el hueco" es total — seguimos sin afirmar nada que
 * la firma no haya confirmado; sólo dejamos de anunciar el hueco.
 * Volver a true reactiva la vista de revisión sin tocar ningún componente. */
export const MOSTRAR_PENDIENTES = false;

export const sitio = {
  nombre: 'Tu Estratega Patrimonial',
  siglas: 'TEP',
  tesis: 'El patrimonio no se acumula. Se estructura.',
  descripcion:
    'Estructuración patrimonial para familias y empresas que ya construyeron el capital y ahora deben trasladarlo intacto a la siguiente generación.',
  url: 'https://tuestratega.mx',
};

/* Perfiles reales de la firma, confirmados por Steph (2026-07-16). Son enlaces
 * verificados, no Pendientes: apuntan a cuentas que existen. El admin/dashboard
 * de LinkedIn queda fuera a propósito — es una URL privada de gestión, no un
 * perfil público. */
export const redes = [
  {
    red: 'Instagram',
    handle: '@tuestrategapatrimoniall',
    url: 'https://www.instagram.com/tuestrategapatrimoniall',
  },
  {
    red: 'LinkedIn',
    handle: 'Tu Estratega Patrimonial',
    url: 'https://www.linkedin.com/company/109884786',
  },
] as const;

/* ---- Acto 1 · Hero ------------------------------------------------------- */

export const hero = {
  meta: 'Estructuración patrimonial · México',
  titulo: 'El patrimonio no se acumula.',
  tituloAcento: 'Se estructura.',
  lede: 'Los patrimonios rara vez se pierden en el mercado. Se pierden en el traspaso.',
  cta: 'Solicitar conversación',
};

/* ---- Acto 2 · La tesis --------------------------------------------------- */

/** Una cifra sólo existe aquí acompañada de su fuente. El tipo lo obliga. */
export type Ancla = { readonly cifra: string; readonly fuente: string };

export const tesis: {
  meta: string;
  titulo: string;
  cuerpo: readonly string[];
  anclaDato: Ancla | Pendiente;
} = {
  meta: 'La tesis',
  titulo: 'La categoría se equivoca de pregunta.',
  cuerpo: [
    'La industria financiera dedica su talento a una sola pregunta: cómo hacer crecer el capital. Es la pregunta correcta durante la fase de acumulación, y es la pregunta equivocada después.',
    'Porque el patrimonio que se pierde casi nunca se pierde en una caída del mercado. Se pierde en un traspaso mal estructurado: una sucesión sin instrucciones, una empresa familiar sin protocolo, un activo a nombre de quien no debía, un impuesto que nadie anticipó, una firma que faltó.',
    'Un rendimiento se recupera. Un traspaso mal hecho, no. Por eso no medimos nuestro trabajo en puntos base, sino en la integridad de lo que llega al otro lado.',
  ],
  // El BUILD_PROMPT §2 pide una cifra ancla. La firma aún no la respalda,
  // y una cifra inventada en un sitio de asesoría patrimonial es un pasivo,
  // no un recurso creativo. Se queda como slot hasta que llegue con fuente.
  anclaDato: pendiente(
    'Cifra citable con fuente verificable (p. ej. % de patrimonios familiares que se erosionan en la transición generacional en México).',
    'Debe llegar con fuente publicada y respaldo de la firma. Sin fuente, el Acto 2 se publica sin cifra.',
  ),
};

/* ---- Acto 3 · El método -------------------------------------------------- */

export const metodo = {
  meta: 'El método',
  titulo: 'Cuatro actos. Un entregable cada uno.',
  lede: 'No vendemos un producto financiero. Producimos documentos que sobreviven a sus autores.',
  fases: [
    {
      nombre: 'Levantamiento',
      entregable: 'Mapa patrimonial',
      cuerpo:
        'Todo lo que existe, dónde existe y a nombre de quién. Activos, vehículos, sociedades, seguros, deudas, jurisdicciones. Sin excepciones cómodas: el levantamiento sirve exactamente en la medida en que es completo.',
    },
    {
      nombre: 'Puntos de fractura',
      entregable: 'Dictamen de riesgo de traspaso',
      cuerpo:
        'Dónde se rompe el patrimonio si algo pasa mañana. Titularidades cruzadas, sucesiones sin instrucción, dependencias de una sola persona, contingencias fiscales, activos ilíquidos frente a obligaciones líquidas.',
    },
    {
      nombre: 'Estructura',
      entregable: 'Arquitectura patrimonial documentada',
      cuerpo:
        'La forma que corrige las fracturas: vehículos, protocolos, órdenes de sucesión, reglas de gobierno. Se diseña con sus abogados y contadores, no en lugar de ellos.',
    },
    {
      nombre: 'Vigencia',
      entregable: 'Revisión periódica con bitácora',
      cuerpo:
        'Una estructura no revisada envejece hasta volverse un riesgo. La vigencia es el acto que la mantiene viva: cambia la ley, cambia la familia, cambia la empresa; la estructura se ajusta y queda constancia.',
    },
  ],
};

/* ---- Acto 4 · Registro y facultades -------------------------------------- */

/* BLOQUEANTE (§9). Hasta que la firma confirme por escrito su figura legal y
 * su situación ante CNBV/AMIB —validada por SU abogado, no por nosotros— este
 * acto NO puede afirmar nada. `estado: 'sin-confirmar'` publica la única frase
 * honesta disponible: que el dato se entrega por escrito en la conversación.
 * Nosotros maquetamos; el claim legal lo redacta y firma la firma. */
export const facultades = {
  meta: 'Registro y facultades',
  titulo: 'Lo que sí somos, por escrito.',
  estado: 'sin-confirmar' as 'sin-confirmar' | 'confirmado',
  cuerpoSinConfirmar: [
    'Un estratega patrimonial no es un asesor en inversiones, y la diferencia no es semántica: define qué puede y qué no puede hacer legalmente por usted.',
    'Nuestra figura legal, nuestro alcance y los registros que ostentamos se le entregan por escrito al inicio de cualquier conversación, antes de que usted comparta un solo dato de su patrimonio. Si alguien en esta industria no le da ese documento sin que se lo pida, esa es su respuesta.',
  ],
  claimRegulatorio: pendiente(
    'Figura legal exacta + situación ante CNBV / AMIB (registrado sí o no, con número si aplica), redactada y validada por el abogado de la firma.',
    'BLOQUEANTE. Sin esto no se publica ninguna afirmación de registro ni la palabra "asesoría en inversiones", y schema.org FinancialService queda desactivado.',
  ),
};

/* ---- Acto 5 · Los estrategas --------------------------------------------- */

/* Nombres confirmados por la firma. Trayectorias y retratos, no. Inventar una
 * bio aquí sería fabricar credenciales de una persona real. */
export type Bio = { readonly texto: string };
export type Retrato = { readonly src: string };
export type Socio = {
  readonly nombre: string;
  readonly bio: Bio | Pendiente;
  readonly retrato: Retrato | Pendiente;
  /** Perfil público real, si la persona lo tiene. Opcional: sólo se muestra si existe. */
  readonly linkedin?: string;
};

export const estrategas: {
  meta: string;
  titulo: string;
  lede: string;
  socios: readonly Socio[];
} = {
  meta: 'El estratega',
  titulo: 'Sin equipo de ventas detrás.',
  lede: 'Usted habla con quien hace el trabajo. No hay un ejecutivo de cuenta intermediando.',
  // José Luis Vallejo se retira hasta que la firma envíe su información (2026-07-16).
  // El diseño ya soporta 1 o N socios; volver a agregarlo es añadir un objeto aquí.
  socios: [
    {
      nombre: 'Luis Ricardo Escobar O.',
      // Perfil confirmado por Steph (2026-07-16). Director de la firma.
      linkedin: 'https://www.linkedin.com/in/luis-ricardo-escobar-o-55173174',
      bio: pendiente(
        'Trayectoria real: formación, años de ejercicio, especialidad dentro de la estructuración patrimonial.',
        'La redacta la firma. No se inventa ni se infiere. (El perfil de LinkedIn no es scrapeable; la bio la pega la firma o Steph.)',
      ),
      // Retrato real entregado por Steph (2026-07-16): recorte de foto de campaña
      // "16° Aniversario", upscale bytedance a 2K. El Acto 5 le aplica B/N por CSS.
      retrato: { src: '/media/socios/luis-ricardo-escobar.jpg' },
    },
  ],
};

/* ---- Acto 6 · Criterio de admisión --------------------------------------- */

export const criterio = {
  meta: 'Criterio de admisión',
  titulo: 'No trabajamos con todos. Aquí está el criterio.',
  lede: 'Publicarlo nos ahorra tiempo a los dos. Léalo antes de escribirnos.',
  si: {
    titulo: 'Trabajamos con usted si',
    puntos: [
      'Ya construyó el patrimonio. Nuestro trabajo empieza donde termina la acumulación.',
      'Hay algo que trasladar: una empresa, activos, una familia con más de una generación involucrada.',
      'Acepta que el levantamiento es completo o no sirve, incluso en las partes incómodas.',
      'Quiere una estructura documentada, no una corazonada.',
      'Tiene abogado y contador, o está dispuesto a tenerlos. Trabajamos con ellos.',
    ],
  },
  no: {
    titulo: 'No somos para usted si',
    puntos: [
      'Busca rendimientos. Hay muy buena gente para eso y no somos nosotros.',
      'Quiere una recomendación de compra o venta de instrumentos.',
      'Necesita liquidez inmediata: eso es un problema de tesorería, no de estructura.',
      'Prefiere que la estructura no quede por escrito.',
      'Espera que optimicemos impuestos por fuera de la ley. No es una postura moral: es que no funciona.',
    ],
  },
  promesa:
    'Si no es candidato, se lo decimos por escrito — y le sugerimos a quién acudir.',
};

/* ---- Acto 7 · Solicitud -------------------------------------------------- */

/* Los value deben coincidir con el CHECK de tep_submit_lead en la migración
 * 20260715_tep_leads.sql. Cambiar uno sin el otro rompe el envío. */
export const MOTIVOS = [
  { value: 'sucesion', label: 'Una sucesión que no está resuelta' },
  { value: 'estructura', label: 'Estructurar un patrimonio ya construido' },
  { value: 'venta', label: 'La venta o traspaso de una empresa' },
  { value: 'segunda-opinion', label: 'Una segunda opinión sobre una estructura existente' },
  { value: 'otro', label: 'Otro' },
] as const;

/* Sin aviso de privacidad firmado no se captura un solo dato personal desde
 * este sitio: el Acto 7 cierra con un mailto, no con un formulario. Un correo
 * que la persona envía desde su propio cliente no es captura de datos por
 * nuestra parte, y además aterriza en una bandeja que alguien lee — cosa que
 * tep_submit_lead nunca tuvo (inserta en tep_leads y nadie recibe aviso).
 *
 * `correo` es el único dato que falta para publicar el acto. Debe ser un buzón
 * REAL y MONITOREADO del dominio (tuestratega.mx corre Google Workspace).
 * Adivinar la dirección = solicitudes que rebotan en silencio, que es peor que
 * no tener cierre. Mientras sea Pendiente, el acto se publica sin CTA. */
export const solicitud: {
  meta: string;
  titulo: string;
  lede: string;
  promesa: string;
  asunto: string;
  correo: string | Pendiente;
  privacidad: Pendiente;
} = {
  meta: 'Solicitud',
  titulo: 'Solicitar conversación',
  lede: 'Escríbanos directamente. Lo lee quien hace el trabajo, no un sistema.',
  promesa: 'Respondemos en 48 horas hábiles. Siempre. Incluso para decir que no.',
  asunto: 'Solicitud de conversación — tuestratega.mx',
  correo: pendiente(
    'Dirección de correo real y monitoreada para recibir solicitudes (buzón de Google Workspace del dominio).',
    'BLOQUEANTE para publicar el cierre. La entrega la firma; no se infiere ni se adivina.',
  ),
  privacidad: pendiente(
    'Aviso de privacidad conforme a la LFPDPPP, redactado y firmado por la firma.',
    'Sigue pendiente, pero ya no bloquea: sin formulario no hay captura de datos personales desde el sitio. Vuelve a ser bloqueante el día que se reactive tep_submit_lead.',
  ),
};
