import { Hono }                from 'hono'
import { zValidator }         from '@hono/zod-validator'
import { z }                  from 'zod'
import { getDb, schema }      from '@flowbond/db'
import { parseContentChange } from '@flowbond/ai'
import { eq, and }            from 'drizzle-orm'
import type { ApiResponse }   from '@flowbond/core'
import { notifyNewDraft }     from '../lib/notify'

export const floweditAiRouter = new Hono()

const aiEditSchema = z.object({
  prompt:    z.string().min(3),
  createdBy: z.string().optional(),
})

/**
 * POST /api/v1/flowedit/ai/:siteId
 *
 * Accepts a natural-language prompt, uses Claude to parse it into structured
 * content changes, and creates draft overrides for the site.
 *
 * For 'auto' approval mode sites the overrides go live immediately.
 * For 'review'/'admin_only' sites they enter the draft queue.
 */
floweditAiRouter.post('/:siteId', zValidator('json', aiEditSchema), async (c) => {
  const db       = getDb()
  const { siteId } = c.req.param()
  const { prompt, createdBy } = c.req.valid('json')

  // Resolve site
  const [site] = await db
    .select()
    .from(schema.floweditSites)
    .where(eq(schema.floweditSites.id, siteId))

  if (!site) {
    return c.json<ApiResponse>({ success: false, error: { code: 'NOT_FOUND', message: 'Site not found' } }, 404)
  }

  // Gather existing live paths for context
  const existingOverrides = await db
    .select({ path: schema.floweditContentOverrides.path })
    .from(schema.floweditContentOverrides)
    .where(and(
      eq(schema.floweditContentOverrides.siteId, siteId),
      eq(schema.floweditContentOverrides.status, 'live'),
    ))

  const existingPaths = [...new Set(existingOverrides.map((o) => o.path))]

  // Ask Claude to parse the prompt
  const parsed = await parseContentChange(prompt, { siteName: site.name, existingPaths })

  if (!parsed.success) {
    return c.json<ApiResponse>({
      success: false,
      error: { code: 'AI_PARSE_FAILED', message: parsed.reason },
    }, 422)
  }

  const initialStatus = site.approvalMode === 'auto' ? 'live' : 'draft'
  const publishedAt   = initialStatus === 'live' ? new Date() : null

  // Create all draft overrides
  const created = await Promise.all(
    parsed.changes.map((change) =>
      db.insert(schema.floweditContentOverrides).values({
        siteId,
        path:        change.path,
        field:       change.field,
        value:       change.value,
        tier:        'ai',
        changeNote:  change.changeNote,
        status:      initialStatus,
        createdBy:   createdBy,
        publishedAt,
      }).returning()
    )
  )

  const flat = created.flat()

  if (initialStatus === 'draft') {
    for (const override of flat) {
      notifyNewDraft({
        siteName:       site.name,
        siteDomain:     null,
        overrideId:     override.id,
        path:           override.path,
        field:          override.field,
        value:          override.value as Record<string, unknown>,
        changeNote:     override.changeNote,
        createdBy:      override.createdBy,
        createdByEmail: null,
        tier:           'ai',
      }).catch(() => {/* non-fatal */})
    }
  }

  return c.json<ApiResponse>({
    success: true,
    data: {
      overrides:    flat,
      status:       initialStatus,
      promptUsed:   prompt,
      changesCount: parsed.changes.length,
    },
  }, 201)
})

/**
 * POST /api/v1/flowedit/ai/:siteId/preview
 *
 * Same as the main endpoint but returns the parsed changes WITHOUT saving them.
 * Useful for showing a preview before the user confirms.
 */
floweditAiRouter.post('/:siteId/preview', zValidator('json', aiEditSchema), async (c) => {
  const db       = getDb()
  const { siteId } = c.req.param()
  const { prompt } = c.req.valid('json')

  const [site] = await db
    .select({ name: schema.floweditSites.name })
    .from(schema.floweditSites)
    .where(eq(schema.floweditSites.id, siteId))

  if (!site) {
    return c.json<ApiResponse>({ success: false, error: { code: 'NOT_FOUND', message: 'Site not found' } }, 404)
  }

  const parsed = await parseContentChange(prompt, { siteName: site.name })

  if (!parsed.success) {
    return c.json<ApiResponse>({
      success: false,
      error: { code: 'AI_PARSE_FAILED', message: parsed.reason },
    }, 422)
  }

  return c.json<ApiResponse>({ success: true, data: { changes: parsed.changes, prompt } })
})
