import { handleAuthCallback } from '@flowbond/auth/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// FBID magic-link callback. The shared handler establishes the session on this
// domain and calls activate_app('banoseco') — the canonical path that bootstraps
// the flowbond_users identity AND registers the app connection in one step.
// (Replaces the old manual link_auth_or_create_identity + banoseco_connect.)
export async function GET(req: NextRequest) {
  return handleAuthCallback({ request: req, slug: 'banoseco', defaultNext: '/', loginPath: '/login' });
}
