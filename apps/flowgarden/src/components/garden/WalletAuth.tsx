'use client'

// Reown AppKit multichain (EVM + Solana) wallet sign-in for FlowGarden.
//
// This whole module is loaded via next/dynamic({ ssr: false }) from the login
// page, so createAppKit() only ever runs in the browser. The flow:
//   1. connect a wallet (AppKit modal)
//   2. fetch a one-time nonce from our server
//   3. sign a Sign-In message (SIWE for EVM, ed25519 for Solana)
//   4. server verifies the signature, links/creates a Supabase user, returns a
//      magic-link token_hash
//   5. client verifyOtp() → real Supabase session, just like email login.

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { createAppKit, useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { mainnet, base, polygon, arbitrum, solana } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { WagmiProvider, useSignMessage } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import bs58 from 'bs58'
import { createClient } from '@/lib/supabase/client'

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, base, polygon, arbitrum, solana]

const metadata = {
  name: 'FlowGarden',
  description: 'A living network of regenerative gardens',
  url: 'https://www.flowgarden.life',
  icons: ['https://www.flowgarden.life/logos/mark/flowgarden-mark-gold-1024.png'],
}

// Build the adapter + modal once, only when a projectId is configured.
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

function buildMessage(chain: 'evm' | 'solana', address: string, nonce: string) {
  const domain = 'www.flowgarden.life'
  const issued = new Date().toISOString()
  if (chain === 'evm') {
    return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to FlowGarden.\n\nURI: https://${domain}\nVersion: 1\nNonce: ${nonce}\nIssued At: ${issued}`
  }
  return `FlowGarden wants you to sign in with your Solana account:\n${address}\n\nSign in to FlowGarden.\n\nNonce: ${nonce}\nIssued At: ${issued}`
}

function WalletButton({
  label, onClick, disabled, title,
}: { label: string; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: 'rgba(239,232,216,0.05)', border: '1px solid rgba(239,232,216,0.1)', color: '#EFE8D8' }}
      onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => { if (!disabled) e.currentTarget.style.backgroundColor = 'rgba(239,232,216,0.1)' }}
      onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = 'rgba(239,232,216,0.05)')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 7.5V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2v-1.5M21 7.5H7m14 0v9m0-9h-3.5a2.5 2.5 0 000 5H21" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      {label}
    </button>
  )
}

function WalletSignInInner({ next }: { next: string }) {
  const { open } = useAppKit()
  const { address, isConnected, caipAddress } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<{ signMessage(m: Uint8Array): Promise<Uint8Array> }>('solana')
  const { signMessageAsync } = useSignMessage()

  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Continue with a wallet')
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)

  // Run sign-in automatically once a wallet connects after the user clicked.
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
      const chain: 'evm' | 'solana' = caipAddress.split(':')[0] === 'solana' ? 'solana' : 'evm'

      setStatus('Requesting nonce…')
      const nres = await fetch('/api/auth/wallet/nonce', { method: 'POST' })
      const { nonce } = await nres.json()
      if (!nonce) throw new Error('Could not start sign-in')

      const message = buildMessage(chain, address, nonce)

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
      const vres = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain, address, message, signature }),
      })
      const data = await vres.json()
      if (!vres.ok) throw new Error(data.error || 'Verification failed')

      const supabase = createClient()
      const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' })
      if (otpError) throw otpError

      window.location.href = next
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Wallet sign-in failed'
      setError(msg.toLowerCase().includes('reject') ? 'Signature cancelled.' : msg)
      setStatus('Continue with a wallet')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <WalletButton label={busy ? status : 'Continue with a wallet'} onClick={handleClick} disabled={busy} />
      {error && <p className="text-[11px] text-center text-red-400">{error}</p>}
    </div>
  )
}

export default function WalletAuth({ next }: { next: string }) {
  if (!enabled || !wagmiAdapter) {
    return <WalletButton label="Wallet sign-in (coming soon)" disabled title="Set NEXT_PUBLIC_REOWN_PROJECT_ID to enable" />
  }
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletSignInInner next={next} />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
