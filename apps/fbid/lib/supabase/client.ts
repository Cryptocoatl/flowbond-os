'use client'

import { createBrowserClient } from '@supabase/ssr'

// Schema-agnostic browser client — the hub only touches auth, never app schemas.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
