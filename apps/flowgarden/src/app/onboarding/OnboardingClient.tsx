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

// A handful of starting shapes so the first screen asks a question the user can
// actually answer, instead of a blank "Garden name" box.
const PRESETS: { emoji: string; label: string; name: string; description: string }[] = [
  { emoji: '🏡', label: 'Backyard',  name: 'Backyard Garden',  description: 'Beds and pots around the house' },
  { emoji: '🪴', label: 'Balcony',   name: 'Balcony Garden',   description: 'Containers on a balcony or windowsill' },
  { emoji: '🌾', label: 'Plot',      name: 'The Plot',         description: 'A patch of land growing food' },
  { emoji: '🏘️', label: 'Community', name: 'Community Garden', description: 'A shared garden tended by several people' },
]

export default function OnboardingClient({ email, existingDisplayName, inviteCode: initialCode }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>(initialCode ? 'join' : 'create')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const defaultName = existingDisplayName ?? email.split('@')[0]

  const [gardenName, setGardenName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [displayName, setDisplayName] = useState(defaultName)
  const [preset, setPreset] = useState<string | null>(null)

  const [inviteCode, setInviteCode] = useState(initialCode ?? '')
  const [joinDisplayName, setJoinDisplayName] = useState(defaultName)

  function applyPreset(p: (typeof PRESETS)[number]) {
    if (preset === p.label) { setPreset(null); return }
    setPreset(p.label)
    if (!gardenName.trim()) setGardenName(p.name)
    if (!description.trim()) setDescription(p.description)
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!gardenName.trim()) { setError('Your garden needs a name.'); return }
    startTransition(async () => {
      const res = await fetch('/api/flowgarden/gardens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: gardenName.trim(),
          description,
          location_label: location,
          display_name: displayName,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? 'Failed to create garden'); return }
      router.push('/')
      router.refresh()
    })
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (inviteCode.trim().length < 4) { setError('That invite code looks too short.'); return }
    startTransition(async () => {
      const res = await fetch('/api/flowgarden/gardens/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: inviteCode.trim(), display_name: joinDisplayName }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? 'Failed to join garden'); return }
      router.push('/')
      router.refresh()
    })
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-fg-bg">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-7">
          <FlowGardenLockup width={170} color="gold" />
        </div>

        <h1 className="page-title text-center">
          {tab === 'join' ? 'Join a garden' : 'Plant your garden'}
        </h1>
        <p className="text-sm text-center mt-2 mb-7" style={{ color: 'var(--fg-text-muted)' }}>
          {tab === 'join'
            ? 'Enter the code the garden owner shared with you.'
            : 'One minute of setup, then FlowMe takes it from there.'}
        </p>

        {/* Tab switcher */}
        <div
          className="flex rounded-xl p-1 mb-5"
          style={{ backgroundColor: 'var(--fg-panel)', border: '1px solid var(--fg-border)' }}
          role="tablist"
        >
          {(['create', 'join'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => { setTab(t); setError(null) }}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors"
              style={
                tab === t
                  ? { backgroundColor: 'var(--fg-green)', color: '#fff' }
                  : { color: 'var(--fg-text-secondary)' }
              }
            >
              {t === 'create' ? 'Create a garden' : 'Join a garden'}
            </button>
          ))}
        </div>

        <div className="card">
          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <span className="field-label">What kind of garden is it?</span>
                <div className="grid grid-cols-4 gap-2">
                  {PRESETS.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p)}
                      aria-pressed={preset === p.label}
                      className="rounded-xl px-2 py-3 text-center transition-colors"
                      style={{
                        backgroundColor: preset === p.label ? 'var(--fg-gold-bg)' : 'var(--fg-panel)',
                        border: `1px solid ${preset === p.label ? 'var(--fg-border-accent)' : 'var(--fg-border)'}`,
                        color: preset === p.label ? 'var(--fg-gold)' : 'var(--fg-text-secondary)',
                      }}
                    >
                      <span className="block text-xl leading-none mb-1.5" aria-hidden>{p.emoji}</span>
                      <span className="block text-[11px] leading-tight">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="o-garden" className="field-label">
                  Garden name <span style={{ color: 'var(--fg-danger)' }}>*</span>
                </label>
                <input
                  id="o-garden"
                  type="text"
                  value={gardenName}
                  onChange={e => setGardenName(e.target.value)}
                  placeholder="Lake Castle Back Garden"
                  required
                  className="input-field"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="o-name" className="field-label">Your name</label>
                  <input
                    id="o-name"
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Sofia"
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="o-loc" className="field-label">
                    Location <span style={{ color: 'var(--fg-text-dim)' }}>(optional)</span>
                  </label>
                  <input
                    id="o-loc"
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Medellín, Colombia"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="o-desc" className="field-label">
                  What are you growing? <span style={{ color: 'var(--fg-text-dim)' }}>(optional)</span>
                </label>
                <textarea
                  id="o-desc"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="A regenerative food garden in the backyard…"
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              {error && <p className="alert-error">{error}</p>}

              <button type="submit" disabled={isPending} className="btn-primary w-full justify-center py-3 disabled:opacity-60">
                {isPending ? 'Creating…' : 'Create garden 🌱'}
              </button>

              <p className="text-[11px] text-center leading-relaxed" style={{ color: 'var(--fg-text-dim)' }}>
                Your garden is private by default. Nothing appears on the world map until you choose to share it.
              </p>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <div>
                <label htmlFor="o-code" className="field-label">
                  Invite code <span style={{ color: 'var(--fg-danger)' }}>*</span>
                </label>
                <input
                  id="o-code"
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  required
                  maxLength={8}
                  className="input-field font-mono tracking-[0.3em] text-center text-lg py-3"
                />
                <p className="text-xs mt-1.5" style={{ color: 'var(--fg-text-muted)' }}>
                  Ask the garden owner for their 8-character code — it&rsquo;s on their dashboard under
                  &ldquo;Invite to the Flow&rdquo;.
                </p>
              </div>

              <div>
                <label htmlFor="o-jname" className="field-label">Your name</label>
                <input
                  id="o-jname"
                  type="text"
                  value={joinDisplayName}
                  onChange={e => setJoinDisplayName(e.target.value)}
                  placeholder="Sofia"
                  className="input-field"
                />
              </div>

              {error && <p className="alert-error">{error}</p>}

              <button type="submit" disabled={isPending} className="btn-primary w-full justify-center py-3 disabled:opacity-60">
                {isPending ? 'Joining…' : 'Join garden'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
