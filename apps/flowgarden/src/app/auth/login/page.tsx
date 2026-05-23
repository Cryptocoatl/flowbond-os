'use client'

import { Suspense, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FlowGardenLockup } from '@flowbond/ui'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/flowgarden'
  const urlError = searchParams.get('error')

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(
    urlError === 'auth_failed' ? 'Authentication failed. Please try again.' : null
  )
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const supabase = createClient()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    startTransition(async () => {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setError(error.message)
          return
        }
        router.push(next)
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split('@')[0] },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        })
        if (error) {
          setError(error.message)
          return
        }
        setMessage('Check your email to confirm your account, then come back to sign in.')
      }
    })
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex justify-center mb-10">
        <FlowGardenLockup width={200} color="gold" />
      </div>

      <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-8">
        <h1 className="text-flow-cream text-xl font-semibold text-center mb-1">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-stone-400 text-sm text-center mb-6">
          {mode === 'signin' ? 'Sign in to your garden' : 'Start growing together'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs text-stone-400 mb-1">Your name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Sofia"
                className="input-field"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-stone-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="input-field"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {message && (
            <p className="text-emerald-400 text-xs bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors mt-1"
          >
            {isPending
              ? mode === 'signin' ? 'Signing in…' : 'Creating account…'
              : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setMessage(null) }}
            className="text-stone-400 hover:text-flow-cream text-xs transition-colors"
          >
            {mode === 'signin'
              ? "Don't have an account? Create one"
              : 'Already have an account? Sign in'}
          </button>
        </div>
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
