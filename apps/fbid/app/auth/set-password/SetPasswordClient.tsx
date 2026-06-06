'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { isAllowedRedirect } from '@flowbond/auth'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordClient() {
  const params = useSearchParams()
  const app = params.get('app') ?? ''
  const redirect = params.get('redirect')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')

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
      setStatus('error'); setMessage(error.message); return
    }
    // Hand the (now password-enabled) session back to the app.
    if (isAllowedRedirect(redirect)) {
      window.location.assign(
        `/api/handoff?app=${encodeURIComponent(app)}&redirect=${encodeURIComponent(redirect!)}`,
      )
    } else {
      setStatus('error'); setMessage('Password saved, but the return link was invalid.')
    }
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
