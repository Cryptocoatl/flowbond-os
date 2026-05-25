import { Hono }       from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z }          from 'zod'
import { hash }       from 'bcryptjs'
import { getDb, schema } from '@flowbond/db'
import { eq, and }    from 'drizzle-orm'
import { signToken }  from './flowedit-auth'
import type { ApiResponse } from '@flowbond/core'

export const floweditInviteRouter = new Hono()

const inviteSchema = z.object({
  email:  z.string().email(),
  name:   z.string().min(1),
  siteId: z.string().min(1),
  role:   z.enum(['viewer', 'editor', 'approver']).default('editor'),
})

/**
 * POST /api/v1/flowedit/auth/invite
 *
 * Creates (or retrieves) a floweditUser and adds them as a member of the given site.
 * Returns a one-time setup token the client uses to set their password.
 * Idempotent: calling again for an existing email returns a fresh token.
 */
floweditInviteRouter.post('/', zValidator('json', inviteSchema), async (c) => {
  const db   = getDb()
  const body = c.req.valid('json')

  // Verify site exists
  const [site] = await db
    .select({ id: schema.floweditSites.id, name: schema.floweditSites.name })
    .from(schema.floweditSites)
    .where(eq(schema.floweditSites.id, body.siteId))

  if (!site) {
    return c.json<ApiResponse>({ success: false, error: { code: 'NOT_FOUND', message: 'Site not found' } }, 404)
  }

  // Find or create user
  let [user] = await db
    .select()
    .from(schema.floweditUsers)
    .where(eq(schema.floweditUsers.email, body.email.toLowerCase().trim()))

  const tempPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)

  if (!user) {
    const passwordHash = await hash(tempPassword, 10)
    ;[user] = await db
      .insert(schema.floweditUsers)
      .values({ email: body.email.toLowerCase().trim(), name: body.name, passwordHash })
      .returning()
  }

  // Upsert site membership
  const [existing] = await db
    .select()
    .from(schema.floweditSiteMembers)
    .where(and(
      eq(schema.floweditSiteMembers.siteId, body.siteId),
      eq(schema.floweditSiteMembers.userId, user.id),
    ))

  if (!existing) {
    await db
      .insert(schema.floweditSiteMembers)
      .values({ siteId: body.siteId, userId: user.id, role: body.role })
  } else {
    await db
      .update(schema.floweditSiteMembers)
      .set({ role: body.role })
      .where(and(
        eq(schema.floweditSiteMembers.siteId, body.siteId),
        eq(schema.floweditSiteMembers.userId, user.id),
      ))
  }

  // Issue a short-lived setup token the client uses to authenticate on first login
  const setupToken = await signToken(user.id, user.email, user.name)

  return c.json<ApiResponse>({
    success: true,
    data: {
      user:        { id: user.id, email: user.email, name: user.name },
      site:        { id: site.id, name: site.name },
      role:        body.role,
      tempPassword: existing ? null : tempPassword,
      setupToken,
      isNewUser:   !existing,
    },
  }, 201)
})

/**
 * DELETE /api/v1/flowedit/auth/invite
 * Remove a member from a site.
 */
floweditInviteRouter.delete('/', zValidator('json', z.object({ userId: z.string(), siteId: z.string() })), async (c) => {
  const db   = getDb()
  const body = c.req.valid('json')

  await db
    .delete(schema.floweditSiteMembers)
    .where(and(
      eq(schema.floweditSiteMembers.siteId, body.siteId),
      eq(schema.floweditSiteMembers.userId, body.userId),
    ))

  return c.json<ApiResponse>({ success: true })
})
