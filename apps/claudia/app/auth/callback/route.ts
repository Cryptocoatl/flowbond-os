import { type NextRequest } from 'next/server';
import { handleAuthCallback } from '@flowbond/auth/server';

export const dynamic = 'force-dynamic';

// Receives the session back from the FBID hub (?code= or ?token_hash=), then
// registers ClaudIA as a connected app for this FBID. One identity, every surface.
export async function GET(request: NextRequest) {
  return handleAuthCallback({
    request,
    slug: 'claudia',
    defaultNext: '/',
    loginPath: '/',
  });
}
