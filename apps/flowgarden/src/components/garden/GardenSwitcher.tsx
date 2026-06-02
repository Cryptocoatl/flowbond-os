'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface GardenOption {
  id: string
  name: string
  role: string
}

// Compact garden switcher for the dark sidebar / mobile header.
// Lists every garden the user belongs to, switches the active one,
// and opens an inline "New garden" creator.
export function GardenSwitcher({
  gardens,
  activeId,
  activeName,
}: {
  gardens: GardenOption[]
  activeId: string
  activeName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function switchTo(id: string) {
    if (id === activeId) {
      setOpen(false)
      return
    }
    setSwitchingId(id)
    try {
      await fetch('/api/flowgarden/active-garden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ garden_id: id }),
      })
      setOpen(false)
      router.push('/flowgarden')
      router.refresh()
    } finally {
      setSwitchingId(null)
    }
  }

  return (
    <div className="relative" ref={ref} data-tour="garden-switcher">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-left"
        style={{ backgroundColor: open ? 'rgba(239,232,216,0.06)' : 'transparent' }}
      >
        <span
          className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-sm"
          style={{ backgroundColor: 'rgba(201,169,97,0.13)' }}
        >
          🪴
        </span>
        <span className="flex-1 min-w-0">
          <span
            className="block text-[10px] uppercase tracking-widest"
            style={{ color: 'rgba(239,232,216,0.4)' }}
          >
            Garden
          </span>
          <span
            className="block text-sm font-semibold truncate"
            style={{ color: 'var(--fg-sidebar-text-active)' }}
          >
            {activeName}
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 shrink-0 transition-transform"
          style={{ color: 'var(--fg-sidebar-text)', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 mt-1.5 z-50 rounded-xl overflow-hidden py-1"
          style={{
            backgroundColor: '#0E2010',
            border: '1px solid var(--fg-sidebar-border)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          }}
        >
          {gardens.map(g => {
            const active = g.id === activeId
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => switchTo(g.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left"
                style={{ color: active ? 'var(--fg-sidebar-active-text)' : 'var(--fg-sidebar-text)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,232,216,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="w-4 text-center shrink-0">{active ? '✓' : ''}</span>
                <span className="flex-1 truncate">{g.name}</span>
                {switchingId === g.id && <span className="text-[10px] opacity-60">…</span>}
                <span className="text-[9px] uppercase tracking-wide opacity-50">{g.role}</span>
              </button>
            )
          })}
          <div className="my-1" style={{ borderTop: '1px solid var(--fg-sidebar-border)' }} />
          <button
            type="button"
            onClick={() => { setOpen(false); setCreating(true) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left"
            style={{ color: 'var(--fg-sidebar-active-text)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,232,216,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span className="w-4 text-center shrink-0 text-fg-gold">＋</span>
            <span className="flex-1">New garden</span>
          </button>
        </div>
      )}

      {creating && <CreateGardenModal onClose={() => setCreating(false)} />}
    </div>
  )
}

function CreateGardenModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Give your garden a name')
      return
    }
    startTransition(async () => {
      const res = await fetch('/api/flowgarden/gardens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location_label: location, description }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not create the garden')
        return
      }
      onClose()
      router.push('/flowgarden')
      router.refresh()
    })
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(7,16,9,0.6)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={submit}
        className="card w-full max-w-sm"
        style={{ animation: 'fg-fade-up 0.25s ease both' }}
      >
        <h2 className="font-display text-xl font-bold text-fg">Plant a new garden 🌱</h2>
        <p className="text-xs text-fg-muted mt-1 mb-4">
          Each garden has its own plants, missions, journal and team.
        </p>

        <label className="block text-xs font-medium text-fg-secondary mb-1">Garden name</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Rooftop Greens"
          className="input-field mb-3"
        />

        <label className="block text-xs font-medium text-fg-secondary mb-1">
          Location <span className="text-fg-dim">(optional)</span>
        </label>
        <input
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="City, country"
          className="input-field mb-3"
        />

        <label className="block text-xs font-medium text-fg-secondary mb-1">
          What are you growing? <span className="text-fg-dim">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="A few words about this garden"
          rows={2}
          className="input-field mb-4 resize-none"
        />

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn-primary flex-1 justify-center disabled:opacity-60">
            {pending ? 'Creating…' : 'Create garden'}
          </button>
        </div>
      </form>
    </div>
  )
}
