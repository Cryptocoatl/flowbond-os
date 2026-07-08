import { handleAuthCallback } from '@flowbond/auth/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// FBID magic-link callback. The shared handler establishes the session on this
// domain and calls activate_app('flowstudio') — bootstrapping the flowbond_users
// identity AND registering the app connection in one step.
export async function GET(req: NextRequest) {
  return handleAuthCallback({ request: req, slug: 'flowstudio', defaultNext: '/me', loginPath: '/auth/login' });
}
