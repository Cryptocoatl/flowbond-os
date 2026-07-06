import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC = ['/login', '/api/auth/login', '/api/public']

export async function middleware(req: NextRequest) {
  const authSecret = process.env.AUTH_SECRET
  if (!authSecret) {
    return new NextResponse('Server misconfiguration: AUTH_SECRET is not set', { status: 500 })
  }
  const SECRET = new TextEncoder().encode(authSecret)

  const { pathname } = req.nextUrl

  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get('mtt_session')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete('mtt_session')
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
