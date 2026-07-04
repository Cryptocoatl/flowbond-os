import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cookie-bound client carrying the caller's FBID session (RLS applies). */
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

/**
 * Service-role client — server-only, bypasses RLS. Used ONLY by trusted backend
 * routes (the DocuSign Connect webhook, which has no user session). Never import
 * from client code. Per spec, document/chain writes from untrusted callers still
 * flow through the role-enforced RPCs, not this client.
 */
export const dbAdmin = () =>
  createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
