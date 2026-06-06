'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { isAllowedRedirect } from '@flowbond/auth'
import { createClient } from '@/lib/supabase/client'

// Browser-only: Reown's createAppKit() must not run on the server.
const WalletAuthReown = dynamic(() => import('./WalletAuthReown'), { ssr: false })

type Mode = 'magic' | 'password'
type Status = 'idle' | 'loading' | 'sent' | 'reset-sent' | 'error'

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
  // A direct visit (no app/redirect) defaults to a normal FlowBond sign-in
  // instead of erroring. An EXPLICIT but unrecognized redirect is still rejected
  // below (open-redirect guard) — defaults only kick in when nothing was passed.
  const DEFAULT_REDIRECT = 'https://flowbond.life/api/auth/callback'
  const app = params.get('app') ?? 'flowbond'
  const redirect = params.get('redirect') ?? DEFAULT_REDIRECT

  const validRedirect = useMemo(() => isAllowedRedirect(redirect), [redirect])
  const appLabel = APP_LABELS[app] ?? (app ? app : 'FlowBond')

  const [mode, setMode] = useState<Mode>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  // The app's own callback (where the session must land). Safe: allowlisted.
  const appCallback = redirect ?? ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const handoffUrl = `/api/handoff?app=${encodeURIComponent(app)}&redirect=${encodeURIComponent(appCallback)}`
  const hubCallback = (next?: string) =>
    `${origin}/auth/callback?app=${encodeURIComponent(app)}&redirect=${encodeURIComponent(appCallback)}${next ? `&next=${encodeURIComponent(next)}` : ''}`

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
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: { emailRedirectTo: appCallback, shouldCreateUser: true },
    })
    setStatus(error ? 'error' : 'sent')
    if (error) setMessage(error.message)
  }

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })
    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }
    // Session is now on the hub domain → bridge it to the app.
    window.location.assign(handoffUrl)
  }

  async function oauth(provider: 'google' | 'apple') {
    setStatus('loading')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: hubCallback() },
    })
    if (error) {
      setStatus('error')
      setMessage(error.message)
    }
  }

  async function forgotPassword() {
    if (!email) {
      setStatus('error')
      setMessage('Enter your email first, then tap reset.')
      return
    }
    setStatus('loading')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: hubCallback('/auth/set-password'),
    })
    setStatus(error ? 'error' : 'reset-sent')
    if (error) setMessage(error.message)
  }

  if (status === 'sent' || status === 'reset-sent') {
    return (
      <Card>
        <div className="text-center space-y-3 py-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 text-xl">
            ✓
          </div>
          <p className="font-semibold text-white">Check your inbox</p>
          <p className="text-[var(--fb-muted)] text-sm leading-relaxed">
            {status === 'reset-sent'
              ? 'We sent a link to reset your password.'
              : 'We sent a magic link to'}{' '}
            <span className="text-white">{email}</span>.
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
          One identity for {appLabel}. {mode === 'magic' ? 'No password needed.' : 'Sign in with your password.'}
        </p>
      </div>

      <form onSubmit={mode === 'magic' ? sendMagicLink : signInPassword} className="space-y-3">
        <input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 transition text-sm disabled:opacity-50"
        />
        {mode === 'password' && (
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={status === 'loading'}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 transition text-sm disabled:opacity-50"
          />
        )}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-semibold transition-all disabled:opacity-50"
        >
          {status === 'loading'
            ? 'Working…'
            : mode === 'magic'
              ? 'Send magic link'
              : 'Sign in'}
        </button>
        {status === 'error' && (
          <p className="text-red-400 text-xs text-center">{message || 'Something went wrong. Try again.'}</p>
        )}
      </form>

      <div className="flex items-center justify-between text-xs">
        <button
          onClick={() => { setMode(mode === 'magic' ? 'password' : 'magic'); setStatus('idle') }}
          className="text-[var(--fb-muted)] hover:text-white transition"
        >
          {mode === 'magic' ? 'Use a password instead' : 'Use a magic link instead'}
        </button>
        {mode === 'password' && (
          <button onClick={forgotPassword} className="text-[var(--fb-muted)] hover:text-white transition">
            Forgot / set password
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 text-[10px] text-zinc-600">
        <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <OAuthButton onClick={() => oauth('google')} label="Google" />
        <OAuthButton onClick={() => oauth('apple')} label="Apple" />
      </div>

      <WalletAuthReown app={app} redirect={appCallback} />

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

function OAuthButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm font-medium hover:bg-white/[0.08] transition"
    >
      {label}
    </button>
  )
}
