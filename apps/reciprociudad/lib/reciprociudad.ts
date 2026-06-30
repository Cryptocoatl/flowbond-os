import { dbAdmin } from './supabase-server';
import type { Iniciativa, Evento, Servicio } from './types';

/**
 * Typed data layer for the `reciprociudad` schema (Pattern A: own tables with
 * an FK to `public.flowbond_users`, read through `SECURITY DEFINER` RPCs).
 *
 * These are the wiring points for when the migration in
 * `supabase/migrations/0001_reciprociudad.sql` is applied. They are written but
 * NOT yet used by the UI — the page renders the placeholder constants from
 * `lib/data.ts`. To go live, point the section components at these functions.
 *
 * The RPC names below (`reciprociudad_*`) are defined in the migration. We use
 * RPCs (not direct table selects) so the public surface only ever returns
 * published rows, regardless of RLS evolution.
 */

/** Capture a join lead and return its id. Server-only (service role). */
export async function captureJoin(email: string, flow: string): Promise<string> {
  const sb = dbAdmin();
  const { data, error } = await sb.rpc('reciprociudad_join', {
    p_email: email,
    p_flow: flow,
  });
  if (error) throw error;
  // The RPC returns the join row id (uuid).
  return data as string;
}

// ── Published catalog reads (TODO: enable once schema is applied) ───────────
// Each maps a published row to the UI types in lib/types.ts.

export async function getIniciativas(): Promise<Iniciativa[]> {
  const sb = dbAdmin();
  const { data, error } = await sb.rpc('reciprociudad_iniciativas_published');
  if (error) throw error;
  return (data ?? []) as Iniciativa[];
}

export async function getEventos(): Promise<Evento[]> {
  const sb = dbAdmin();
  const { data, error } = await sb.rpc('reciprociudad_eventos_published');
  if (error) throw error;
  return (data ?? []) as Evento[];
}

export async function getServicios(): Promise<Servicio[]> {
  const sb = dbAdmin();
  const { data, error } = await sb.rpc('reciprociudad_servicios_published');
  if (error) throw error;
  return (data ?? []) as Servicio[];
}
