import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Receives the session back from the FBID hub (fbid.flowbond.life).
 *
 * Handles both landing shapes the hub produces:
 *   • ?code=…                       PKCE (magic link / OAuth)
 *   • ?token_hash=…&type=magiclink  the hub's cross-domain handoff
 *
 * Establishes the Supabase session as cookies on reciprociudad.lat (so the
 * /team browser client + RLS see auth.uid()), registers the app connection,
 * then returns the user to ?next (default /team).
 *
 * Mirrors @flowbond/auth's handleAuthCallback — inlined because the slim
 * reciprociudad-app branch doesn't ship the shared package.
 */
const SLUG = 'reciprociudad';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = (url.searchParams.get('type') as EmailOtpType | null) ?? 'magiclink';
  const nextParam = url.searchParams.get('next') ?? '/team';
  // open-redirect guard: only ever land on a local path.
  const next = nextParam.startsWith('/') ? nextParam : '/team';

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* read-only context — ignore */
          }
        },
      },
    },
  );

  let failed = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = !!error;
    if (error) console.error('[reciprociudad/callback] exchangeCodeForSession', error.message);
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    failed = !!error;
    if (error) console.error('[reciprociudad/callback] verifyOtp', error.message);
  } else {
    failed = true;
    console.error('[reciprociudad/callback] missing code and token_hash');
  }

  if (failed) {
    return NextResponse.redirect(`${origin}/team?error=auth_failed`);
  }

  // Register the FBID app connection. Idempotent; never block login if it fails
  // (e.g. the slug isn't yet in activate_app's CHECK list).
  try {
    await supabase.rpc('activate_app', { p_app_slug: SLUG });
  } catch (e) {
    console.error('[reciprociudad/callback] activate_app failed', e);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
