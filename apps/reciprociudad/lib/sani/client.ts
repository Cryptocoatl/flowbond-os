'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client for the Sani Templo ops console (/team).
 *
 * Cookie-based session (via @supabase/ssr) so it shares the exact session the
 * FBID-hub handoff establishes in /auth/callback (server-side cookies) — the
 * browser reads the same cookie jar, so `.rpc()` carries the user's JWT and the
 * SECURITY DEFINER functions see auth.uid().
 *
 * Scoped to the `sani` schema. The anon key is a public credential by design —
 * every privileged path is gated in Postgres against auth.uid()/role, so the
 * browser cannot escalate.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const saniConfigured = Boolean(URL && ANON);

function make() {
  return createBrowserClient(URL, ANON, {
    db: { schema: 'sani' },
  });
}

type SaniClient = ReturnType<typeof make>;
let _client: SaniClient | null = null;

export function saniClient(): SaniClient {
  if (!_client) _client = make();
  return _client;
}
