// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · the Empire roster  (lib/claudia/empire.ts)
//
//  The map of FlowBond worlds ClaudIA can organize for you. Each entry is a
//  real app with a stable `slug` — that slug is what gets written into
//  public.flowbond_grants when you "connect" the app (migration 0002), so the
//  grant spine and this catalog speak the same language.
//
//  This file is PUBLIC metadata only — names, taglines, live URLs. No secrets,
//  no private content. ClaudIA shows it to her sovereign; the connect action is
//  what actually grants access through the gated RPCs.
// ════════════════════════════════════════════════════════════════════════

export type Accent = 'gold' | 'teal' | 'coral' | 'moon';
export type AppStatus = 'live' | 'building';

export interface EmpireApp {
  slug: string;        // = flowbond_grants.app_slug
  name: string;
  tagline: string;
  emoji: string;
  url: string | null;  // live surface, or null if not yet public
  status: AppStatus;
  accent: Accent;
  realm: 'identity' | 'community' | 'commerce' | 'creation' | 'land';
}

export const ACCENT_HEX: Record<Accent, string> = {
  gold: '#FFD27A',
  teal: '#2FB6A8',
  coral: '#FF8A6B',
  moon: '#F4F1EA',
};

export const REALM_LABEL: Record<EmpireApp['realm'], string> = {
  identity: 'Identidad',
  community: 'Comunidad',
  commerce: 'Comercio',
  creation: 'Creación',
  land: 'Tierra',
};

// The empire, curated — live worlds first within each realm.
export const EMPIRE: EmpireApp[] = [
  // ── Identity (Layer 0) ──────────────────────────────────────────────────
  { slug: 'flowbond', name: 'FlowBond', tagline: 'Layer 0 · una identidad, todos los mundos', emoji: '🔵', url: 'https://flowbond.life', status: 'live', accent: 'teal', realm: 'identity' },
  { slug: 'fbid', name: 'FBID', tagline: 'Hub de identidad · un login para el imperio', emoji: '🪪', url: 'https://fbid.flowbond.life', status: 'live', accent: 'teal', realm: 'identity' },
  { slug: 'flowme', name: 'FlowMe', tagline: 'Perfiles soberanos · tu mundo en una página', emoji: '✦', url: 'https://flowme.one', status: 'live', accent: 'gold', realm: 'identity' },
  { slug: 'origo', name: 'ORIGO', tagline: 'Prueba de humanidad · registro vivo', emoji: '🔏', url: 'https://origo.flowme.one', status: 'live', accent: 'moon', realm: 'identity' },
  { slug: 'claudia', name: 'ClaudIA', tagline: 'La Guardiana · zero-knowledge', emoji: '👑', url: 'https://claudiaflow.life', status: 'live', accent: 'gold', realm: 'identity' },

  // ── Community / nations ─────────────────────────────────────────────────
  { slug: 'flownation', name: 'FlowNation', tagline: 'Red de ciudades FlowBond', emoji: '🌎', url: 'https://flownation.world', status: 'live', accent: 'teal', realm: 'community' },
  { slug: 'moonchurch', name: 'Moon Temple', tagline: 'Tulum · templo y comunidad', emoji: '🌙', url: 'https://moonchurch.space', status: 'live', accent: 'moon', realm: 'community' },
  { slug: 'reciprociudad', name: 'Reciprociudad', tagline: 'Red de reciprocidad · CDMX', emoji: '🌿', url: 'https://reciprociudad.vercel.app', status: 'live', accent: 'teal', realm: 'community' },
  { slug: 'danz', name: 'DANZ.NOW', tagline: 'Pistas de baile en tiempo real', emoji: '💃', url: 'https://danz-now.vercel.app', status: 'live', accent: 'coral', realm: 'community' },

  // ── Commerce ────────────────────────────────────────────────────────────
  { slug: 'mountaindogs', name: 'Mountain Dogs', tagline: 'Paseadores · cuidado con amor', emoji: '🐕', url: 'https://mountaindogs.app', status: 'live', accent: 'gold', realm: 'commerce' },
  { slug: 'brandmark', name: 'BrandMark', tagline: 'Estudio de productos promocionales', emoji: '🎨', url: 'https://brandmark.click', status: 'live', accent: 'coral', realm: 'commerce' },
  { slug: 'refirides', name: 'RefiRides', tagline: 'Movilidad · cabina cinematográfica', emoji: '🚗', url: 'https://refirides-sigma.vercel.app', status: 'live', accent: 'teal', realm: 'commerce' },
  { slug: 'flowshare', name: 'FlowShare', tagline: 'Split de pagos sin custodia', emoji: '🔗', url: null, status: 'building', accent: 'gold', realm: 'commerce' },
  { slug: 'grantflow', name: 'GrantFlow', tagline: 'Motor de fondos · grants → proyectos', emoji: '💸', url: null, status: 'building', accent: 'teal', realm: 'commerce' },

  // ── Creation / studio ───────────────────────────────────────────────────
  { slug: 'flow3', name: 'FLOW3', tagline: 'Estudio cósmico de creación', emoji: '🎬', url: 'https://video.flowme.one', status: 'live', accent: 'coral', realm: 'creation' },
  { slug: 'raiz', name: 'Raíz', tagline: 'Traducción viva · DeepL', emoji: '🌐', url: 'https://translate.flowme.one', status: 'live', accent: 'teal', realm: 'creation' },
  { slug: 'issa-codex', name: 'Issa Codex', tagline: 'Dew Testament · libro sagrado', emoji: '📖', url: 'https://lettheworldhearyourvoice.moonchurch.space', status: 'live', accent: 'moon', realm: 'creation' },
  { slug: 'xelva', name: 'Xelva', tagline: 'Gorillae OG · verificación on-chain', emoji: '🦍', url: 'https://xelva.live', status: 'live', accent: 'gold', realm: 'creation' },
  { slug: 'flowstudio', name: 'FlowStudio', tagline: 'Estudio de video · 3 niveles de privacidad', emoji: '🎥', url: null, status: 'building', accent: 'coral', realm: 'creation' },
  { slug: 'flowdesk', name: 'FlowDesk', tagline: 'Centro de comando de proyectos', emoji: '🗂️', url: null, status: 'building', accent: 'gold', realm: 'creation' },

  // ── Land / regeneration ─────────────────────────────────────────────────
  { slug: 'flowgarden', name: 'FlowGarden', tagline: 'Inteligencia de jardín', emoji: '🪴', url: null, status: 'building', accent: 'teal', realm: 'land' },
  { slug: 'banoseco', name: 'BAÑOSECO', tagline: 'Baños secos · juego solarpunk', emoji: '🚽', url: 'https://banoseco.vercel.app', status: 'live', accent: 'gold', realm: 'land' },
];

export const EMPIRE_BY_SLUG: Record<string, EmpireApp> = Object.fromEntries(
  EMPIRE.map((a) => [a.slug, a]),
);
