import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE;

/** True when the server has the canonical project + a service-role key wired. */
export const hasServiceRole = Boolean(URL && SERVICE);

/**
 * Service-role client — SERVER-ONLY. Scoped to the `reciprociudad` schema.
 *
 * Used by the FBID join route to invoke `SECURITY DEFINER` RPCs. The service
 * key must never reach the client; callers live exclusively under app/api.
 * Canonical project: fgsrcxxccdjqyrpkitmk (the only Layer-0 root).
 */
export function dbAdmin() {
  if (!URL || !SERVICE) {
    throw new Error('Supabase service-role env not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE).');
  }
  return createClient(URL, SERVICE, {
    db: { schema: 'reciprociudad' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
