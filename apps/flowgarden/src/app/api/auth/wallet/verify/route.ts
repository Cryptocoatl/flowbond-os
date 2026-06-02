import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { recoverMessageAddress } from 'viem'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const DOMAIN = 'flowgarden.life'

/**
 * Verify a wallet signature, then mint a Supabase session for the wallet's
 * stable identity. Returns a magic-link token_hash the client redeems with
 * verifyOtp() to obtain real session cookies.
 */
export async function POST(request: Request) {
  const { chain, address, message, signature } = await request.json().catch(() => ({}))

  if (!chain || !address || !message || !signature) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // ── Replay protection: the signed message must contain our live nonce. ──
  const store = await cookies()
  const nonce = store.get('fg_wallet_nonce')?.value
  if (!nonce || !String(message).includes(nonce)) {
    return NextResponse.json({ error: 'Sign-in expired — please try again' }, { status: 400 })
  }
  if (!String(message).includes(DOMAIN) && !String(message).toLowerCase().includes('flowgarden')) {
    return NextResponse.json({ error: 'Invalid sign-in message' }, { status: 400 })
  }
  // One-time use.
  store.delete('fg_wallet_nonce')

  // ── Verify the cryptographic signature. ──
  let valid = false
  try {
    if (chain === 'evm') {
      const recovered = await recoverMessageAddress({ message, signature: signature as `0x${string}` })
      valid = recovered.toLowerCase() === String(address).toLowerCase()
    } else if (chain === 'solana') {
      valid = nacl.sign.detached.verify(
        new TextEncoder().encode(message),
        bs58.decode(signature),
        bs58.decode(address),
      )
    }
  } catch (err) {
    console.error('[wallet/verify] signature check error:', err)
    valid = false
  }

  if (!valid) {
    return NextResponse.json({ error: 'Signature did not match wallet' }, { status: 401 })
  }

  // ── Map wallet → stable Supabase identity. ──
  const normalized = chain === 'evm' ? String(address).toLowerCase() : String(address)
  const email = `${normalized}@${chain}.wallet.flowgarden.life`

  const admin = createAdminClient()

  // Create the user if new (idempotent — ignore "already registered").
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { wallet_chain: chain, wallet_address: address },
  })
  if (createErr && !/already.*regist|exist/i.test(createErr.message)) {
    console.error('[wallet/verify] createUser error:', createErr.message)
    return NextResponse.json({ error: 'Could not create wallet account' }, { status: 500 })
  }

  // Generate a magic-link token the client redeems for a session.
  const { data, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (linkErr || !data?.properties?.hashed_token) {
    console.error('[wallet/verify] generateLink error:', linkErr?.message)
    return NextResponse.json({ error: 'Could not start session' }, { status: 500 })
  }

  return NextResponse.json({ token_hash: data.properties.hashed_token })
}
