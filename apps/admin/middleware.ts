import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// FG-058: never fall back to a static string — an absent AUTH_SECRET must
// deny access, not accept forged tokens signed with a well-known literal.
const _rawSecret = process.env.AUTH_SECRET
const SECRET = _rawSecret ? new TextEncoder().encode(_rawSecret) : null

const PUBLIC = ['/login', '/api/auth/login', '/api/public']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next()

  if (!SECRET) return NextResponse.redirect(new URL('/login', req.url))

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
