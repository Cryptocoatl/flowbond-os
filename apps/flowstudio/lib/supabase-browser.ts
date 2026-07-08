'use client';
import { createBrowserClient } from '@supabase/ssr';

/** Browser client — carries the FBID session set by /auth/callback. */
export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
