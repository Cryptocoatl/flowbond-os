import { NextResponse, type NextRequest } from 'next/server'
import { isAllowedRedirect } from '@flowbond/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * The cross-domain handoff. After a user authenticates AT the hub (password /
 * OAuth / passkey / wallet — anything that leaves a session on fbid's domain),
 * this mints a one-time magic-link token and redirects to the originating app's
 * callback, which redeems it with verifyOtp() to get a session on ITS domain.
 *
 *   GET /api/handoff?app=<slug>&redirect=<allowlisted app callback>
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const redirect = url.searchParams.get('redirect')
  const app = url.searchParams.get('app') ?? ''

  // SECURITY: only ever hand a token to a known, exact callback.
  if (!isAllowedRedirect(redirect)) {
    return NextResponse.redirect(`${url.origin}/?error=bad_redirect`)
  }

  // Must have a hub session to hand off.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    const back = new URL('/', url.origin)
    if (app) back.searchParams.set('app', app)
    back.searchParams.set('redirect', redirect!)
    return NextResponse.redirect(back.toString())
  }

  // Seamless SSO: mint a single-use token (no email) and hand it to the app.
  // If the service role isn't configured (or minting fails), DON'T error — fall
  // back to a normal magic-link login for that app so the card is always clickable.
  const appLogin = new URL('/', url.origin)
  if (app) appLogin.searchParams.set('app', app)
  appLogin.searchParams.set('redirect', redirect!)

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('service_role_unset')
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
    })
    if (error || !data?.properties?.hashed_token) {
      throw new Error(error?.message ?? 'no_token')
    }
    const target = new URL(redirect!)
    target.searchParams.set('token_hash', data.properties.hashed_token)
    target.searchParams.set('type', 'magiclink')
    if (app) target.searchParams.set('app', app)
    return NextResponse.redirect(target.toString())
  } catch (e) {
    console.error('[fbid/handoff] falling back to app login:', (e as Error).message)
    return NextResponse.redirect(appLogin.toString())
  }
}
