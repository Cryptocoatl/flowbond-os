import { Hono }        from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z }          from 'zod'
import { getDb, schema } from '@flowbond/db'
import { eq }         from 'drizzle-orm'
import type { ApiResponse } from '@flowbond/core'

export const floweditSitesRouter = new Hono()

const createSiteSchema = z.object({
  slug:         z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
  name:         z.string().min(1).max(256),
  domain:       z.string().optional(),
  approvalMode: z.enum(['auto', 'review', 'admin_only']).default('review'),
})

const updateSiteSchema = createSiteSchema.partial()

floweditSitesRouter.get('/', async (c) => {
  const db    = getDb()
  const sites = await db.select().from(schema.floweditSites)
  return c.json<ApiResponse>({ success: true, data: sites })
})

floweditSitesRouter.get('/:slug', async (c) => {
  const db   = getDb()
  const { slug } = c.req.param()
  const [site]   = await db.select().from(schema.floweditSites).where(eq(schema.floweditSites.slug, slug))

  if (!site) {
    return c.json<ApiResponse>({ success: false, error: { code: 'NOT_FOUND', message: 'Site not found' } }, 404)
  }

  return c.json<ApiResponse>({ success: true, data: site })
})

floweditSitesRouter.post('/', zValidator('json', createSiteSchema), async (c) => {
  const db   = getDb()
  const body = c.req.valid('json')
  const [site] = await db.insert(schema.floweditSites).values(body).returning()
  return c.json<ApiResponse>({ success: true, data: site }, 201)
})

floweditSitesRouter.patch('/:slug', zValidator('json', updateSiteSchema), async (c) => {
  const db   = getDb()
  const { slug } = c.req.param()
  const body     = c.req.valid('json')

  const [site] = await db
    .update(schema.floweditSites)
    .set(body)
    .where(eq(schema.floweditSites.slug, slug))
    .returning()

  if (!site) {
    return c.json<ApiResponse>({ success: false, error: { code: 'NOT_FOUND', message: 'Site not found' } }, 404)
  }

  return c.json<ApiResponse>({ success: true, data: site })
})

floweditSitesRouter.delete('/:slug', async (c) => {
  const db   = getDb()
  const { slug } = c.req.param()
  await db.delete(schema.floweditSites).where(eq(schema.floweditSites.slug, slug))
  return c.json<ApiResponse>({ success: true })
})
