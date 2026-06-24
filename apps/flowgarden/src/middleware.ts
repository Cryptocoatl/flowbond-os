import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Public routes — always allow
  if (
    pathname === '/' ||
    // Marketing landing (the app's clean-URL move relocated it here from /);
    // must be reachable logged-out — it's where unauthenticated visitors land.
    pathname === '/welcome' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/debug') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    // PWA: service worker, offline shell, icons + manifest must be reachable
    // without auth or the app can't be installed.
    pathname === '/sw.js' ||
    pathname === '/offline' ||
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/logos')
  ) {
    return supabaseResponse
  }

  // Require auth for everything else
  if (!user) {
    const url = new URL('/auth/login', request.url)
    url.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|ico|svg|jpg|jpeg|webp|webmanifest)$).*)'],
}
