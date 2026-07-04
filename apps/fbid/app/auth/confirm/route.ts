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
  const redirect = url.searchParams.get('redirect')

  // redirect MUST be an allowlisted callback (open-redirect guard).
  if (!tokenHash || !redirect || !isAllowedRedirect(redirect)) {
    return NextResponse.redirect(`${url.origin}/?error=bad_confirm`)
  }

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
