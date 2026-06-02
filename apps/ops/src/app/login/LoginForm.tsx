'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function LoginForm() {
  const [email, setEmail] = useState('cryptocoatl101@gmail.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const sb = createClient()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid credentials.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-ops-dim block mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="input"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <label className="text-xs text-ops-dim block mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className="input"
          required
          autoFocus
          autoComplete="current-password"
        />
      </div>
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full justify-center disabled:opacity-50 mt-1"
      >
        {loading ? 'Signing in...' : 'Enter'}
      </button>
    </form>
  )
}
