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

  // Mint a single-use, short-lived token for THIS user (no email sent).
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
  })
  if (error || !data?.properties?.hashed_token) {
    console.error('[fbid/handoff] generateLink failed', error?.message)
    return NextResponse.redirect(`${url.origin}/?error=handoff_failed`)
  }

  // Append the token to the (already-validated) app callback and send the user home.
  const target = new URL(redirect!)
  target.searchParams.set('token_hash', data.properties.hashed_token)
  target.searchParams.set('type', 'magiclink')
  if (app) target.searchParams.set('app', app)

  return NextResponse.redirect(target.toString())
}
