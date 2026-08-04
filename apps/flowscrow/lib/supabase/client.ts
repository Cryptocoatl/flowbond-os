import { createBrowserClient } from '@supabase/ssr';

// Browser client on the canonical public schema (flowscrow_* lives in public).
// Reads are RLS-guarded; every write goes through a SECURITY DEFINER RPC.
// The env reads sit inside the factory so this module stays safe to import from
// code that also renders on the server (see the note in ./server.ts).
export const browserClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
