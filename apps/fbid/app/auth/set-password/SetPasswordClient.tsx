'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { isAllowedRedirect } from '@flowbond/auth'
import { createClient } from '@/lib/supabase/client'

type Status = 'checking' | 'idle' | 'loading' | 'error' | 'no-session' | 'sent'

export default function SetPasswordClient() {
  const params = useSearchParams()
  const app = params.get('app') ?? ''
  const redirect = params.get('redirect')
  const mode = params.get('mode') // 'create' | 'recovery' | 'change' | null

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('checking')
  const [message, setMessage] = useState('')

  // The callback should have established a session before sending us here. If it
  // didn't (link expired/reused, or opened detached from the flow), don't strand
  // the user on a form whose save will fail — show a clear path to a fresh link.
  // Also resolves has_password() so we know whether to gate on the current one —
  // a recovery landing always skips that gate (that's the whole point of it).
  useEffect(() => {
    let active = true
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (!active) return
      if (!data.user) {
        setStatus('no-session')
        return
      }
      setEmail(data.user.email ?? null)
      const { data: hasPwd } = await supabase.rpc('has_password')
      if (!active) return
      setHasPassword(hasPwd === true)
      setStatus('idle')
    }
    load().catch(() => active && setStatus('no-session'))
    return () => {
      active = false
    }
  }, [])

  const requireCurrent = hasPassword && mode !== 'recovery'
  const showSkip = !hasPassword && mode !== 'recovery'

  function continueOn() {
    if (redirect && isAllowedRedirect(redirect)) {
      window.location.assign(
        `/api/handoff?app=${encodeURIComponent(app)}&redirect=${encodeURIComponent(redirect)}`,
      )
    } else {
      window.location.assign('/')
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    if (newPassword.length < 8) {
      setStatus('error'); setMessage('Use at least 8 characters.'); return
    }
    if (newPassword !== confirmPassword) {
      setStatus('error'); setMessage('Those two don’t match — try typing the new password again.'); return
    }
    if (requireCurrent && !currentPassword) {
      setStatus('error'); setMessage('Enter your current password.'); return
    }
    setStatus('loading')
    const supabase = createClient()

    // Changing an existing password requires proving you know the current one —
    // signInWithPassword re-verifies it without needing a separate endpoint.
    if (requireCurrent) {
      if (!email) { setStatus('no-session'); return }
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
      if (verifyError) {
        setStatus('error'); setMessage('Current password is incorrect.'); return
      }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      // Almost always an expired/missing session → route to a fresh link.
      setStatus('no-session'); return
    }
    continueOn()
  }

  // "Forgot your current password?" from inside the change-password form — sends
  // the same stateless token_hash recovery link as the sign-in screen (works on
  // any device, no code_verifier needed), which lands back here in recovery mode.
  async function forgotCurrent() {
    if (!email) return
    setStatus('loading')
    setMessage('')
    const supabase = createClient()
    const hubCb = new URL('/auth/callback', window.location.origin)
    hubCb.searchParams.set('next', '/auth/set-password')
    if (app) hubCb.searchParams.set('app', app)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: hubCb.toString(), shouldCreateUser: false },
    })
    if (error) {
      setStatus('error'); setMessage('Couldn’t send that link. Try again in a moment.'); return
    }
    setStatus('sent')
  }

  if (status === 'checking') {
    return <div className="text-[var(--fb-muted)] text-sm">Loading…</div>
  }

  if (status === 'no-session') {
    const back = new URL('/', window.location.origin)
    if (app) back.searchParams.set('app', app)
    if (redirect) back.searchParams.set('redirect', redirect)
    return (
      <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 rounded-2xl p-8 flex flex-col gap-5 text-center">
        <h1 className="text-lg font-bold text-white">This link expired</h1>
        <p className="text-[var(--fb-muted)] text-sm leading-relaxed">
          Password-reset links can only be used once, and they don’t last long. Get a fresh one —
          tap “Forgot password”, or just sign in with a magic link.
        </p>
        <a
          href={back.toString()}
          className="w-full px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-semibold transition-all"
        >
          Back to sign in
        </a>
      </div>
    )
  }

  if (status === 'sent') {
    return (
      <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 rounded-2xl p-8 flex flex-col gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 text-xl">
          ✓
        </div>
        <p className="font-semibold text-white">Check your inbox</p>
        <p className="text-[var(--fb-muted)] text-sm leading-relaxed">
          We sent a link to <span className="text-white">{email}</span>. Open it to set a new password —
          no need to remember the old one.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 rounded-2xl p-8 flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-white">{requireCurrent ? 'Change your password' : 'Set your password'}</h1>
        <p className="text-[var(--fb-muted)] text-sm">This password works across every FlowBond app.</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        {requireCurrent && (
          <PasswordField
            placeholder="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggleShow={() => setShowCurrent((s) => !s)}
            disabled={status === 'loading'}
          />
        )}
        <PasswordField
          placeholder="New password (8+ characters)"
          value={newPassword}
          onChange={setNewPassword}
          show={showNew}
          onToggleShow={() => setShowNew((s) => !s)}
          disabled={status === 'loading'}
          autoFocus={!requireCurrent}
        />
        <PasswordField
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showConfirm}
          onToggleShow={() => setShowConfirm((s) => !s)}
          disabled={status === 'loading'}
        />

        {requireCurrent && (
          <button
            type="button"
            onClick={forgotCurrent}
            disabled={status === 'loading'}
            className="text-[var(--fb-muted)] hover:text-white text-xs transition disabled:opacity-50"
          >
            Forgot your current password?
          </button>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-semibold transition-all disabled:opacity-50"
        >
          {status === 'loading' ? 'Saving…' : 'Save password & continue'}
        </button>
        {status === 'error' && <p className="text-red-400 text-xs text-center">{message}</p>}

        {showSkip && (
          <button
            type="button"
            onClick={continueOn}
            disabled={status === 'loading'}
            className="w-full text-[var(--fb-muted)] hover:text-white text-xs transition disabled:opacity-50"
          >
            Not now
          </button>
        )}
      </form>
    </div>
  )
}

function PasswordField({
  placeholder,
  value,
  onChange,
  show,
  onToggleShow,
  disabled,
  autoFocus,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow: () => void
  disabled?: boolean
  autoFocus?: boolean
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        required
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        className="w-full pl-4 pr-14 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 transition text-sm disabled:opacity-50"
      />
      <button
        type="button"
        onClick={onToggleShow}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fb-muted)] hover:text-white text-xs transition"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
