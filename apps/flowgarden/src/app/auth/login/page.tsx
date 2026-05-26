'use client'

import { Suspense, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FlowGardenLockup } from '@flowbond/ui'

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/flowgarden'
  const ref = searchParams.get('ref') ?? ''
  const urlError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(
    urlError === 'auth_failed' ? 'Link expired or invalid. Request a new one.' : null
  )
  const [isPending, startTransition] = useTransition()

  const supabase = createClient()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError(null)

    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`,
          shouldCreateUser: true,
        },
      })
      if (error) {
        setError(error.message)
      } else {
        setSent(true)
      }
    })
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex justify-center mb-10">
        <FlowGardenLockup width={200} color="gold" />
      </div>

      <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-8">
        {sent ? (
          <div className="text-center flex flex-col gap-4">
            <div className="text-4xl">📬</div>
            <h1 className="text-flow-cream text-lg font-semibold">Check your email</h1>
            <p className="text-stone-400 text-sm leading-relaxed">
              We sent a magic link to <span className="text-flow-cream">{email}</span>.
              Click it to open your garden — no password needed.
            </p>
            <button
              type="button"
              onClick={() => { setSent(false); setEmail('') }}
              className="text-stone-500 hover:text-stone-300 text-xs mt-2 transition-colors"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-flow-cream text-xl font-semibold text-center mb-1">
              Welcome to FlowGarden
            </h1>
            <p className="text-stone-400 text-sm text-center mb-6">
              Enter your email to receive a magic link
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="input-field"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending || !email.trim()}
                className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors mt-1"
              >
                {isPending ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-flow-dark flex flex-col items-center justify-center px-6 py-16">
      <Suspense fallback={<div className="text-stone-400 text-sm">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
