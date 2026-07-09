import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client on the canonical public schema (banoseco_* lives in public).
// Reads are RLS-guarded; all writes go through SECURITY DEFINER RPCs.
export const browserClient = () => createBrowserClient(URL, KEY);
