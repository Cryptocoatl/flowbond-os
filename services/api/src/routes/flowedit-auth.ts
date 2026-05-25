import { Hono }        from 'hono'
import { zValidator }  from '@hono/zod-validator'
import { z }           from 'zod'
import { compare }     from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { getDb, schema } from '@flowbond/db'
import { eq, and }     from 'drizzle-orm'

const JWT_SECRET = new TextEncoder().encode(
  process.env.FLOWEDIT_JWT_SECRET ?? 'flowedit-dev-secret-change-in-prod'
)
const JWT_EXPIRY = '7d'

export async function signToken(userId: string, email: string, name: string) {
  return new SignJWT({ sub: userId, email, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload as { sub: string; email: string; name: string; iat: number; exp: number }
}

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
  siteId:   z.string().optional(),
})

export const floweditAuthRouter = new Hono()

// POST /api/v1/flowedit/auth/login
floweditAuthRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const db = getDb()
  const { email, password, siteId } = c.req.valid('json')

  const [user] = await db
    .select()
    .from(schema.floweditUsers)
    .where(eq(schema.floweditUsers.email, email.toLowerCase().trim()))
    .limit(1)

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const valid = await compare(password, user.passwordHash)
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  let role: string = 'admin'
  if (siteId) {
    const [membership] = await db
      .select()
      .from(schema.floweditSiteMembers)
      .where(and(
        eq(schema.floweditSiteMembers.siteId, siteId),
        eq(schema.floweditSiteMembers.userId, user.id),
      ))
      .limit(1)

    if (!membership) {
      return c.json({ error: 'Not a member of this site' }, 403)
    }
    role = membership.role
  }

  const token = await signToken(user.id, user.email, user.name)

  return c.json({
    token,
    user: {
      id:        user.id,
      email:     user.email,
      name:      user.name,
      avatarUrl: user.avatarUrl,
      role,
    },
  })
})

// GET /api/v1/flowedit/auth/me  (requires Bearer token)
floweditAuthRouter.get('/me', async (c) => {
  const db = getDb()
  const authHeader = c.req.header('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) return c.json({ error: 'No token' }, 401)

  try {
    const payload = await verifyToken(token)
    const [user]  = await db
      .select({
        id:        schema.floweditUsers.id,
        email:     schema.floweditUsers.email,
        name:      schema.floweditUsers.name,
        avatarUrl: schema.floweditUsers.avatarUrl,
      })
      .from(schema.floweditUsers)
      .where(eq(schema.floweditUsers.id, payload.sub))
      .limit(1)

    if (!user) return c.json({ error: 'User not found' }, 401)
    return c.json({ user })
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// GET /api/v1/flowedit/auth/site/:siteId/members
floweditAuthRouter.get('/site/:siteId/members', async (c) => {
  const db = getDb()
  const { siteId } = c.req.param()

  const members = await db
    .select({
      userId:    schema.floweditUsers.id,
      email:     schema.floweditUsers.email,
      name:      schema.floweditUsers.name,
      avatarUrl: schema.floweditUsers.avatarUrl,
      role:      schema.floweditSiteMembers.role,
    })
    .from(schema.floweditSiteMembers)
    .innerJoin(schema.floweditUsers, eq(schema.floweditSiteMembers.userId, schema.floweditUsers.id))
    .where(eq(schema.floweditSiteMembers.siteId, siteId))

  return c.json({ members })
})
