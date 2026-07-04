import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Constant login/security audit — runs on a Vercel Cron (see vercel.json).
// Energy-efficient by design: cheap HTTP + one DB round-trip every run; it only
// spends an email (via Resend) when something actually REGRESSES.
//
// Secured: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; we reject
// anything else, so the endpoint can't be abused to spam checks/alerts.

export const dynamic = 'force-dynamic'
export const maxDuration = 30

type Check = { name: string; ok: boolean; detail: string }

// Live FBID surfaces that must stay healthy. okCodes = acceptable HTTP statuses
// (a healthy auth callback redirects; a homepage is 200; 404/5xx/connect-fail = bad).
const HTTP_CHECKS: { name: string; url: string; ok: number[] }[] = [
  // Homepages may legitimately redirect (apex→www, locale, auth) — accept 2xx/3xx,
  // treat only 404/5xx/connect-fail as broken.
  { name: 'hub', url: 'https://fbid.flowbond.life/', ok: [200, 307, 308] },
  { name: 'astroflow', url: 'https://astro.flowbond.life/', ok: [200, 307, 308] },
  { name: 'danz', url: 'https://danz-now.vercel.app/', ok: [200, 307, 308] },
  { name: 'flowdesk', url: 'https://flowdesk.flowbond.life/', ok: [200, 307, 308] },
  { name: 'flowgarden-callback', url: 'https://www.flowgarden.life/auth/callback', ok: [200, 302, 307, 308] },
  { name: 'flowme-callback', url: 'https://flowme.one/auth/callback', ok: [200, 302, 307, 308] },
  { name: 'hub-add-email-guard', url: 'https://fbid.flowbond.life/api/accounts/add-email', ok: [401, 405] },
]

async function httpCheck(c: { name: string; url: string; ok: number[] }): Promise<Check> {
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 10_000)
  try {
    const r = await fetch(c.url, { method: 'GET', redirect: 'manual', signal: ctrl.signal, headers: { 'User-Agent': 'fbid-monitor' } })
    const ok = c.ok.includes(r.status)
    return { name: c.name, ok, detail: `HTTP ${r.status}${ok ? '' : ` (want ${c.ok.join('/')})`}` }
  } catch (e) {
    return { name: c.name, ok: false, detail: `unreachable: ${(e as Error).name}` }
  } finally {
    clearTimeout(to)
  }
}

async function dbChecks(): Promise<Check[]> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('fbid_monitor_health')
    if (error) return [{ name: 'db', ok: false, detail: `rpc error: ${error.message}` }]
    const h = data as Record<string, unknown>
    const must = ['rls_identities', 'rls_links', 'rls_verifications', 'current_fbid_exists', 'request_link_locked', 'verifications_no_policy']
    return must.map((k) => ({ name: `db:${k}`, ok: h[k] === true, detail: String(h[k]) }))
      .concat([{ name: 'db:reachable', ok: true, detail: `identities=${h.identities} links=${h.links_active}` }])
  } catch (e) {
    return [{ name: 'db', ok: false, detail: `admin client failed: ${(e as Error).message}` }]
  }
}

async function alert(failures: Check[]) {
  const key = process.env.RESEND_API_KEY
  const to = process.env.ALERT_EMAIL || 'cryptocoatl101@gmail.com'
  if (!key) return
  const lines = failures.map((f) => `• ${f.name}: ${f.detail}`).join('<br>')
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.FBID_FROM_EMAIL || 'FlowBond Monitor <id@flowbond.life>',
      to,
      subject: `⚠️ FBID monitor: ${failures.length} check(s) failing`,
      html: `<div style="font-family:system-ui;max-width:520px"><h2>FBID login/security audit found a regression</h2><p>${lines}</p><p style="color:#666;font-size:13px">Automated check from fbid.flowbond.life/api/monitor</p></div>`,
    }),
  }).catch(() => {})
}

export async function GET(req: NextRequest) {
  // Only the cron (or someone with the secret) may run this.
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const [http, db] = await Promise.all([Promise.all(HTTP_CHECKS.map(httpCheck)), dbChecks()])
  const checks = [...http, ...db]
  const failures = checks.filter((c) => !c.ok)
  if (failures.length) await alert(failures)

  return NextResponse.json(
    { ok: failures.length === 0, failing: failures.length, total: checks.length, checks },
    { status: failures.length ? 503 : 200 },
  )
}
