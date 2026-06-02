import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser/client-component client (schema: astroflow). Client-safe — no next/headers. */
export const browserClient = () => createBrowserClient(URL, KEY, { db: { schema: 'astroflow' } });
