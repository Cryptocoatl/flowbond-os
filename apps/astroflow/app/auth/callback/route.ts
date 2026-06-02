import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

// Magic-link / password-reset landing. Exchanges the code for a session, wires
// the FlowBond identity (one auth.uid → one FBID), then continues to `next`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';

  const store = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => store.set(name, value, options)),
      },
      db: { schema: 'astroflow' },
    },
  );

  let ok = false;
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (token_hash && type) {
    const { error } = await sb.auth.verifyOtp({
      token_hash,
      type: type as 'magiclink' | 'email' | 'recovery' | 'invite',
    });
    ok = !error;
  }

  if (ok) {
    try {
      await sb.rpc('activate'); // ensure the caller's FBID row exists
    } catch {
      /* trigger already created it */
    }
    return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
