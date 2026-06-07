'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { isAllowedRedirect } from '@flowbond/auth'
import { createClient } from '@/lib/supabase/client'

type Status = 'idle' | 'loading' | 'sent' | 'recovery-sent' | 'error'
type Method = 'magic' | 'password'

const APP_LABELS: Record<string, string> = {
  astroflow: 'AstroFlow',
  flowgarden: 'FlowGarden',
  flowbond: 'FlowBond',
  danz: 'DANZ.NOW',
  xelva: 'Xelva',
  deck: 'FlowBond Deck',
  ops: 'FlowBond Ops',
  flowme: 'FlowMe',
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
  const [password, setPassword] = useState('')
  const [method, setMethod] = useState<Method>('magic')
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
    // The magic link always lands on the HUB's own callback (the only
    // emailRedirectTo guaranteed to pass Supabase's allowlist — app callbacks
    // on new domains get silently rewritten). In app mode we thread the app +
    // its callback through as query params (probe-verified to survive the
    // allowlist); the hub callback then hands the session off to the app via
    // /api/handoff. Side benefit: every login also establishes the hub
    // session, so "remember this device" SSO works from the very first login.
    let cleanRedirect = redirect
    try { const u = new URL(redirect); cleanRedirect = u.origin + u.pathname } catch {}
    const hubCb = new URL('/auth/callback', FBID_ORIGIN)
    if (!hubMode) {
      hubCb.searchParams.set('app', app)
      hubCb.searchParams.set('redirect', cleanRedirect)
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: { emailRedirectTo: hubCb.toString(), shouldCreateUser: true },
    })
    setStatus(error ? 'error' : 'sent')
    if (error) setMessage(error.message)
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })
    if (error) {
      setStatus('error')
      // Don't parrot raw API errors; one friendly line covers wrong password,
      // no password set yet, AND non-existent account (no enumeration).
      setMessage('That didn’t match. Try again, or use a magic link — it always works.')
      return
    }
    // Session now lives on the hub domain ("remember this device" = it persists).
    // Hub visit → dashboard. App visit → seamless token handoff to the app.
    if (hubMode) {
      window.location.assign('/')
    } else {
      window.location.assign(
        `/api/handoff?app=${encodeURIComponent(app)}&redirect=${encodeURIComponent(redirect)}`,
      )
    }
  }

  async function forgotPassword() {
    const addr = email.toLowerCase().trim()
    if (!addr) {
      setStatus('error')
      setMessage('Enter your email first, then tap “Forgot password”.')
      return
    }
    setStatus('loading')
    setMessage('')
    const supabase = createClient()
    // Recovery returns to the HUB's own callback (?code, same-domain PKCE), which
    // routes to /auth/set-password. Probe-verified against the live allowlist.
    const { error } = await supabase.auth.resetPasswordForEmail(addr, {
      redirectTo: `${FBID_ORIGIN}/auth/callback?next=/auth/set-password`,
    })
    setStatus(error ? 'error' : 'recovery-sent')
    if (error) setMessage(error.message)
  }

  if (status === 'sent' || status === 'recovery-sent') {
    return (
      <Card>
        <div className="text-center space-y-3 py-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 text-xl">
            ✓
          </div>
          <p className="font-semibold text-white">Check your inbox</p>
          <p className="text-[var(--fb-muted)] text-sm leading-relaxed">
            {status === 'sent' ? (
              <>
                We sent a magic link to <span className="text-white">{email}</span>.
                <br />
                Open it to continue into {appLabel}.
              </>
            ) : (
              <>
                We sent a password-reset link to <span className="text-white">{email}</span>.
                <br />
                Open it to choose a new password.
              </>
            )}
          </p>
        </div>
      </Card>
    )
  }

  const inputCls =
    'w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 transition text-sm disabled:opacity-50'

  return (
    <Card>
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-white">Enter FlowBond</h1>
        <p className="text-[var(--fb-muted)] text-sm">
          {method === 'magic'
            ? <>One identity for {appLabel}. No password needed — we&apos;ll email you a secure link.</>
            : <>One identity for {appLabel}. Sign in with your FlowBond password.</>}
        </p>
      </div>

      <form
        onSubmit={method === 'magic' ? sendMagicLink : signInWithPassword}
        className="space-y-3"
      >
        <input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          className={inputCls}
        />

        {method === 'password' && (
          <input
            type="password"
            required
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={status === 'loading'}
            autoFocus
            className={inputCls}
          />
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-semibold transition-all disabled:opacity-50"
        >
          {status === 'loading'
            ? 'One moment…'
            : method === 'magic'
              ? 'Send magic link'
              : 'Sign in'}
        </button>

        {status === 'error' && (
          <p className="text-red-400 text-xs text-center">{message || 'Something went wrong. Try again.'}</p>
        )}
      </form>

      <div className="flex items-center justify-center gap-4 text-xs">
        {method === 'magic' ? (
          <button
            type="button"
            onClick={() => { setMethod('password'); setStatus('idle'); setMessage('') }}
            className="text-[var(--fb-muted)] hover:text-white transition"
          >
            I have a password
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => { setMethod('magic'); setStatus('idle'); setMessage('') }}
              className="text-[var(--fb-muted)] hover:text-white transition"
            >
              Use magic link instead
            </button>
            <span className="text-zinc-700">·</span>
            <button
              type="button"
              onClick={forgotPassword}
              disabled={status === 'loading'}
              className="text-[var(--fb-muted)] hover:text-white transition disabled:opacity-50"
            >
              Forgot password?
            </button>
          </>
        )}
      </div>

      <p className="text-zinc-600 text-[11px] text-center leading-relaxed">
        You&apos;ll stay signed in on this device.
        <br />
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
