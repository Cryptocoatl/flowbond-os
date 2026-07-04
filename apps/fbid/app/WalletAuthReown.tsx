'use client'

// Reown AppKit multichain (EVM + Solana) wallet sign-in for the FBID hub —
// WalletConnect + mobile + injected, all in one modal. Loaded via
// next/dynamic({ ssr:false }) so createAppKit() only runs in the browser.
//
// Unlike a normal app, the hub does NOT keep the session: after the signature
// verifies, the server mints a handoff token and returns the originating app's
// callback URL, which we navigate to (the app redeems it). Identity stays
// single-rooted in FBID.

import { useEffect, useRef, useState } from 'react'
import { createAppKit, useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { mainnet, base, polygon, arbitrum, solana } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { WagmiProvider, useSignMessage } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import bs58 from 'bs58'

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID
const HUB_DOMAIN = 'fbid.flowbond.life'
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, base, polygon, arbitrum, solana]

const metadata = {
  name: 'FlowBond Identity',
  description: 'One identity for the whole FlowBond ecosystem',
  url: 'https://fbid.flowbond.life',
  icons: ['https://fbid.flowbond.life/icon.png'],
}

const queryClient = new QueryClient()
let wagmiAdapter: WagmiAdapter | null = null
let enabled = false
if (projectId) {
  wagmiAdapter = new WagmiAdapter({ ssr: true, projectId, networks })
  createAppKit({
    adapters: [wagmiAdapter, new SolanaAdapter()],
    networks,
    projectId,
    metadata,
    features: { analytics: false, email: false, socials: [] },
  })
  enabled = true
}

function buildMessage(address: string, nonce: string, chainId?: string) {
  const issued = new Date().toISOString()
  return [
    `${HUB_DOMAIN} wants you to sign in with your wallet:`,
    address,
    '',
    'Sign in to FlowBond (FBID).',
    '',
    `URI: https://${HUB_DOMAIN}`,
    chainId ? `Chain ID: ${chainId}` : 'Chain: solana',
    `Nonce: ${nonce}`,
    `Issued At: ${issued}`,
  ].join('\n')
}

function Button({ label, onClick, disabled }: { label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm font-medium hover:bg-white/[0.08] transition disabled:opacity-50"
    >
      {label}
    </button>
  )
}

function Inner({ app, redirect }: { app: string; redirect: string }) {
  const { open } = useAppKit()
  const { address, isConnected, caipAddress } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<{ signMessage(m: Uint8Array): Promise<Uint8Array> }>('solana')
  const { signMessageAsync } = useSignMessage()

  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Continue with a wallet')
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)

  useEffect(() => {
    if (isConnected && pending.current) {
      pending.current = false
      void run()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, caipAddress])

  async function handleClick() {
    setError(null)
    if (isConnected && address) { void run(); return }
    pending.current = true
    await open()
  }

  async function run() {
    setError(null)
    setBusy(true)
    try {
      if (!caipAddress || !address) throw new Error('No wallet connected')
      const parts = caipAddress.split(':') // eip155:8453:0x.. | solana:..:..
      const chain: 'evm' | 'solana' = parts[0] === 'solana' ? 'solana' : 'evm'
      const chainId = chain === 'evm' ? parts[1] : undefined

      setStatus('Requesting nonce…')
      const nres = await fetch('/api/wallet/nonce', { method: 'POST' })
      const { nonce } = await nres.json()
      if (!nonce) throw new Error('Could not start sign-in')

      const message = buildMessage(address, nonce, chainId)

      setStatus('Check your wallet to sign…')
      let signature: string
      if (chain === 'evm') {
        signature = await signMessageAsync({ message, account: address as `0x${string}` })
      } else {
        if (!walletProvider) throw new Error('Solana wallet not ready — reconnect and try again')
        const sig = await walletProvider.signMessage(new TextEncoder().encode(message))
        signature = bs58.encode(sig)
      }

      setStatus('Verifying…')
      const vres = await fetch('/api/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain, address, chainId, message, signature, redirect, app }),
      })
      const data = await vres.json()
      if (!vres.ok || !data.redirect) throw new Error(data.error || 'Verification failed')

      // Hand the session back to the originating app (it redeems the token).
      window.location.assign(data.redirect)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Wallet sign-in failed'
      setError(msg.toLowerCase().includes('reject') ? 'Signature cancelled.' : msg)
      setStatus('Continue with a wallet')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button label={busy ? status : 'Continue with a wallet'} onClick={handleClick} disabled={busy} />
      {error && <p className="text-[11px] text-center text-red-400">{error}</p>}
    </div>
  )
}

export default function WalletAuthReown({ app, redirect }: { app: string; redirect: string }) {
  if (!enabled || !wagmiAdapter) {
    return <Button label="Wallet sign-in unavailable" disabled />
  }
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Inner app={app} redirect={redirect} />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
