import { NextResponse } from 'next/server'
import { login, COOKIE } from '@/lib/auth'

export async function POST(req: Request) {
  const { username, password } = await req.json()
  const token = await login(username, password)

  if (!token) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
