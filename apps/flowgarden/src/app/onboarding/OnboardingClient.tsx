'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FlowGardenLockup } from '@flowbond/ui'

interface Props {
  email: string
  existingDisplayName: string | null
  inviteCode: string | null
}

type Tab = 'create' | 'join'

export default function OnboardingClient({ email, existingDisplayName, inviteCode: initialCode }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>(initialCode ? 'join' : 'create')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const defaultName = existingDisplayName ?? email.split('@')[0]

  // Create garden form state
  const [gardenName, setGardenName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [displayName, setDisplayName] = useState(defaultName)

  // Join garden form state
  const [inviteCode, setInviteCode] = useState(initialCode ?? '')
  const [joinDisplayName, setJoinDisplayName] = useState(defaultName)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/flowgarden/gardens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: gardenName,
          description,
          location_label: location,
          display_name: displayName,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create garden')
        return
      }
      router.push('/')
      router.refresh()
    })
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/flowgarden/gardens/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_code: inviteCode,
          display_name: joinDisplayName,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to join garden')
        return
      }
      router.push('/')
      router.refresh()
    })
  }

  return (
    <main className="min-h-screen bg-flow-dark flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <FlowGardenLockup width={180} color="gold" />
        </div>

        <h1 className="text-flow-cream text-2xl font-semibold text-center mb-2">
          Welcome to your garden
        </h1>
        <p className="text-stone-400 text-sm text-center mb-8">
          Create a new garden or join an existing one with an invite code.
        </p>

        {/* Tab switcher */}
        <div className="flex bg-stone-900/80 border border-stone-700 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => { setTab('create'); setError(null) }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === 'create'
                ? 'bg-emerald-700 text-white'
                : 'text-stone-400 hover:text-flow-cream'
            }`}
          >
            Create a garden
          </button>
          <button
            type="button"
            onClick={() => { setTab('join'); setError(null) }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === 'join'
                ? 'bg-emerald-700 text-white'
                : 'text-stone-400 hover:text-flow-cream'
            }`}
          >
            Join a garden
          </button>
        </div>

        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-8">
          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
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

              <div>
                <label className="block text-xs text-stone-400 mb-1">Garden name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={gardenName}
                  onChange={e => setGardenName(e.target.value)}
                  placeholder="Lake Castle Back Garden"
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">Description <span className="text-stone-600">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="A regenerative food garden in the backyard…"
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">Location <span className="text-stone-600">(optional)</span></label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Medellín, Colombia"
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
                disabled={isPending}
                className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors mt-1"
              >
                {isPending ? 'Creating…' : 'Create garden'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Your name</label>
                <input
                  type="text"
                  value={joinDisplayName}
                  onChange={e => setJoinDisplayName(e.target.value)}
                  placeholder="Sofia"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">Invite code <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  required
                  maxLength={8}
                  className="input-field font-mono tracking-widest text-center text-lg"
                />
                <p className="text-xs text-stone-500 mt-1">
                  Ask the garden owner to share their 8-character invite code.
                </p>
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors mt-1"
              >
                {isPending ? 'Joining…' : 'Join garden'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
