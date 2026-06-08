'use client'

// Lands here from the verification email. Redeems the one-time token — but the DB
// requires the caller to be signed in as the SAME FBID that requested the link
// (anti-pollution), so a stolen link is useless to anyone else.

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { confirmEmailLink } from '@flowbond/auth/identity'
import { createClient } from '@/lib/supabase/client'

function humanize(code?: string): string {
  switch (code) {
    case 'not_authenticated': return 'Please sign in to this FlowBond ID first, then open the link again.'
    case 'invalid_or_expired_token': return 'This link is invalid or has expired (links last 15 minutes and work once).'
    case 'linked_elsewhere': return 'That email was linked to a different FBID in the meantime.'
    default: return 'We couldn’t confirm this link. Try requesting it again.'
  }
}

export default function ConfirmEmailClient() {
  const token = useSearchParams().get('token') ?? ''
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working')
  const [msg, setMsg] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!token) { setState('error'); setMsg('Missing confirmation token.'); return }
    confirmEmailLink(createClient(), token)
      .then((r) => { setState('ok'); setMsg(r.email) })
      .catch((e: { message?: string }) => { setState('error'); setMsg(humanize(e?.message)) })
  }, [token])

  return (
    <div className="w-full max-w-sm text-center space-y-4">
      {state === 'working' && <p className="text-[var(--fb-muted)] text-sm">Confirming…</p>}
      {state === 'ok' && (
        <>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 text-xl">✓</div>
          <p className="text-white font-semibold">Email linked</p>
          <p className="text-[var(--fb-muted)] text-sm"><span className="text-white">{msg}</span> is now connected to your FlowBond ID — forever in your record.</p>
          <a href="/" className="inline-block text-violet-400 text-sm">Back to your identity →</a>
        </>
      )}
      {state === 'error' && (
        <>
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400 text-xl">!</div>
          <p className="text-white font-semibold">Couldn’t link this email</p>
          <p className="text-[var(--fb-muted)] text-sm">{msg}</p>
          <a href="/" className="inline-block text-violet-400 text-sm">Back to your identity →</a>
        </>
      )}
    </div>
  )
}
