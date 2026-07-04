/**
 * Reciprociudad domain types.
 *
 * These mirror the planned `reciprociudad_*` tables (see
 * `supabase/migrations/0001_reciprociudad.sql`). Each row that a human owns
 * carries an `fbid` (FK → public.flowbond_users.id, the canonical Layer-0
 * identity). Reads happen through `SECURITY DEFINER` RPCs — never direct table
 * access — so the public surface only ever sees published rows.
 */

/** Kind of "chinampa" a card represents — drives the accent color. */
export type IniciativaKind =
  | 'tianguis'
  | 'chinampa'
  | 'tiempo'
  | 'cultura'
  | 'ciclo'
  | 'causas';

export interface Iniciativa {
  id: string;
  kind: IniciativaKind;
  /** Short label shown above the title (e.g. "Tianguis"). */
  k: string;
  title: string;
  description: string;
  /** Visual accent slot k1..k6, matching the .plot.kN CSS. */
  slot: 1 | 2 | 3 | 4 | 5 | 6;
  /** Owner identity (null for editorial/placeholder rows). */
  fbid?: string | null;
}

export interface Evento {
  id: string;
  title: string;
  description: string;
  startsAt: string; // ISO 8601
  location?: string | null;
  fbid?: string | null;
}

export interface Servicio {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  fbid?: string | null;
}

/** Contract for POST /api/fbid/link. */
export interface JoinRequest {
  email: string;
  app: string;
  flow: string;
}
export interface JoinResponse {
  ok: boolean;
  fbid: string | null;
}
