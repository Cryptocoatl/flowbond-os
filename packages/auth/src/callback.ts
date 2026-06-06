// Shared auth-callback handler for every FlowBond app.
// Handles BOTH landing shapes that the FBID flow produces:
//   • ?code=...                     (PKCE — magic link from email, OAuth)
//   • ?token_hash=...&type=magiclink (hub handoff for password/OAuth/wallet/passkey)
// On success it establishes the session cookies on THIS app's domain, registers
// the app connection via activate_app(slug), then redirects to `next`.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export interface CallbackOptions {
  request: NextRequest
  /** app slug passed to activate_app() — must be in the DB CHECK list */
  slug: string
  /** in-app path to land on if no ?next is provided (default '/') */
  defaultNext?: string
  /** where to send the user on failure (default '/login') */
  loginPath?: string
  /** override env detection if needed */
  supabaseUrl?: string
  supabaseKey?: string
}

export async function handleAuthCallback(opts: CallbackOptions): Promise<NextResponse> {
  const { request, slug, defaultNext = '/', loginPath = '/login' } = opts
  const url = new URL(request.url)
  const origin = url.origin

  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = (url.searchParams.get('type') as EmailOtpType | null) ?? 'magiclink'
  const nextParam = url.searchParams.get('next') ?? defaultNext
  // `next` must be a local path — never an absolute URL (open-redirect guard).
  const next = nextParam.startsWith('/') ? nextParam : defaultNext

  const cookieStore = await cookies()
  const supabase = createServerClient(
    opts.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    opts.supabaseKey ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            /* called from a read-only context — ignore */
          }
        },
      },
    },
  )

  let failed = false
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    failed = !!error
    if (error) console.error(`[${slug}/callback] exchangeCodeForSession`, error.message)
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    failed = !!error
    if (error) console.error(`[${slug}/callback] verifyOtp`, error.message)
  } else {
    failed = true
    console.error(`[${slug}/callback] missing code and token_hash`)
  }

  if (failed) {
    return NextResponse.redirect(`${origin}${loginPath}?error=auth_failed`)
  }

  // Link FBID identity + register this app's connection. Idempotent; never block
  // login if it fails (e.g. transient DB hiccup).
  try {
    await supabase.rpc('activate_app', { p_app_slug: slug })
  } catch (e) {
    console.error(`[${slug}/callback] activate_app failed`, e)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
