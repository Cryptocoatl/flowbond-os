'use client'
import { useState } from 'react'

interface Props { siteId: string }

const API_URL = process.env.NEXT_PUBLIC_FLOWEDIT_API_URL ?? 'http://localhost:4000'

type Role = 'editor' | 'approver' | 'viewer'

interface InviteResult {
  user:         { id: string; email: string; name: string }
  role:         string
  tempPassword: string | null
  isNewUser:    boolean
}

export function InviteForm({ siteId }: Props) {
  const [open,     setOpen]    = useState(false)
  const [name,     setName]    = useState('')
  const [email,    setEmail]   = useState('')
  const [role,     setRole]    = useState<Role>('editor')
  const [loading,  setLoading] = useState(false)
  const [result,   setResult]  = useState<InviteResult | null>(null)
  const [error,    setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null); setResult(null)
    try {
      const res  = await fetch(`${API_URL}/api/v1/flowedit/auth/invite`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, name, siteId, role }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error?.message ?? 'Invite failed'); return }
      setResult(json.data)
      setName(''); setEmail('')
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  function reset() { setResult(null); setOpen(false) }

  return (
    <div className="bg-zinc-900 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]" />
          <span className="text-white text-sm font-semibold">Invite Client / Partner</span>
          <span className="text-zinc-500 text-xs">· Add someone to this site</span>
        </div>
        {!open && !result && (
          <button
            onClick={() => setOpen(true)}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            + Invite
          </button>
        )}
      </div>

      {open && !result && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              className="bg-zinc-800 text-white placeholder-zinc-500 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="bg-zinc-800 text-white placeholder-zinc-500 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex gap-2 items-center">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="bg-zinc-800 text-white border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
            >
              <option value="editor">Editor — can make changes (go to review)</option>
              <option value="approver">Approver — can also approve/reject changes</option>
              <option value="viewer">Viewer — read-only access</option>
            </select>
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim() || !email.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-40 transition-colors"
              >
                {loading ? 'Inviting…' : 'Send Invite'}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </form>
      )}

      {result && (
        <div className="mt-4 bg-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-green-400 text-sm font-semibold">
              {result.isNewUser ? '✓ Account created' : '✓ Access updated'}
            </span>
            <span className="text-zinc-500 text-xs">· {result.user.email}</span>
            <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">{result.role}</span>
          </div>

          {result.isNewUser && result.tempPassword && (
            <div className="bg-zinc-900 rounded-lg p-3 mb-3">
              <p className="text-zinc-400 text-xs mb-1">Share these credentials with {result.user.name}:</p>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-xs w-16 shrink-0">Email</span>
                  <code className="text-blue-300 text-xs font-mono">{result.user.email}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-xs w-16 shrink-0">Password</span>
                  <code className="text-green-300 text-xs font-mono tracking-widest">{result.tempPassword}</code>
                </div>
              </div>
              <p className="text-zinc-600 text-xs mt-2">Ask them to change the password after first login.</p>
            </div>
          )}

          {!result.isNewUser && (
            <p className="text-zinc-400 text-xs">This person already had an account — their role for this site has been updated.</p>
          )}

          <button
            onClick={reset}
            className="text-xs text-zinc-500 hover:text-white transition-colors mt-1"
          >
            Invite another →
          </button>
        </div>
      )}
    </div>
  )
}
