// SERVER-ONLY — never import this from a Client Component or expose to the browser.
// The service role key bypasses Row Level Security. Handle with care.
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
