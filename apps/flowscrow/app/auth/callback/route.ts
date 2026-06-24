import { handleAuthCallback } from '@flowbond/auth/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// FBID callback. The shared handler establishes the session on this domain and
// calls activate_app('flowscrow') — bootstrapping the flowbond_users identity AND
// registering the app connection in one step. flowscrow_claim_party() then links
// the user to their seeded party slot on first dashboard load.
export async function GET(req: NextRequest) {
  return handleAuthCallback({
    request: req,
    slug: 'flowscrow',
    defaultNext: '/dashboard',
    loginPath: '/login',
  });
}
