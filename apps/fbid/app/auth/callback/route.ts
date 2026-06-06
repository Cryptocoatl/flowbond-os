import { NextResponse, type NextRequest } from 'next/server'
import { isAllowedRedirect } from '@flowbond/auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * The hub's OWN callback — where OAuth and password-recovery flows land (on
 * fbid's domain). It establishes the hub session, then either sends the user to
 * set a password, or hands off to the originating app via /api/handoff.
 *
 *   GET /auth/callback?code=...&app=<slug>&redirect=<app callback>[&next=/auth/set-password]
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const redirect = url.searchParams.get('redirect')
  const app = url.searchParams.get('app') ?? ''
  const next = url.searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(`${url.origin}/?error=missing_code`)
  }
  if (!isAllowedRedirect(redirect)) {
    return NextResponse.redirect(`${url.origin}/?error=bad_redirect`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[fbid/callback] exchangeCodeForSession', error.message)
    return NextResponse.redirect(`${url.origin}/?error=auth_failed`)
  }

  // Recovery flow → let the user set a password first, still on the hub.
  if (next === '/auth/set-password') {
    const sp = new URL('/auth/set-password', url.origin)
    if (app) sp.searchParams.set('app', app)
    sp.searchParams.set('redirect', redirect!)
    return NextResponse.redirect(sp.toString())
  }

  // Otherwise hand the session off to the originating app.
  const handoff = new URL('/api/handoff', url.origin)
  if (app) handoff.searchParams.set('app', app)
  handoff.searchParams.set('redirect', redirect!)
  return NextResponse.redirect(handoff.toString())
}
