'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EditModal } from '@/components/garden/EditModal'

const eventTypeOptions = [
  { value: 'text_observation', label: '📝 Observation' },
  { value: 'planting', label: '🌱 Planting' },
  { value: 'watering', label: '💧 Watering' },
  { value: 'harvest', label: '🌾 Harvest' },
  { value: 'pest_observed', label: '⚠️ Pest observed' },
  { value: 'disease_observed', label: '🔴 Disease observed' },
  { value: 'pruning', label: '✂️ Pruning' },
  { value: 'fertilizing', label: '🧪 Fertilizing' },
  { value: 'compost_added', label: '🍂 Compost added' },
  { value: 'transplant', label: '🪴 Transplant' },
  { value: 'question_asked', label: '💬 Question/note' },
]

const eventTypeIcons: Record<string, string> = {
  text_observation: '📝', planting: '🌱', watering: '💧',
  pest_observed: '⚠️', disease_observed: '🔴', pruning: '✂️',
  fertilizing: '🧪', compost_added: '🍂', mulch_added: '🪵',
  harvest: '🌾', germination: '🌿', transplant: '🪴',
  photo_uploaded: '📷', voice_note_uploaded: '🎙',
  question_asked: '💬', task_completed: '✅',
  ai_recommendation: '🤖', system_summary: '📊',
}

const urgencyOptions = ['none', 'low', 'medium', 'high', 'urgent']

interface GardenEvent {
  id: string
  event_type: string
  title: string
  structured_summary: string | null
  raw_input: string | null
  urgency: string
  media_urls: string[] | null
  occurred_at: string
}

interface Zone { id: string; name: string }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

const emptyForm = {
  event_type: 'text_observation', title: '', structured_summary: '',
  urgency: 'none', zone_id: '', occurred_at: '',
}

export function JournalClient({ events, zones }: { events: GardenEvent[]; zones: Zone[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/flowgarden/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          zone_id: form.zone_id || null,
          occurred_at: form.occurred_at || new Date().toISOString(),
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Something went wrong')
        return
      }
      setOpen(false)
      setForm(emptyForm)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await fetch(`/api/flowgarden/journal/${id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      router.refresh()
    })
  }

  const f = (field: keyof typeof form, val: string) =>
    setForm(prev => ({ ...prev, [field]: val }))

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6 md:mb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Garden Journal</h1>
            <p className="text-sm text-stone-400 mt-1">
              {events.length} entr{events.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
          <button onClick={() => setOpen(true)} className="btn-primary shrink-0">
            + Add entry
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="card border-dashed border-stone-200 bg-stone-50/50 text-center py-16">
          <p className="text-2xl mb-3">📖</p>
          <p className="text-stone-600 font-medium">No journal entries yet</p>
          <p className="text-stone-400 text-sm mt-1 mb-4">
            Everything you tell the Garden Intelligence is automatically logged here. You can also add entries manually.
          </p>
          <button onClick={() => setOpen(true)} className="btn-primary">Add first entry</button>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => {
            const icon = eventTypeIcons[event.event_type] ?? '📝'
            const dateStr = new Date(event.occurred_at).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
            })
            return (
              <div key={event.id} className="card group">
                <div className="flex items-start gap-3">
                  <div className="text-xl shrink-0 mt-0.5">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-stone-900 leading-tight">{event.title}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-stone-400">{timeAgo(event.occurred_at)}</span>
                        <button
                          onClick={() => setConfirmDelete(event.id)}
                          className="text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-xs leading-none"
                          title="Delete entry"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {event.structured_summary && (
                      <p className="text-xs text-stone-600 leading-relaxed">{event.structured_summary}</p>
                    )}
                    {event.media_urls && event.media_urls.length > 0 && (
                      <span className="inline-flex items-center gap-1 mt-2 text-[10px] text-stone-400">
                        📎 {event.media_urls.length} photo{event.media_urls.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <p className="text-[10px] text-stone-300 mt-1.5">{dateStr}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New entry modal */}
      {open && (
        <EditModal title="Add journal entry" onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Type</label>
              <select
                className="input-field-light"
                value={form.event_type}
                onChange={e => f('event_type', e.target.value)}
              >
                {eventTypeOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Title *</label>
              <input
                className="input-field-light"
                value={form.title}
                onChange={e => f('title', e.target.value)}
                placeholder="What happened?"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Notes</label>
              <textarea
                className="input-field resize-none"
                rows={3}
                value={form.structured_summary}
                onChange={e => f('structured_summary', e.target.value)}
                placeholder="Details, observations..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Zone</label>
                <select
                  className="input-field-light"
                  value={form.zone_id}
                  onChange={e => f('zone_id', e.target.value)}
                >
                  <option value="">No zone</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Urgency</label>
                <select
                  className="input-field-light"
                  value={form.urgency}
                  onChange={e => f('urgency', e.target.value)}
                >
                  {urgencyOptions.map(u => (
                    <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 btn-secondary">Cancel</button>
              <button type="submit" disabled={isPending} className="flex-1 btn-primary">
                {isPending ? 'Adding…' : 'Add entry'}
              </button>
            </div>
          </form>
        </EditModal>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <EditModal title="Delete entry?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-stone-600 mb-4">This will permanently delete the journal entry.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 btn-secondary">Cancel</button>
            <button
              onClick={() => handleDelete(confirmDelete)}
              disabled={isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors"
            >
              {isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </EditModal>
      )}
    </div>
  )
}
