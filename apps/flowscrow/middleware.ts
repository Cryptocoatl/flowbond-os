import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Routes reachable without a session.
const OPEN = ['/login', '/auth/callback'];

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

  const {
    data: { user },
  } = await sb.auth.getUser();

  const path = req.nextUrl.pathname;
  const isOpen = OPEN.some((p) => path === p || path.startsWith(p + '/'));

  if (!user && !isOpen) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = path === '/' ? '' : `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  // Run on everything except static assets and API routes (routes do their own auth).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|ico)$).*)'],
};
