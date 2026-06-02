'use server'

import { createClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * Server Action backing the "Request access" form. Validates the email and adds
 * one row to the private `marketing.waitlist` table via the `public.join_waitlist`
 * SECURITY DEFINER RPC. The marketing schema is never exposed to the client, and
 * only the publishable anon key is used (no service key in any bundle). Duplicate
 * emails are de-duped server-side (ON CONFLICT DO NOTHING) and reported as success.
 */
export async function joinWaitlist(email: string): Promise<{ ok: boolean; message: string }> {
  const v = (email || '').trim()
  if (!EMAIL_RE.test(v)) {
    return { ok: false, message: 'Enter a valid email to request access.' }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { ok: false, message: 'Waitlist is warming up — please try again shortly.' }
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const { error } = await supabase.rpc('join_waitlist', { p_email: v })
    if (error) {
      return { ok: false, message: 'Something went wrong — please try again.' }
    }
    return { ok: true, message: `✦ Received — welcome to the engine. We'll be in touch at ${v}` }
  } catch {
    return { ok: false, message: 'Something went wrong — please try again.' }
  }
}
