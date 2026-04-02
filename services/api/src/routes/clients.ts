import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb, schema } from '@flowbond/db'
import { eq } from 'drizzle-orm'
import type { ApiResponse } from '@flowbond/core'

export const clientsRouter = new Hono()

const createClientSchema = z.object({
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(256),
  domain: z.string().url(),
})

clientsRouter.get('/', async (c) => {
  const db = getDb()
  const clients = await db.select().from(schema.clients)
  return c.json<ApiResponse>({ success: true, data: clients })
})

clientsRouter.get('/:slug', async (c) => {
  const db = getDb()
  const { slug } = c.req.param()
  const [client] = await db.select().from(schema.clients).where(eq(schema.clients.slug, slug))

  if (!client) {
    return c.json<ApiResponse>({ success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } }, 404)
  }

  return c.json<ApiResponse>({ success: true, data: client })
})

clientsRouter.post('/', zValidator('json', createClientSchema), async (c) => {
  const db = getDb()
  const body = c.req.valid('json')
  const [client] = await db.insert(schema.clients).values(body).returning()
  return c.json<ApiResponse>({ success: true, data: client }, 201)
})

clientsRouter.delete('/:slug', async (c) => {
  const db = getDb()
  const { slug } = c.req.param()
  await db.delete(schema.clients).where(eq(schema.clients.slug, slug))
  return c.json<ApiResponse>({ success: true })
})
