import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Issue a one-time nonce, stored in an httpOnly cookie, for wallet sign-in. */
export async function POST() {
  const nonce = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const store = await cookies()
  store.set('fg_wallet_nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 300, // 5 minutes
  })
  return NextResponse.json({ nonce })
}
