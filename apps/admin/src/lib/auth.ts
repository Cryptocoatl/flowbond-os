import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET env var is required — set it in Vercel before deploying')
}
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET)

const COOKIE = 'mtt_session'
const ADMIN_USER = 'Admin'
const ADMIN_PASS = 'MTTadmin2026'

export async function signToken(payload: { user: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload
  } catch {
    return null
  }
}

export async function getSession() {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function login(username: string, password: string) {
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return signToken({ user: username })
  }
  return null
}

export { COOKIE }
