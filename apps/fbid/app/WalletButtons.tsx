'use client'

import { useState } from 'react'

// Injected-wallet sign-in (MetaMask / Phantom). No Reown/WalletConnect needed —
// works with browser-extension wallets out of the box. The session is minted by
// the hub (/api/wallet/verify) and handed off to the app, so identity stays
// single-rooted in FBID.
export default function WalletButtons({
  app,
  redirect,
}: {
  app: string
  redirect: string
}) {
  const [busy, setBusy] = useState<null | 'evm' | 'solana'>(null)
  const [error, setError] = useState('')

  async function getNonce(): Promise<{ nonce: string; domain: string }> {
    const r = await fetch('/api/wallet/nonce', { method: 'POST' })
    if (!r.ok) throw new Error('nonce_failed')
    return r.json()
  }

  function buildMessage(domain: string, address: string, nonce: string, chainId?: string) {
    return [
      `${domain} wants you to sign in with your wallet:`,
      address,
      '',
      'Sign in to FlowBond (FBID).',
      '',
      `URI: https://${domain}`,
      chainId ? `Chain ID: ${chainId}` : 'Chain: solana',
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join('\n')
  }

  async function finish(body: Record<string, unknown>) {
    const r = await fetch('/api/wallet/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, redirect, app }),
    })
    const data = await r.json()
    if (!r.ok || !data.redirect) throw new Error(data.error || 'verify_failed')
    window.location.assign(data.redirect)
  }

  async function connectEvm() {
    setError('')
    setBusy('evm')
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eth = (window as any).ethereum
      if (!eth) throw new Error('No EVM wallet found (install MetaMask).')
      const [address] = await eth.request({ method: 'eth_requestAccounts' })
      const chainHex = await eth.request({ method: 'eth_chainId' })
      const chainId = String(parseInt(chainHex, 16))
      const { nonce, domain } = await getNonce()
      const message = buildMessage(domain, address, nonce, chainId)
      const signature = await eth.request({ method: 'personal_sign', params: [message, address] })
      await finish({ chain: 'evm', address, chainId, message, signature })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wallet sign-in failed')
      setBusy(null)
    }
  }

  async function connectSolana() {
    setError('')
    setBusy('solana')
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sol = (window as any).solana
      if (!sol?.connect) throw new Error('No Solana wallet found (install Phantom).')
      const resp = await sol.connect()
      const address = resp.publicKey.toString()
      const { nonce, domain } = await getNonce()
      const message = buildMessage(domain, address, nonce)
      const signed = await sol.signMessage(new TextEncoder().encode(message), 'utf8')
      // Phantom returns { signature: Uint8Array }; encode base58.
      const bs58 = (await import('bs58')).default
      const signature = bs58.encode(signed.signature ?? signed)
      await finish({ chain: 'solana', address, message, signature })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wallet sign-in failed')
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={connectEvm}
          disabled={!!busy}
          className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm font-medium hover:bg-white/[0.08] transition disabled:opacity-50"
        >
          {busy === 'evm' ? 'Signing…' : 'Wallet (EVM)'}
        </button>
        <button
          onClick={connectSolana}
          disabled={!!busy}
          className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm font-medium hover:bg-white/[0.08] transition disabled:opacity-50"
        >
          {busy === 'solana' ? 'Signing…' : 'Wallet (Solana)'}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  )
}
