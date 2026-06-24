import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client on the canonical public schema (flowscrow_* lives in public).
// Reads are RLS-guarded; every write goes through a SECURITY DEFINER RPC.
export const browserClient = () => createBrowserClient(URL, KEY);
