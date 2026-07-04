import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Pages anyone may reach unauthenticated / un-entitled.
const OPEN = ['/login', '/request-access', '/auth/callback'];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const sb = createServerClient(URL, ANON, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await sb.auth.getUser();
  const path = req.nextUrl.pathname;
  const isOpen = OPEN.some((p) => path.startsWith(p));
  const redirect = (to: string) => {
    const url = req.nextUrl.clone();
    url.pathname = to;
    url.search = '';
    return NextResponse.redirect(url);
  };

  if (!user) return isOpen ? res : redirect('/login');

  // Signed in — is this FBID entitled?
  let entitled = false;
  if (user.email) {
    const admin = createClient(URL, SERVICE, {
      db: { schema: 'grantflow' },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await admin
      .from('access')
      .select('status')
      .eq('email', user.email.toLowerCase())
      .maybeSingle();
    entitled = !!data && data.status === 'active';
  }

  if (entitled) {
    if (path === '/login' || path.startsWith('/request-access')) return redirect('/claudia');
    return res;
  }
  // Signed in but not entitled → waitlist.
  return path.startsWith('/request-access') ? res : redirect('/request-access');
}

export const config = {
  matcher: [
    // everything except Next internals, static assets, and the API (which self-guards)
    '/((?!_next/static|_next/image|favicon.ico|api/|claudia-logo.png|claudia-identity.mp4|claudia-poster.jpg).*)',
  ],
};
