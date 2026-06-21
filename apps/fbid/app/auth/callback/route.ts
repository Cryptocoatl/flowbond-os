import { NextResponse, type NextRequest } from 'next/server'
import { isAllowedRedirect } from '@flowbond/auth'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Canonical callback per app slug. Lets the magic-link email carry ONLY the
// slug (a clean, single query param that survives Supabase's template/encoding
// untouched) instead of a full app-callback URL nested inside emailRedirectTo.
// The hub resolves the destination here, server-side.
const APP_CALLBACKS: Record<string, string> = {
  flowme: 'https://flowme.one/auth/callback',
  astroflow: 'https://astro.flowbond.life/auth/callback',
  flowgarden: 'https://flowgarden.life/auth/callback',
  danz: 'https://danz-now.vercel.app/auth/callback',
  flowbond: 'https://flowbond.life/api/auth/callback',
  ops: 'https://dev.flowbond.life/auth/callback',
  flow3: 'https://studio.flowme.one/auth/callback',
  claudia: 'https://claudiaflow.life/auth/callback',
  grantflow: 'https://grants.claudiaflow.life/auth/callback',
}

/**
 * The hub's OWN callback. Establishes a session ON fbid's domain, then:
 *   • HUB LOGIN (no external `app`/`redirect`) → land on the FBID dashboard ("/").
 *   • APP HANDOFF (OAuth/recovery that left a session here) → /api/handoff to the app.
 *
 * Accepts both landing shapes:
 *   ?token_hash=…&type=…   (magic link via the /auth/confirm forwarder)
 *   ?code=…                (OAuth / PKCE)
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = (url.searchParams.get('type') as EmailOtpType | null) ?? 'magiclink'
  const app = url.searchParams.get('app') ?? ''
  // Prefer an explicit redirect, else resolve the app's canonical callback from
  // the slug. This is what lets app-mode magic links carry only `?app=<slug>`.
  const redirect = url.searchParams.get('redirect') ?? (app ? APP_CALLBACKS[app] ?? null : null)
  const next = url.searchParams.get('next')

  const supabase = await createClient()

  let failed = false
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    failed = !!error
    if (error) console.error('[fbid/callback] verifyOtp', error.message)
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    failed = !!error
    if (error) console.error('[fbid/callback] exchangeCodeForSession', error.message)
  } else {
    failed = true
    console.error('[fbid/callback] missing code and token_hash')
  }
  if (failed) {
    return NextResponse.redirect(`${url.origin}/?error=auth_failed`)
  }

  // Password recovery → set a password first, still on the hub. Triggered by the
  // explicit ?next=/auth/set-password (PKCE ?code recovery) OR a token_hash of
  // type=recovery via the forwarder. Works with or without a waiting app.
  if (next === '/auth/set-password' || (tokenHash && type === 'recovery')) {
    const sp = new URL('/auth/set-password', url.origin)
    if (app) sp.searchParams.set('app', app)
    if (isAllowedRedirect(redirect)) sp.searchParams.set('redirect', redirect!)
    return NextResponse.redirect(sp.toString())
  }

  // An external app is waiting → hand the session off to it. (OAuth-at-hub flow)
  if (app && app !== 'fbid' && isAllowedRedirect(redirect)) {
    const handoff = new URL('/api/handoff', url.origin)
    handoff.searchParams.set('app', app)
    handoff.searchParams.set('redirect', redirect!)
    return NextResponse.redirect(handoff.toString())
  }

  // HUB LOGIN → the FBID dashboard. `next` must be a local path (open-redirect guard).
  const dest = next && next.startsWith('/') ? next : '/'
  return NextResponse.redirect(`${url.origin}${dest}`)
}
