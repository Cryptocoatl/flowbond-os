'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Invite = {
  title: string
  medium: string
  share: number
  invited_name: string
  by_name: string
}

export default function JoinClient({
  token,
  invite,
  signedIn,
  handle,
}: {
  token: string
  invite: Invite | null
  signedIn: boolean
  handle: string | null
}) {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'sent' | 'claiming' | 'done' | 'error'
  >('idle')
  const [msg, setMsg] = useState('')
  const [result, setResult] = useState<{ cert_id: string; title: string; share: number } | null>(
    null,
  )

  const card =
    'w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur p-8 space-y-5'
  const muted = 'text-[var(--fb-muted)] text-sm leading-relaxed'

  if (!invite) {
    return (
      <div className={card}>
        <div className="text-2xl">🌀</div>
        <h1 className="text-xl font-bold text-white">This invite isn’t active</h1>
        <p className={muted}>
          The link may have already been claimed or expired. Ask whoever registered the work to
          send you a fresh one.
        </p>
        <a href="https://flowbond.life" className="inline-block text-sm font-semibold text-violet-300">
          flowbond.life →
        </a>
      </div>
    )
  }

  const mediumWord =
    invite.medium === 'music' ? 'track' : invite.medium === 'video' ? 'video' : 'work'

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setMsg('')
    const cb = new URL('/auth/callback', window.location.origin)
    cb.searchParams.set('next', `/join/${token}`)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: cb.toString(), shouldCreateUser: true },
    })
    if (error) {
      setStatus('error')
      setMsg(error.message)
      return
    }
    setStatus('sent')
  }

  async function claim() {
    setStatus('claiming')
    setMsg('')
    const { data, error } = await supabase.rpc('origo_claim_invite', { p_token: token })
    if (error) {
      setStatus('error')
      setMsg(error.message)
      return
    }
    const row = Array.isArray(data) && data[0] ? (data[0] as typeof result) : null
    setResult(row)
    setStatus('done')
  }

  if (status === 'done' && result) {
    return (
      <div className={card}>
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl">
          ✓
        </div>
        <h1 className="text-xl font-bold text-white">It’s yours.</h1>
        <p className={muted}>
          <span className="text-white font-semibold">{Number(result.share)}%</span> of “{result.title}
          ” is now bound to your FlowBond identity
          {handle ? (
            <>
              {' '}
              (<span className="text-white">@{handle}</span>)
            </>
          ) : null}{' '}
          — certificate <span className="text-white">{result.cert_id}</span>.
        </p>
        <p className={muted}>This ownership record is permanent and provably yours.</p>
        <a href="/" className="inline-block text-sm font-semibold text-violet-300">
          Go to your FlowBond →
        </a>
      </div>
    )
  }

  return (
    <div className={card}>
      <div className="text-xs font-bold tracking-widest uppercase text-violet-300">
        ORIGO · Proof of Human
      </div>
      <h1 className="text-2xl font-bold text-white leading-tight">
        You’ve been credited as a co-creator.
      </h1>
      <p className={muted}>
        <span className="text-white">{invite.by_name}</span> registered the {mediumWord}{' '}
        <span className="text-white">“{invite.title}”</span> and assigned you a{' '}
        <span className="text-white font-semibold">{Number(invite.share)}%</span> ownership share.
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm space-y-2">
        <div className="flex justify-between">
          <span className={muted}>Your share</span>
          <span className="text-white font-semibold">{Number(invite.share)}%</span>
        </div>
        <div className="flex justify-between">
          <span className={muted}>Credited as</span>
          <span className="text-white">{invite.invited_name}</span>
        </div>
      </div>

      {signedIn ? (
        <>
          <button
            onClick={claim}
            disabled={status === 'claiming'}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition disabled:opacity-50"
          >
            {status === 'claiming' ? 'Claiming…' : `Claim my ${Number(invite.share)}%`}
          </button>
          <p className={muted}>
            Signed in{handle ? <> as <span className="text-white">@{handle}</span></> : null}.
            Claiming binds this share to your FlowBond identity forever.
          </p>
        </>
      ) : status === 'sent' ? (
        <div className="text-center space-y-2 py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 text-xl">
            ✓
          </div>
          <p className="font-semibold text-white">Check your inbox</p>
          <p className={muted}>
            We sent a secure link to <span className="text-white">{email}</span>. Open it to create
            or sign into your FlowBond identity and lock in your share.
          </p>
        </div>
      ) : (
        <form onSubmit={sendLink} className="space-y-3">
          <p className={muted}>
            Sign in with your FlowBond identity to claim it. New here? This creates your free
            FlowBond identity.
          </p>
          <input
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 transition text-sm"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition disabled:opacity-50"
          >
            {status === 'sending' ? 'Sending…' : 'Sign in to claim'}
          </button>
        </form>
      )}

      {status === 'error' && <p className="text-rose-300 text-xs">{msg}</p>}
      <p className="text-[var(--fb-muted)] text-[11px] pt-2 border-t border-white/5">
        Powered by FlowBond · your identity, your rights.
      </p>
    </div>
  )
}
