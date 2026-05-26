import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.FLOWEDIT_JWT_SECRET ?? 'flowedit-dev-secret-change-in-prod'
)

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000'

export async function generateActionToken(
  overrideId: string,
  siteId: string,
  action: 'approve' | 'reject',
): Promise<string> {
  return new SignJWT({ overrideId, siteId, action })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('48h')
    .sign(SECRET)
}

export async function verifyActionToken(token: string): Promise<{
  overrideId: string
  siteId: string
  action: 'approve' | 'reject'
}> {
  const { payload } = await jwtVerify(token, SECRET)
  return payload as { overrideId: string; siteId: string; action: 'approve' | 'reject' }
}

interface DraftNotifyPayload {
  siteName:       string
  siteDomain:     string | null
  overrideId:     string
  path:           string
  field:          string
  value:          Record<string, unknown>
  changeNote:     string | null
  createdBy:      string | null
  createdByEmail: string | null
  tier:           string
}

interface DecisionNotifyPayload {
  siteName:   string
  siteDomain: string | null
  overrideId: string
  path:       string
  field:      string
  value:      Record<string, unknown>
  decision:   'approved' | 'rejected'
  createdBy:  string | null
}

async function fireWebhooks(body: Record<string, unknown>): Promise<void> {
  const secret  = process.env.FLOWEDIT_WEBHOOK_SECRET
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (secret) headers['x-flowedit-secret'] = secret

  const targets: (string | undefined)[] = [
    process.env.FLOWEDIT_NOTIFY_WEBHOOK,
    process.env.FLOWDESK_WEBHOOK_URL,
  ]

  await Promise.allSettled(
    targets
      .filter((url): url is string => Boolean(url))
      .map((url) =>
        fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
          .catch((err) => console.error(`[notify] webhook failed (${url})`, err))
      )
  )
}

export async function notifyNewDraft(payload: DraftNotifyPayload): Promise<void> {
  const [approveToken, rejectToken] = await Promise.all([
    generateActionToken(payload.overrideId, payload.siteName, 'approve'),
    generateActionToken(payload.overrideId, payload.siteName, 'reject'),
  ])

  const approveUrl = `${API_BASE}/api/v1/flowedit/approve/${approveToken}`
  const rejectUrl  = `${API_BASE}/api/v1/flowedit/reject/${rejectToken}`

  await fireWebhooks({
    event:      'new_draft',
    site:       { name: payload.siteName, domain: payload.siteDomain },
    change:     { path: payload.path, field: payload.field, value: payload.value, note: payload.changeNote },
    createdBy:  payload.createdByEmail ?? payload.createdBy,
    tier:       payload.tier,
    approveUrl,
    rejectUrl,
    dashboardUrl: `${process.env.FLOWEDIT_DASHBOARD_URL ?? 'http://localhost:3003'}/sites`,
  })
}

export async function notifyDecision(payload: DecisionNotifyPayload): Promise<void> {
  await fireWebhooks({
    event:    payload.decision,
    site:     { name: payload.siteName, domain: payload.siteDomain },
    change:   { path: payload.path, field: payload.field, value: payload.value, note: null },
    createdBy: payload.createdBy,
    tier:     'simple',
  })
}
