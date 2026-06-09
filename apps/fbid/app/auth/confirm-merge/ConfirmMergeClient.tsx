'use client'

// Merge confirmation: shows the dry-run (exactly what moves) for the token, then
// executes on confirm. The token is only valid for the winner session it was issued
// to — opened as the wrong account, the preview fails (anti-takeover).

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { mergePreview, confirmMerge, type MergePreview } from '@flowbond/auth/identity'
import { createClient } from '@/lib/supabase/client'

function humanize(code?: string): string {
  switch (code) {
    case 'not_authenticated': return 'Sign in to the account you want to keep, then open this link again.'
    case 'invalid_or_expired_token': return 'This merge link is invalid, used, or expired (links last 30 minutes and work once).'
    default: return 'We couldn’t process this merge. Request it again from Connected Accounts.'
  }
}

export default function ConfirmMergeClient() {
  const token = useSearchParams().get('token') ?? ''
  const [phase, setPhase] = useState<'loading' | 'review' | 'merging' | 'done' | 'error'>('loading')
  const [preview, setPreview] = useState<MergePreview | null>(null)
  const [msg, setMsg] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!token) { setPhase('error'); setMsg('Missing merge token.'); return }
    mergePreview(createClient(), token)
      .then((p) => { setPreview(p); setPhase('review') })
      .catch((e: { message?: string }) => { setPhase('error'); setMsg(humanize(e?.message)) })
  }, [token])

  async function confirm() {
    setPhase('merging')
    try {
      const r = await confirmMerge(createClient(), token)
      setMsg(r.loser_email)
      setPhase('done')
    } catch (e) {
      setPhase('error')
      setMsg(humanize((e as { message?: string })?.message))
    }
  }

  const rows = preview ? Object.entries(preview.by_column) : []

  return (
    <div className="w-full max-w-sm text-center space-y-4">
      {phase === 'loading' && <p className="text-[var(--fb-muted)] text-sm">Preparing your merge…</p>}

      {phase === 'review' && preview && (
        <>
          <p className="text-white font-semibold text-lg">Merge into your FlowBond ID</p>
          <p className="text-[var(--fb-muted)] text-sm">
            Folding <span className="text-white">{preview.loser_email}</span> into this account.
            Its login will be retired — this can’t be undone.
          </p>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-left text-sm">
            <p className="text-[var(--fb-muted)] text-xs uppercase tracking-wider mb-2">What moves</p>
            {preview.total_rows === 0 ? (
              <p className="text-[var(--fb-muted)] text-xs">Nothing to move — just retiring the empty login.</p>
            ) : (
              <ul className="space-y-1">
                {rows.map(([k, n]) => (
                  <li key={k} className="flex justify-between text-white text-xs">
                    <span className="text-[var(--fb-muted)]">{k}</span><span>{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={confirm}
            className="w-full px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-semibold transition"
          >
            Confirm merge
          </button>
          <a href="/" className="inline-block text-[var(--fb-muted)] text-xs">Cancel</a>
        </>
      )}

      {phase === 'merging' && <p className="text-[var(--fb-muted)] text-sm">Merging…</p>}

      {phase === 'done' && (
        <>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 text-xl">✓</div>
          <p className="text-white font-semibold">Merged</p>
          <p className="text-[var(--fb-muted)] text-sm"><span className="text-white">{msg}</span> is now part of your FlowBond ID.</p>
          <a href="/" className="inline-block text-violet-400 text-sm">Back to your identity →</a>
        </>
      )}

      {phase === 'error' && (
        <>
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400 text-xl">!</div>
          <p className="text-white font-semibold">Couldn’t merge</p>
          <p className="text-[var(--fb-muted)] text-sm">{msg}</p>
          <a href="/" className="inline-block text-violet-400 text-sm">Back to your identity →</a>
        </>
      )}
    </div>
  )
}
