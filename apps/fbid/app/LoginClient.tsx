'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { isAllowedRedirect } from '@flowbond/auth'
import { createClient } from '@/lib/supabase/client'

type Status = 'idle' | 'loading' | 'sent' | 'error'

const APP_LABELS: Record<string, string> = {
  astroflow: 'AstroFlow',
  flowgarden: 'FlowGarden',
  flowbond: 'FlowBond',
  danz: 'DANZ.NOW',
  xelva: 'Xelva',
  deck: 'FlowBond Deck',
  ops: 'FlowBond Ops',
}

export default function LoginClient() {
  const params = useSearchParams()
  // HUB MODE: a direct visit (no app/redirect) logs the user into the hub ITSELF
  // (emailRedirectTo = the hub's own callback) so they land on the FBID dashboard.
  // APP MODE: an app sent them with ?app=&redirect= — log them into that app.
  // An EXPLICIT but unrecognized redirect is still rejected below (open-redirect guard).
  const FBID_ORIGIN = process.env.NEXT_PUBLIC_FBID_URL || 'https://fbid.flowbond.life'
  const hubMode = !params.get('app') && !params.get('redirect')
  const app = hubMode ? 'fbid' : (params.get('app') ?? 'flowbond')
  const redirect = hubMode
    ? `${FBID_ORIGIN}/auth/callback`
    : (params.get('redirect') ?? 'https://flowbond.life/api/auth/callback')

  const validRedirect = useMemo(() => isAllowedRedirect(redirect), [redirect])
  const appLabel = hubMode ? 'FlowBond' : (APP_LABELS[app] ?? (app || 'FlowBond'))

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  if (!validRedirect) {
    return (
      <Card>
        <div className="text-center space-y-2 py-2">
          <p className="font-semibold text-white">Invalid login request</p>
          <p className="text-[var(--fb-muted)] text-sm">
            This link didn&apos;t come from a recognized FlowBond app, so we won&apos;t continue.
          </p>
        </div>
      </Card>
    )
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    const supabase = createClient()
    // Pass a clean (query-less) callback as emailRedirectTo so the forwarder link
    // in the email is unambiguous. The email links to the hub's /auth/confirm
    // forwarder, which hands the token_hash to this app's callback (works
    // cross-domain, no PKCE verifier).
    let cleanRedirect = redirect
    try { const u = new URL(redirect); cleanRedirect = u.origin + u.pathname } catch {}
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: { emailRedirectTo: cleanRedirect, shouldCreateUser: true },
    })
    setStatus(error ? 'error' : 'sent')
    if (error) setMessage(error.message)
  }

  if (status === 'sent') {
    return (
      <Card>
        <div className="text-center space-y-3 py-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 text-xl">
            ✓
          </div>
          <p className="font-semibold text-white">Check your inbox</p>
          <p className="text-[var(--fb-muted)] text-sm leading-relaxed">
            We sent a magic link to <span className="text-white">{email}</span>.
            <br />
            Open it to continue into {appLabel}.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-white">Enter FlowBond</h1>
        <p className="text-[var(--fb-muted)] text-sm">
          One identity for {appLabel}. No password needed — we&apos;ll email you a secure link.
        </p>
      </div>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 transition text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-semibold transition-all disabled:opacity-50"
        >
          {status === 'loading' ? 'Sending…' : 'Send magic link'}
        </button>
        {status === 'error' && (
          <p className="text-red-400 text-xs text-center">{message || 'Something went wrong. Try again.'}</p>
        )}
      </form>

      <p className="text-zinc-600 text-[11px] text-center leading-relaxed">
        Your data is yours — sovereign by design.
      </p>
    </Card>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute -top-px left-1/2 -translate-x-1/2 w-40 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
      <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-8 flex flex-col gap-6">
        {children}
      </div>
    </div>
  )
}
