import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cookie-bound client for reading the FBID session in RSC / route handlers. */
export async function authClient() {
  const store = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component — middleware refreshes the session instead */
        }
      },
    },
  });
}

/** Stateless anon client for public reads in server code (no cookies needed). */
export const dbRead = () =>
  createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/**
 * Service-role client — server-only, bypasses RLS. Used by trusted backend
 * routes (AI mission engine, FlowBond credits bridge) to call privileged RPCs
 * like banoseco_open_mission and fc_earn. NEVER import from client code.
 */
export const dbAdmin = () =>
  createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
