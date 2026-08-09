// Magic-link forwarder. The email links here (same origin as the hub) carrying a
// token_hash; we hand that token_hash to the originating app's OWN callback, which
// redeems it with verifyOtp on its own domain. This is what makes magic link work
// CROSS-DOMAIN without PKCE (no code_verifier needed) and without the service role.
import { NextResponse, type NextRequest } from 'next/server'
import { isAllowedRedirect } from '@flowbond/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') ?? 'magiclink'
  // The first `redirect` is the destination. The email template interpolates
  // {{ .RedirectTo }} raw, so a destination that itself carried query params
  // (hub callback + ?app=… + a second `redirect=<app callback>`) splits into
  // additional top-level params here — thread them all through to the
  // destination so the hub callback can hand off to the app.
  const requested = url.searchParams.get('redirect')

  // The hub's OWN callback is the safety net. Supabase interpolates
  // {{ .RedirectTo }} as the Site URL — the hub ROOT — whenever the email was
  // requested with no `emailRedirectTo`, or with one that isn't in Supabase's
  // uri_allow_list. The root is not (and must not be) an allowlisted callback,
  // so the old guard answered `?error=bad_confirm` to a perfectly valid token:
  // a real user, a real email, and no way in. That is the single worst failure
  // this system can have, so it now degrades to signing them into the hub
  // instead of stranding them.
  const hubCallback = `${url.origin}/auth/callback`
  const sameOriginRoot = (raw: string) => {
    try {
      const u = new URL(raw)
      return u.origin === url.origin && (u.pathname === '/' || u.pathname === '')
    } catch {
      return false
    }
  }
  const wanted = requested && !sameOriginRoot(requested) ? requested : hubCallback

  // No token at all = nothing to redeem; that IS a broken link.
  if (!tokenHash) {
    return NextResponse.redirect(`${url.origin}/?error=bad_confirm`)
  }
  // Open-redirect guard: an unknown destination NEVER receives the token —
  // but the person still gets in, through the hub.
  const redirect = isAllowedRedirect(wanted) ? wanted : hubCallback

  const dest = new URL(redirect)
  let firstRedirectSkipped = false
  for (const [k, v] of url.searchParams.entries()) {
    if (k === 'token_hash' || k === 'type') continue
    if (k === 'redirect' && !firstRedirectSkipped) {
      firstRedirectSkipped = true // that's `dest` itself
      continue
    }
    dest.searchParams.set(k, v)
  }
  dest.searchParams.set('token_hash', tokenHash)
  dest.searchParams.set('type', type)
  return NextResponse.redirect(dest.toString())
}
