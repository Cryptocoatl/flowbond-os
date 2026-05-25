import { Hono }        from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z }          from 'zod'
import { getDb, schema } from '@flowbond/db'
import { eq, and }    from 'drizzle-orm'
import type { ApiResponse } from '@flowbond/core'
import { notifyNewDraft } from '../lib/notify'

export const floweditContentRouter = new Hono()

// ── Validation schemas ────────────────────────────────────────────────────────

const createOverrideSchema = z.object({
  path:            z.string().min(1),
  field:           z.enum(['text', 'src', 'href', 'alt', 'style']),
  value:           z.record(z.unknown()),
  tier:            z.enum(['simple', 'ai', 'agent']).default('simple'),
  changeNote:      z.string().optional(),
  changeRequestId: z.string().optional(),
})

const updateOverrideSchema = z.object({
  status:      z.enum(['draft', 'pending', 'approved', 'rejected', 'live']).optional(),
  value:       z.record(z.unknown()).optional(),
  changeNote:  z.string().optional(),
  approvedBy:  z.string().optional(),
})

const createChangeRequestSchema = z.object({
  title:       z.string().optional(),
  overrideIds: z.array(z.string()).min(1),
})

const updateChangeRequestSchema = z.object({
  status:     z.enum(['draft', 'pending', 'approved', 'rejected', 'live']),
  reviewedBy: z.string().optional(),
})

// ── Content override routes ───────────────────────────────────────────────────

/**
 * GET /api/v1/flowedit/content/:siteId/live
 * Public — used by the SDK on every page load to fetch active content.
 */
floweditContentRouter.get('/:siteId/live', async (c) => {
  const db       = getDb()
  const { siteId } = c.req.param()

  const overrides = await db
    .select()
    .from(schema.floweditContentOverrides)
    .where(and(
      eq(schema.floweditContentOverrides.siteId, siteId),
      eq(schema.floweditContentOverrides.status, 'live'),
    ))

  return c.json<ApiResponse>({ success: true, data: overrides })
})

/**
 * GET /api/v1/flowedit/content/:siteId
 * Dashboard — all overrides for a site, optionally filtered by status.
 */
floweditContentRouter.get('/:siteId', async (c) => {
  const db       = getDb()
  const { siteId } = c.req.param()
  const status     = c.req.query('status') as 'draft' | 'pending' | 'approved' | 'rejected' | 'live' | undefined

  const conditions = [eq(schema.floweditContentOverrides.siteId, siteId)]
  if (status) conditions.push(eq(schema.floweditContentOverrides.status, status))

  const overrides = await db
    .select()
    .from(schema.floweditContentOverrides)
    .where(and(...conditions))

  return c.json<ApiResponse>({ success: true, data: overrides })
})

/**
 * POST /api/v1/flowedit/content/:siteId
 * Create a draft override. For 'auto' approval mode sites, immediately marks as 'live'.
 */
floweditContentRouter.post('/:siteId', zValidator('json', createOverrideSchema), async (c) => {
  const db       = getDb()
  const { siteId } = c.req.param()
  const body       = c.req.valid('json')

  // Look up the site's approval mode to decide initial status
  const [site] = await db
    .select({
      approvalMode: schema.floweditSites.approvalMode,
      name:         schema.floweditSites.name,
      domain:       schema.floweditSites.domain,
    })
    .from(schema.floweditSites)
    .where(eq(schema.floweditSites.id, siteId))

  if (!site) {
    return c.json<ApiResponse>({ success: false, error: { code: 'NOT_FOUND', message: 'Site not found' } }, 404)
  }

  const initialStatus = site.approvalMode === 'auto' ? 'live' : 'draft'
  const publishedAt   = initialStatus === 'live' ? new Date() : null

  const [override] = await db
    .insert(schema.floweditContentOverrides)
    .values({
      siteId,
      path:            body.path,
      field:           body.field,
      value:           body.value,
      tier:            body.tier,
      changeNote:      body.changeNote,
      changeRequestId: body.changeRequestId,
      status:          initialStatus,
      publishedAt,
    })
    .returning()

  if (initialStatus === 'draft') {
    notifyNewDraft({
      siteName:   site.name,
      siteDomain: site.domain,
      overrideId: override.id,
      path:       override.path,
      field:      override.field,
      value:      override.value as Record<string, unknown>,
      changeNote: override.changeNote,
      createdBy:  override.createdBy,
      tier:       override.tier,
    }).catch(() => {/* non-fatal */})
  }

  return c.json<ApiResponse>({ success: true, data: override }, 201)
})

