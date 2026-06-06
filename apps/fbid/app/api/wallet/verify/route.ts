import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { verifyMessage } from 'viem'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { isAllowedRedirect } from '@flowbond/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const HUB_DOMAIN = 'fbid.flowbond.life'

/**
 * Verify a wallet signature (EVM via SIWE-style personal_sign, or Solana via
 * SIWS ed25519), resolve it to a single FBID identity, then mint the standard
 * cross-domain handoff token and return the app callback URL to redirect to.
 *
 *   POST { chain:'evm'|'solana', address, chainId?, message, signature, redirect, app }
 *   -> { redirect: '<app callback>?token_hash=...&type=magiclink' }
 */
export async function POST(request: NextRequest) {
  const { chain, address, chainId, message, signature, redirect, app } =
    await request.json().catch(() => ({}))

  // 1. Validate the return target up front (security: never hand a token elsewhere).
  if (!isAllowedRedirect(redirect)) {
    return NextResponse.json({ error: 'bad_redirect' }, { status: 400 })
  }
  if (!chain || !address || !message || !signature) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  // 2. Replay protection. The nonce must be in the signed message AND bound to
  //    this browser (cookie) AND be claimable server-side (single-use, TTL).
  const store = await cookies()
  const nonce = store.get('fbid_wallet_nonce')?.value
  if (!nonce || !String(message).includes(nonce)) {
    return NextResponse.json({ error: 'nonce_invalid' }, { status: 400 })
  }
  // Anti-phishing: the signed message must bind to THIS hub domain.
  if (!String(message).includes(HUB_DOMAIN)) {
    return NextResponse.json({ error: 'wrong_domain' }, { status: 400 })
  }
  store.delete('fbid_wallet_nonce')

  const adminEarly = createAdminClient()
  const { data: claimed } = await adminEarly.rpc('claim_auth_nonce', { p_nonce: nonce })
  if (claimed !== true) {
    // Already used or expired — replay rejected here, authoritatively.
    return NextResponse.json({ error: 'nonce_expired_or_used' }, { status: 400 })
  }

  // 3. Verify the cryptographic signature.
  let valid = false
  try {
    if (chain === 'evm') {
      valid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      })
    } else if (chain === 'solana') {
      valid = nacl.sign.detached.verify(
        new TextEncoder().encode(message),
        bs58.decode(signature),
        bs58.decode(address),
      )
    }
  } catch (err) {
    console.error('[wallet/verify] signature check error', err)
    valid = false
  }
  if (!valid) {
    return NextResponse.json({ error: 'bad_signature' }, { status: 401 })
  }

  // 4. Resolve to a single FBID identity (chain-namespaced, case-normalized).
  const normalizedAddr = chain === 'evm' ? String(address).toLowerCase() : String(address)
  const identifier =
    chain === 'evm'
      ? `eip155:${chainId ?? '0'}:${normalizedAddr}`
      : `solana:${normalizedAddr}`
  const email = `${chain}_${normalizedAddr}@wallet.flowbond.life`

  const admin = createAdminClient()

  // Idempotent: create the wallet's auth user if new.
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { wallet_chain: chain, wallet_address: address, fbid_wallet: identifier },
  })
  if (createErr && !/already.*regist|exist/i.test(createErr.message)) {
    console.error('[wallet/verify] createUser', createErr.message)
    return NextResponse.json({ error: 'account_error' }, { status: 500 })
  }

  // 5. Mint the one-time handoff token. generateLink also returns the resolved
  //    user, so we get a reliable id for binding (no flaky listUsers paging).
  const { data, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkErr || !data?.properties?.hashed_token || !data.user) {
    console.error('[wallet/verify] generateLink', linkErr?.message)
    return NextResponse.json({ error: 'handoff_failed' }, { status: 500 })
  }

  // Bind the wallet to this FBID identity (unique index enforces one-wallet-one-FBID).
  const { error: bindErr } = await admin
    .from('flowbond_users')
    .update({ wallet_address: identifier, updated_at: new Date().toISOString() })
    .eq('id', data.user.id)
  if (bindErr) {
    if (/duplicate key|unique/i.test(bindErr.message)) {
      return NextResponse.json({ error: 'wallet_already_bound_to_other_identity' }, { status: 409 })
    }
    console.error('[wallet/verify] bind failed', bindErr.message)
  }

  const target = new URL(redirect as string)
  target.searchParams.set('token_hash', data.properties.hashed_token)
  target.searchParams.set('type', 'magiclink')
  if (app) target.searchParams.set('app', String(app))

  return NextResponse.json({ redirect: target.toString() })
}
