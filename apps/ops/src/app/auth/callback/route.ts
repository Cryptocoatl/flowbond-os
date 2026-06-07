import { type NextRequest } from 'next/server'
import { handleAuthCallback } from '@flowbond/auth/server'

export const dynamic = 'force-dynamic'

// Receives the session back from the FBID hub (handles ?code= and ?token_hash=),
// then registers the connection via activate_app('ops').
export async function GET(request: NextRequest) {
  return handleAuthCallback({
    request,
    slug: 'ops',
    defaultNext: '/dashboard',
    loginPath: '/login',
  })
}
