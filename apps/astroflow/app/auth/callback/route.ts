import { type NextRequest } from 'next/server';
import { handleAuthCallback } from '@flowbond/auth/server';

export const dynamic = 'force-dynamic';

// Receives the session back from the FBID hub. The shared handler covers both
// landing shapes (?code= from magic link/OAuth, ?token_hash= from the hub
// handoff), then calls activate_app('astroflow') to register the connection.
export async function GET(request: NextRequest) {
  return handleAuthCallback({
    request,
    slug: 'astroflow',
    defaultNext: '/',
    loginPath: '/auth/login',
  });
}
