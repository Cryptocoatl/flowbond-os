import type { MissionKind, NodeKind, OrgKind } from './types';

// ---- Rangos (derivados del XP total; sin columna en la DB) ----
export interface Rank {
  nm: string;
  ic: string;
  xp: number;
}

export const RANKS: Rank[] = [
  { nm: 'Semilla', ic: '🌱', xp: 0 },
  { nm: 'Brote', ic: '🌿', xp: 200 },
  { nm: 'Raíz', ic: '🪵', xp: 500 },
  { nm: 'Milpa', ic: '🌾', xp: 900 },
  { nm: 'Chinampa', ic: '🌽', xp: 1000 },
  { nm: 'Tlazoltéotl', ic: '🌀', xp: 2000 },
];

export function currentRank(xp: number): Rank {
  let r = RANKS[0];
  for (const x of RANKS) if (xp >= x.xp) r = x;
  return r;
}

export function nextRank(xp: number): Rank | undefined {
  return RANKS.find((x) => x.xp > xp);
}

/** Progress toward the next rank as { have, span, pct }. */
export function rankProgress(xp: number) {
  const r = currentRank(xp);
  const nx = nextRank(xp);
  if (!nx) return { have: 0, span: 0, pct: 100, max: true as const };
  const span = nx.xp - r.xp;
  const have = xp - r.xp;
  return { have, span, pct: Math.min(100, (have / span) * 100), max: false as const };
}

// ---- Economía ----
export const MXN_PER_ORO = 0.5; // 1 oro = $0.50 MXN (canje por bienes/servicios del ecosistema)

export const KIND_LABEL: Record<MissionKind, string> = {
  swap: 'Cambiar cubeta',
  clean: 'Limpieza',
  sanitize: 'Sanitizar',
  compost_dropoff: 'Llevar a composta',
};

// Cosmetic difficulty (1–3 rombos) — the schema has no difficulty column.
export const KIND_DIFFICULTY: Record<MissionKind, number> = {
  swap: 1,
  clean: 1,
  sanitize: 2,
  compost_dropoff: 3,
};

// Optional artifact loot, by kind. Null = no artifact.
export const KIND_ARTIFACT: Partial<Record<MissionKind, string>> = {
  compost_dropoff: 'Composta×1',
};

/** Minutes since an ISO timestamp (clamped at 0). */
export function minutesSince(iso: string | null): number {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

// ---- Energía (gate) ----
// El servidor (banoseco_claim_mission) descuenta energía siempre. Este flag de
// cliente solo controla la UX (mostrar/ocultar el chip y el pre-bloqueo).
export const ENERGY_GATE =
  (process.env.NEXT_PUBLIC_BANOSECO_ENERGY_GATE ?? 'on').toLowerCase() !== 'off';

export const ENERGY_FULL = 8;

// CDMX fallback center (Huerto Roma Verde) when geolocation is denied.
export const CDMX_CENTER = { lat: 19.4096, lng: -99.1615 };

// ---- Tipos de nodo (el mapa ya no es solo baños) ----
export const NODE_KIND_LABEL: Record<NodeKind, string> = {
  dry_toilet: 'Baño seco',
  recycling_center: 'Centro de reciclaje',
  compost_site: 'Sitio de composta',
  water_point: 'Punto de agua',
};

export const NODE_KIND_ICON: Record<NodeKind, string> = {
  dry_toilet: '🚽',
  recycling_center: '♻️',
  compost_site: '🌱',
  water_point: '💧',
};

export const NODE_KINDS: NodeKind[] = [
  'dry_toilet',
  'recycling_center',
  'compost_site',
  'water_point',
];

// ---- Tipos de organización ----
export const ORG_KIND_LABEL: Record<OrgKind, string> = {
  banos_secos: 'Baños secos',
  reciclaje: 'Reciclaje',
  composta: 'Composta',
  huerto: 'Huerto',
  colectivo: 'Colectivo',
  alcaldia: 'Alcaldía',
  other: 'Otra',
};

export const ORG_KINDS: OrgKind[] = [
  'banos_secos',
  'reciclaje',
  'composta',
  'huerto',
  'colectivo',
  'alcaldia',
  'other',
];
