import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// BAÑOSECO is mobile-first and mostly public (the map and codex need no login).
// Middleware only refreshes the FBID session cookie so guardian RPCs keep
// working as users walk the city. No route is gated here.
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
  await sb.auth.getUser();
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.svg|.*\\.png).*)'],
};
