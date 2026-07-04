/**
 * Configure FBID hub auth on the canonical Supabase project via the Management API.
 * Sets site_url + the full redirect allowlist, and (if creds are present) enables
 * Google + Apple. Then GETs the config back and asserts the values stuck.
 *
 *   export SUPABASE_ACCESS_TOKEN=sbp_...        # account → access tokens
 *   # optional provider creds:
 *   export GOOGLE_CLIENT_ID=...  GOOGLE_CLIENT_SECRET=...
 *   export APPLE_CLIENT_ID=...   APPLE_CLIENT_SECRET=...
 *   npx tsx apps/fbid/scripts/configure-fbid-auth.ts
 *
 * Canonical project ref is fixed below — NOT the stale eoajujwpdkfuicnoxetk.
 */
import { allowedCallbackUrls } from '@flowbond/auth'

const PROJECT_REF = 'fgsrcxxccdjqyrpkitmk'
const SITE_URL = 'https://fbid.flowbond.life'
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`

const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) {
  console.error('✗ SUPABASE_ACCESS_TOKEN not set. Create one at')
  console.error('  https://supabase.com/dashboard/account/tokens and export it, then re-run.')
  console.error('  (Falling back to the manual checklist in apps/fbid/CONFIG.md.)')
  process.exit(1)
}

// App callbacks (from the SDK allowlist) + the hub's own callbacks.
const uriAllowList = [
  ...allowedCallbackUrls(),
  'https://fbid.flowbond.life/auth/callback',
  'https://fbid.flowbond.life/auth/set-password',
  'http://localhost:3020/auth/callback',
].join(',')

const body: Record<string, unknown> = {
  site_url: SITE_URL,
  uri_allow_list: uriAllowList,
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  body.external_google_enabled = true
  body.external_google_client_id = process.env.GOOGLE_CLIENT_ID
  body.external_google_secret = process.env.GOOGLE_CLIENT_SECRET
}
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  body.external_apple_enabled = true
  body.external_apple_client_id = process.env.APPLE_CLIENT_ID
  body.external_apple_secret = process.env.APPLE_CLIENT_SECRET
}

const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

async function main() {
  console.log(`→ PATCH auth config for ${PROJECT_REF}`)
  // Critical write: site_url + redirect allowlist (+ optional OAuth). Must succeed.
  const patch = await fetch(API, { method: 'PATCH', headers, body: JSON.stringify(body) })
  if (!patch.ok) {
    console.error(`✗ PATCH failed: ${patch.status} ${await patch.text()}`)
    process.exit(1)
  }

  // Best-effort: enable leaked-password (HaveIBeenPwned) protection. Sent as its
  // own PATCH so a plan/availability rejection can't roll back the allowlist write.
  try {
    const hp = await fetch(API, {
      method: 'PATCH', headers,
      body: JSON.stringify({ password_hibp_enabled: true }),
    })
    if (!hp.ok) {
      console.warn(`⚠ leaked-password protection NOT enabled: ${hp.status} ${await hp.text()}`)
      console.warn('  (requires Pro plan — toggle later in Dashboard → Auth → Passwords.)')
    }
  } catch (e) {
    console.warn('⚠ leaked-password protection skipped:', e)
  }

  // Read back and assert the critical values stuck.
  const get = await fetch(API, { headers })
  const cfg = (await get.json()) as Record<string, unknown>
  const ok =
    cfg.site_url === SITE_URL &&
    String(cfg.uri_allow_list ?? '').includes('fbid.flowbond.life/auth/callback')

  console.log('site_url          :', cfg.site_url)
  console.log('google enabled    :', cfg.external_google_enabled)
  console.log('apple enabled     :', cfg.external_apple_enabled)
  console.log('leaked-pwd protect :', cfg.password_hibp_enabled)
  console.log('allowlist entries :', String(cfg.uri_allow_list ?? '').split(',').length)
  console.log(ok ? '✓ config applied and verified' : '✗ config did not match expected values')
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error('✗', e)
  process.exit(1)
})
