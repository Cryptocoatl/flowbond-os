import { Hono }           from 'hono'
import { getDb, schema }  from '@flowbond/db'
import { eq }             from 'drizzle-orm'
import { verifyActionToken, notifyDecision } from '../lib/notify'
import type { ApiResponse }  from '@flowbond/core'

export const floweditApproveRouter = new Hono()

const HTML = (title: string, body: string, color: string) => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · FlowEdit</title>
<style>
  body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;
       min-height:100vh;margin:0;background:#f4f4f5}
  .card{background:#fff;border-radius:16px;padding:40px 48px;box-shadow:0 4px 24px rgba(0,0,0,.08);
        max-width:420px;width:100%;text-align:center}
  .dot{width:48px;height:48px;border-radius:50%;background:${color};margin:0 auto 20px;
       display:flex;align-items:center;justify-content:center;font-size:24px}
  h1{font-size:20px;margin:0 0 8px;color:#18181b}
  p{color:#71717a;font-size:14px;line-height:1.6;margin:0}
  .badge{display:inline-block;margin-top:16px;padding:4px 12px;border-radius:999px;
         font-size:12px;font-weight:600;background:#f4f4f5;color:#3f3f46}
</style>
</head>
<body>
  <div class="card">
    <div class="dot">${color === '#10b981' ? '✓' : '✕'}</div>
    <h1>${title}</h1>
    <p>${body}</p>
    <div class="badge">FlowEdit</div>
  </div>
</body>
</html>`

async function handleAction(token: string, action: 'approve' | 'reject'): Promise<Response> {
  const db = getDb()

  let payload: { overrideId: string; siteId: string; action: string }

  try {
    payload = await verifyActionToken(token)
  } catch {
    return new Response(
      HTML('Invalid Link', 'This approval link is expired or invalid.', '#ef4444'),
      { status: 400, headers: { 'Content-Type': 'text/html' } },
    )
  }

  if (payload.action !== action) {
    return new Response(
      HTML('Wrong Action', 'This link is for a different action.', '#ef4444'),
      { status: 400, headers: { 'Content-Type': 'text/html' } },
    )
  }

  const newStatus  = action === 'approve' ? 'live' : 'rejected'
  const publishedAt = action === 'approve' ? new Date() : null

  const updateValues: Record<string, unknown> = { status: newStatus }
  if (publishedAt) updateValues.publishedAt = publishedAt

  const [override] = await db
    .update(schema.floweditContentOverrides)
    .set(updateValues)
    .where(eq(schema.floweditContentOverrides.id, payload.overrideId))
    .returning()

  if (!override) {
    return new Response(
      HTML('Not Found', 'Change not found — it may have already been reviewed.', '#f59e0b'),
      { status: 404, headers: { 'Content-Type': 'text/html' } },
    )
  }

  // Look up site for notify context
  const [site] = await db
    .select({ name: schema.floweditSites.name, domain: schema.floweditSites.domain })
    .from(schema.floweditSites)
    .where(eq(schema.floweditSites.id, override.siteId))

  notifyDecision({
    siteName:   site?.name ?? override.siteId,
    siteDomain: site?.domain ?? null,
    overrideId: override.id,
    path:       override.path,
    field:      override.field,
    value:      override.value as Record<string, unknown>,
    decision:   action === 'approve' ? 'approved' : 'rejected',
    createdBy:  override.createdBy,
  }).catch(() => {/* non-fatal */})

  if (action === 'approve') {
    return new Response(
      HTML(
        'Change Approved',
        `The edit to <strong>${override.path}</strong> (${override.field}) is now live on the site.`,
        '#10b981',
      ),
      { status: 200, headers: { 'Content-Type': 'text/html' } },
    )
  }

  return new Response(
    HTML(
      'Change Rejected',
      `The edit to <strong>${override.path}</strong> (${override.field}) was rejected and will not go live.`,
      '#ef4444',
    ),
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  )
}

// GET /api/v1/flowedit/approve/:token
floweditApproveRouter.get('/approve/:token', async (c) => {
  return handleAction(c.req.param('token'), 'approve')
})

// GET /api/v1/flowedit/reject/:token
floweditApproveRouter.get('/reject/:token', async (c) => {
  return handleAction(c.req.param('token'), 'reject')
})

// POST /api/v1/flowedit/approve/:token  (for programmatic use)
floweditApproveRouter.post('/approve/:token', async (c) => {
  const db = getDb()
  let payload: { overrideId: string; siteId: string; action: string }

  try {
    payload = await verifyActionToken(c.req.param('token'))
  } catch {
    return c.json<ApiResponse>({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token invalid or expired' } }, 400)
  }

  if (payload.action !== 'approve') {
    return c.json<ApiResponse>({ success: false, error: { code: 'WRONG_ACTION', message: 'Token is for reject, not approve' } }, 400)
  }

  const [override] = await db
    .update(schema.floweditContentOverrides)
    .set({ status: 'live', publishedAt: new Date() })
    .where(eq(schema.floweditContentOverrides.id, payload.overrideId))
    .returning()

  return override
    ? c.json<ApiResponse>({ success: true, data: override })
    : c.json<ApiResponse>({ success: false, error: { code: 'NOT_FOUND', message: 'Override not found' } }, 404)
})
