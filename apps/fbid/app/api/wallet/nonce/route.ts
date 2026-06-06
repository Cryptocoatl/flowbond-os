import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const NONCE_TTL_SECONDS = 300 // 5 minutes
const HUB_DOMAIN = 'fbid.flowbond.life'

// Issue a single-use nonce. Authority is server-side (public.fbid_auth_nonces);
// the httpOnly cookie additionally binds the nonce to this browser session.
export async function POST() {
  const nonce = crypto.randomUUID().replace(/-/g, '')

  const admin = createAdminClient()
  const { error } = await admin.from('fbid_auth_nonces').insert({ nonce })
  if (error) {
    console.error('[wallet/nonce] insert failed', error.message)
    return NextResponse.json({ error: 'nonce_failed' }, { status: 500 })
  }

  const store = await cookies()
  store.set('fbid_wallet_nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: NONCE_TTL_SECONDS,
  })
  return NextResponse.json({ nonce, domain: HUB_DOMAIN, ttl: NONCE_TTL_SECONDS })
}
