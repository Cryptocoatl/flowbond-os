'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente de navegador para la superficie de patrocinio de Sani Templo.
 *
 * El esquema es `public` (las tablas son public.sanitemplo_*). Solo se usa para
 * los RPC PÚBLICOS: sanitemplo_submit_lead y sanitemplo_check_claim (ambos
 * granted a anon). Las mutaciones reales (crear orden, asignar, liquidar) NO
 * pasan por aquí — son service-role-only y viven en el Worker sanitemplo-api.
 * La anon key es pública por diseño; todo lo privilegiado está cerrado en Postgres.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Base del Worker sanitemplo-api. Si no está configurada, el checkout cae a lead. */
export const SANITEMPLO_API = process.env.NEXT_PUBLIC_SANITEMPLO_API ?? '';

export const sanitemploConfigured = Boolean(URL && ANON);

function make() {
  return createBrowserClient(URL, ANON); // esquema public por defecto
}

type Client = ReturnType<typeof make>;
let _client: Client | null = null;

export function sanitemploClient(): Client {
  if (!_client) _client = make();
  return _client;
}

/** Token JWT de la sesión actual (para llamar al Worker con identidad). null si no hay sesión. */
export async function sessionToken(): Promise<string | null> {
  if (!sanitemploConfigured) return null;
  const { data } = await sanitemploClient().auth.getSession();
  return data.session?.access_token ?? null;
}
