import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser client (schema: grantflow). Read-only on the public catalog. */
export const browserClient = () => createBrowserClient(URL, KEY, { db: { schema: 'grantflow' } });