/**
 * PATCH /api/v1/flowedit/content/:siteId/overrides/:id
 * Approve, reject, or edit an override. When approving, also sets publishedAt.
 */
floweditContentRouter.patch('/:siteId/overrides/:id', zValidator('json', updateOverrideSchema), async (c) => {
  const db                 = getDb()
  const { siteId, id }     = c.req.param()
  const body               = c.req.valid('json')

  const updateValues: Record<string, unknown> = { ...body }

  if (body.status === 'live') {
    updateValues.publishedAt = new Date()
  }

  const [override] = await db
    .update(schema.floweditContentOverrides)
    .set(updateValues)
    .where(and(
      eq(schema.floweditContentOverrides.id, id),
      eq(schema.floweditContentOverrides.siteId, siteId),
    ))
    .returning()

  if (!override) {
    return c.json<ApiResponse>({ success: false, error: { code: 'NOT_FOUND', message: 'Override not found' } }, 404)
  }

  return c.json<ApiResponse>({ success: true, data: override })
})

/**
 * DELETE /api/v1/flowedit/content/:siteId/overrides/:id
 */
floweditContentRouter.delete('/:siteId/overrides/:id', async (c) => {
  const db             = getDb()
  const { siteId, id } = c.req.param()

  await db
    .delete(schema.floweditContentOverrides)
    .where(and(
      eq(schema.floweditContentOverrides.id, id),
      eq(schema.floweditContentOverrides.siteId, siteId),
    ))

  return c.json<ApiResponse>({ success: true })
})

// ── Change request routes ─────────────────────────────────────────────────────

/**
 * GET /api/v1/flowedit/changes/:siteId
 */
floweditContentRouter.get('/changes/:siteId', async (c) => {
  const db       = getDb()
  const { siteId } = c.req.param()
  const status     = c.req.query('status') as string | undefined

  const conditions = [eq(schema.floweditChangeRequests.siteId, siteId)]
  if (status) conditions.push(eq(schema.floweditChangeRequests.status, status as 'draft'))

  const requests = await db
    .select()
    .from(schema.floweditChangeRequests)
    .where(and(...conditions))

  return c.json<ApiResponse>({ success: true, data: requests })
})

/**
 * POST /api/v1/flowedit/changes/:siteId
 * Create a change request and link the specified overrides to it.
 */
floweditContentRouter.post('/changes/:siteId', zValidator('json', createChangeRequestSchema), async (c) => {
  const db       = getDb()
  const { siteId } = c.req.param()
  const body       = c.req.valid('json')

  const [request] = await db
    .insert(schema.floweditChangeRequests)
    .values({ siteId, title: body.title, status: 'pending' })
    .returning()

  // Link all specified overrides to this change request
  if (body.overrideIds.length > 0) {
    for (const overrideId of body.overrideIds) {
      await db
        .update(schema.floweditContentOverrides)
        .set({ changeRequestId: request.id, status: 'pending' })
        .where(and(
          eq(schema.floweditContentOverrides.id, overrideId),
          eq(schema.floweditContentOverrides.siteId, siteId),
        ))
    }
  }

  return c.json<ApiResponse>({ success: true, data: request }, 201)
})

/**
 * PATCH /api/v1/flowedit/changes/:siteId/:id
 * Approve or reject a change request and cascade to all linked overrides.
 */
floweditContentRouter.patch('/changes/:siteId/:id', zValidator('json', updateChangeRequestSchema), async (c) => {
  const db             = getDb()
  const { siteId, id } = c.req.param()
  const body           = c.req.valid('json')

  const reviewedAt = new Date()

  const [request] = await db
    .update(schema.floweditChangeRequests)
    .set({ status: body.status, reviewedBy: body.reviewedBy, reviewedAt })
    .where(and(
      eq(schema.floweditChangeRequests.id, id),
      eq(schema.floweditChangeRequests.siteId, siteId),
    ))
    .returning()

  if (!request) {
    return c.json<ApiResponse>({ success: false, error: { code: 'NOT_FOUND', message: 'Change request not found' } }, 404)
  }

  // Cascade status to all linked overrides
  if (body.status === 'live' || body.status === 'rejected') {
    await db
      .update(schema.floweditContentOverrides)
      .set({
        status:      body.status,
        approvedBy:  body.status === 'live' ? body.reviewedBy : undefined,
        publishedAt: body.status === 'live' ? reviewedAt : undefined,
      })
      .where(eq(schema.floweditContentOverrides.changeRequestId, id))
  }

  return c.json<ApiResponse>({ success: true, data: request })
})
