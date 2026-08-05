'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client (canonical FlowBond-life project, anon key) for the
 * public FBID passwordless login. Singleton so we never spin up multiple GoTrue
 * instances. The canonical project sends 8-digit CODE emails (no magic link),
 * so login = signInWithOtp → verifyOtp(type:'email') → activate_app('reciprociudad').
 */
let client: SupabaseClient | null = null;

export function browserClient(): SupabaseClient {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
