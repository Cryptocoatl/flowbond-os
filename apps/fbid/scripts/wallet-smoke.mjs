// Headless end-to-end test of the Solana wallet sign-in path against the local hub.
// Generates a keypair, gets a nonce, signs the SIWS message, posts /verify, and
// confirms a handoff redirect (with token_hash) comes back.
import nacl from 'tweetnacl'
import bs58 from 'bs58'

const HUB = 'http://localhost:3020'
const APP_CALLBACK = 'http://localhost:3011/auth/callback?next=/'

const kp = nacl.sign.keyPair()
const address = bs58.encode(kp.publicKey)

// 1. nonce (capture httpOnly cookie)
const nonceRes = await fetch(`${HUB}/api/wallet/nonce`, { method: 'POST' })
const setCookie = nonceRes.headers.get('set-cookie') || ''
const cookie = setCookie.split(';')[0]
const { nonce, domain } = await nonceRes.json()

// 2. build + sign the message (must include domain + nonce)
const message = [
  `${domain} wants you to sign in with your wallet:`,
  address, '', 'Sign in to FlowBond (FBID).', '',
  `URI: https://${domain}`, 'Chain: solana', `Nonce: ${nonce}`,
  `Issued At: ${new Date().toISOString()}`,
].join('\n')
const signature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey))

// 3. verify -> expect { redirect: ...token_hash=... }
const vr = await fetch(`${HUB}/api/wallet/verify`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ chain: 'solana', address, message, signature, redirect: APP_CALLBACK, app: 'astroflow' }),
})
const data = await vr.json()
console.log('verify status:', vr.status)
console.log('has handoff token:', !!(data.redirect && data.redirect.includes('token_hash=')))
console.log('redirect:', (data.redirect || JSON.stringify(data)).replace(/token_hash=[^&]+/, 'token_hash=<redacted>'))

// 4. NEGATIVE: replay the same (now-consumed) nonce -> must fail
const replay = await fetch(`${HUB}/api/wallet/verify`, {
  method: 'POST', headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ chain: 'solana', address, message, signature, redirect: APP_CALLBACK, app: 'astroflow' }),
})
console.log('replay rejected:', replay.status !== 200, `(status ${replay.status})`)

// 5. NEGATIVE: off-allowlist redirect -> must 400 bad_redirect
const evil = await fetch(`${HUB}/api/wallet/verify`, {
  method: 'POST', headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ chain: 'solana', address, message, signature, redirect: 'https://evil.com/auth/callback', app: 'x' }),
})
const evilData = await evil.json()
console.log('off-allowlist rejected:', evil.status === 400 && evilData.error === 'bad_redirect', `(${evil.status} ${evilData.error})`)

console.log('TEST_EMAIL=solana_' + address.toLowerCase() + '@wallet.flowbond.life')
