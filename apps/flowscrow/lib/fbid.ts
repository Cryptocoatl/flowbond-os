'use client';

// FBID (FlowBond Layer 0) sign-in. Magic-link per app; the canonical flowbond_users
// row + app connection are bootstrapped server-side by activate_app('flowscrow')
// on the auth callback (see app/auth/callback/route.ts).
import { browserClient } from './supabase/client';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '');

/** Send a magic link for the given email, returning to `next` after login. */
export async function sendMagicLink(email: string, next = '/dashboard') {
  const sb = browserClient();
  const redirect = `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;
  return sb.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: redirect },
  });
}

export async function signOut() {
  await browserClient().auth.signOut();
}
