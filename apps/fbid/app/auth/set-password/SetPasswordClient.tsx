'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { isAllowedRedirect } from '@flowbond/auth'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordClient() {
  const params = useSearchParams()
  const app = params.get('app') ?? ''
  const redirect = params.get('redirect')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'checking' | 'idle' | 'loading' | 'error' | 'no-session'>(
    'checking',
  )
  const [message, setMessage] = useState('')

  // The callback should have established a recovery session before sending us here.
  // If it didn't (link expired/reused, or opened detached from the flow), don't
  // strand the user on a form whose save will fail — show a clear path to a fresh
  // link instead.
  useEffect(() => {
    let active = true
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!active) return
        setStatus(data.user ? 'idle' : 'no-session')
      })
      .catch(() => active && setStatus('no-session'))
    return () => {
      active = false
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setStatus('error'); setMessage('Use at least 8 characters.'); return
    }
    setStatus('loading')
    const supabase = createClient()
    // Recovery session is already active on the hub from the callback.
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      // Almost always an expired/missing recovery session → route to a fresh link.
      setStatus('no-session'); return
    }
    // An app is waiting → hand the (now password-enabled) session back to it.
    // Otherwise this was a hub-mode recovery or a dashboard "set password" →
    // land on the FBID dashboard.
    if (redirect && isAllowedRedirect(redirect)) {
      window.location.assign(
        `/api/handoff?app=${encodeURIComponent(app)}&redirect=${encodeURIComponent(redirect)}`,
      )
    } else {
      window.location.assign('/')
    }
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

  return (
    <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 rounded-2xl p-8 flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-white">Set your password</h1>
        <p className="text-[var(--fb-muted)] text-sm">This password works across every FlowBond app.</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          required
          placeholder="New password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={status === 'loading'}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 transition text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-semibold transition-all disabled:opacity-50"
        >
          {status === 'loading' ? 'Saving…' : 'Save password & continue'}
        </button>
        {status === 'error' && <p className="text-red-400 text-xs text-center">{message}</p>}
      </form>
    </div>
  )
}
