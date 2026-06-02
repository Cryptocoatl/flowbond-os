'use client'

import Image from 'next/image'
import { Suspense, useEffect, useState, useTransition, type MouseEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function SetPasswordForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/flowgarden'

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ready, setReady] = useState(false)
  const [noSession, setNoSession] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const supabase = createClient()

  // Confirm we have a session (recovery link routes through /auth/callback first,
  // or the user is already signed in from Settings).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setReady(true)
      else setNoSession(true)
    })
  }, [supabase])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Use at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords don’t match.'); return }
    setError(null)
    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setError(error.message); return }
      // Best-effort flag so Settings stops nudging.
      await fetch('/api/flowgarden/profile/password-set', { method: 'POST' }).catch(() => {})
      setDone(true)
      setTimeout(() => { window.location.href = next }, 1200)
    })
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6" style={{ backgroundColor: '#050E07' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(15,46,25,0.95) 0%, rgba(5,14,7,0) 100%)' }} />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center" style={{ animation: 'fg-fade-up 0.8s ease-out both' }}>
        <div className="relative mb-6" style={{ width: 90, height: 90 }}>
          <Image src="/logos/mark/flowgarden-mark-gold-1024.png" alt="FlowGarden" fill className="object-contain" priority />
        </div>

        {done ? (
          <p className="text-center text-sm" style={{ color: '#C9A961' }}>Password set. Opening your garden…</p>
        ) : noSession ? (
          <div className="text-center">
            <h1 className="text-xl font-bold mb-2" style={{ color: '#EFE8D8' }}>Link expired</h1>
            <p className="text-sm mb-4" style={{ color: 'rgba(239,232,216,0.5)' }}>
              This password link is no longer valid. Request a fresh one from the sign-in page.
            </p>
            <a href="/auth/login" className="text-sm font-semibold underline" style={{ color: '#C9A961' }}>← Back to sign in</a>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold italic mb-2 text-center" style={{ fontFamily: 'var(--font-display)', color: '#EFE8D8' }}>
              Set your password
            </h1>
            <p className="text-sm mb-7 text-center leading-relaxed" style={{ color: 'rgba(239,232,216,0.5)' }}>
              From now on you can sign in instantly with your email and password.
            </p>

            <form onSubmit={handleSubmit} className="w-full rounded-2xl px-7 py-7 flex flex-col gap-4" style={{ backgroundColor: 'rgba(12,26,14,0.75)', backdropFilter: 'blur(20px)', border: '1px solid rgba(201,169,97,0.18)' }}>
              <div>
                <label className="block text-xs mb-2" style={{ color: 'rgba(239,232,216,0.45)' }}>New password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters" required autoFocus disabled={!ready}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ backgroundColor: 'rgba(239,232,216,0.04)', border: '1px solid rgba(239,232,216,0.10)', color: '#EFE8D8' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-2" style={{ color: 'rgba(239,232,216,0.45)' }}>Confirm password</label>
                <input
                  type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••" required disabled={!ready}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ backgroundColor: 'rgba(239,232,216,0.04)', border: '1px solid rgba(239,232,216,0.10)', color: '#EFE8D8' }}
                />
              </div>
              {error && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/30 rounded-xl px-4 py-2.5">{error}</p>}
              <button
                type="submit" disabled={isPending || !ready}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:opacity-50"
                style={{ backgroundColor: '#1A5C35', color: '#EFE8D8' }}
                onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => { if (!isPending && ready) e.currentTarget.style.backgroundColor = '#256B41' }}
                onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = '#1A5C35')}
              >
                {isPending ? 'Saving…' : ready ? 'Save password' : 'Verifying…'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#050E07' }} />}>
      <SetPasswordForm />
    </Suspense>
  )
}
