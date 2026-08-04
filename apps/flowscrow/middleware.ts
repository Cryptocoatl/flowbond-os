import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// The vault (root) + documents are public — entry is the in-app 4-digit code gate,
// not a Supabase session. Only the FBID escrow dashboard requires a login.
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  // Read inside the handler: on Cloudflare Workers module scope is evaluated at
  // isolate boot, before the request env exists, and an empty client here made
  // the gate throw instead of redirecting to /login.
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  // Only the escrow dashboard is gated; the vault and everything else is public.
  matcher: ['/dashboard/:path*'],
};
