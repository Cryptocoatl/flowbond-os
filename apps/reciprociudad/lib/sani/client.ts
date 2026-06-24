'use client';

import { createClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client for the Sani Templo ops console (/team).
 *
 * Scoped to the `sani` schema so `.rpc()` reaches the SECURITY DEFINER
 * functions that enforce role/grants in the database. The anon key is a
 * public credential by design — every privileged path is gated server-side
 * in Postgres against auth.uid(), so the browser cannot escalate.
 *
 * Session persists in localStorage; magic-link hashes are auto-detected so a
 * clicked email link lands an authenticated session on /team.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const saniConfigured = Boolean(URL && ANON);

function make() {
  return createClient(URL, ANON, {
    db: { schema: 'sani' },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
}

type SaniClient = ReturnType<typeof make>;
let _client: SaniClient | null = null;

export function saniClient(): SaniClient {
  if (!_client) _client = make();
  return _client;
}
