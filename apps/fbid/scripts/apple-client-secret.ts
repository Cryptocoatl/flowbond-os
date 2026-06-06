/**
 * Generate the Apple "Sign in with Apple" client secret — an ES256-signed JWT.
 * Apple does not issue a static secret; you mint one from your .p8 key, and it
 * expires (max 6 months) so it must be rotated.
 *
 *   export APPLE_TEAM_ID=XXXXXXXXXX            # Apple Developer Team ID
 *   export APPLE_KEY_ID=YYYYYYYYYY             # the Sign in with Apple key id
 *   export APPLE_SERVICES_ID=life.flowbond.signin   # the Services ID (= client_id)
 *   export APPLE_PRIVATE_KEY="$(cat AuthKey_YYYYYYYYYY.p8)"
 *   npx tsx apps/fbid/scripts/apple-client-secret.ts
 *
 * Put the printed JWT into env as APPLE_CLIENT_SECRET and run configure-fbid-auth.ts.
 * ⏰ Re-run before it expires (the script prints the expiry date).
 */
import { SignJWT, importPKCS8 } from 'jose'

const TEAM_ID = req('APPLE_TEAM_ID')
const KEY_ID = req('APPLE_KEY_ID')
const SERVICES_ID = req('APPLE_SERVICES_ID')
const PRIVATE_KEY = req('APPLE_PRIVATE_KEY')

function req(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`✗ Missing env ${name}`)
    process.exit(1)
  }
  return v
}

async function main() {
  const now = Math.floor(Date.now() / 1000)
  // Apple allows up to 6 months; use ~5.9 months to stay safely under the cap.
  const exp = now + 60 * 60 * 24 * 180

  const key = await importPKCS8(PRIVATE_KEY, 'ES256')
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: KEY_ID })
    .setIssuer(TEAM_ID)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setAudience('https://appleid.apple.com')
    .setSubject(SERVICES_ID)
    .sign(key)

  console.log('APPLE_CLIENT_SECRET=' + jwt)
  console.error(`\n⏰ Expires: ${new Date(exp * 1000).toISOString().slice(0, 10)} — regenerate before then.`)
}

main().catch((e) => {
  console.error('✗', e)
  process.exit(1)
})
