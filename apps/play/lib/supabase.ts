import { createBrowserClient } from '@supabase/ssr';

// Canonical project fgsrcxxccdjqyrpkitmk. Anon key only on the client; every
// write goes through a SECURITY DEFINER RPC, never a direct table mutation.
export function browserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase env not configured');
  return createBrowserClient(url, anon);
}
