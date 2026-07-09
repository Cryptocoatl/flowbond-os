// FBID (FlowBond Layer 0) wrappers.
//
// The @flowbond/sdk client is still a stub (methods land in a later sprint), so
// — exactly like apps/grantflow — identity runs on Supabase magic-link per app,
// and the canonical flowbond_users row is bootstrapped server-side by the
// public.link_auth_or_create_identity() RPC on the auth callback.
import { browserClient } from './supabase/client';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '');

/** Send a magic link (per-app, no token relay) for the given email. */
export async function sendMagicLink(email: string, next = '/') {
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
