import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Server-component / route-handler client (reads & sets auth cookies; schema: astroflow). */
export async function serverClient() {
  const store = await cookies();
  return createServerClient(URL, KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component — safe to ignore, middleware refreshes */
        }
      },
    },
    db: { schema: 'astroflow' },
  });
}
