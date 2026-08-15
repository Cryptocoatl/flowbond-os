'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EditModal } from '@/components/garden/EditModal'
import { PageHeader } from '@/components/layout/PageHeader'
import { timeAgo, plural } from '@/lib/format'

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

const emptyForm = {
  event_type: 'text_observation', title: '', structured_summary: '',
  urgency: 'none', zone_id: '', occurred_at: '',
}

// "Today" / "Yesterday" / "Monday, March 4" — a journal reads as days, not rows.
function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  const sameYear = d.getFullYear() === today.getFullYear()
  return d.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

export function JournalClient({ events, zones }: { events: GardenEvent[]; zones: Zone[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Which event types actually appear, so the filter never offers a dead option.
  const presentTypes = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of events) m.set(e.event_type, (m.get(e.event_type) ?? 0) + 1)
    return m
  }, [events])

  const visible = useMemo(
    () => (typeFilter === 'all' ? events : events.filter(e => e.event_type === typeFilter)),
    [events, typeFilter],
  )

  const days = useMemo(() => {
    const groups: { label: string; items: GardenEvent[] }[] = []
    for (const e of visible) {
      const label = dayLabel(e.occurred_at)
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.items.push(e)
      else groups.push({ label, items: [e] })
    }
    return groups
  }, [visible])

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
        const json = await res.json().catch(() => ({}))
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
    <div className="page-narrow space-y-6">
      <PageHeader
        title="Garden Journal"
        subtitle={events.length === 0 ? 'The story of this garden, day by day' : plural(events.length, 'entry', 'entries')}
        action={<button type="button" onClick={() => setOpen(true)} className="btn-primary">+ Add entry</button>}
      />

      {events.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">📖</span>
          <p className="empty-title">The journal is blank</p>
          <p className="empty-body">
            Every thing you tell FlowMe lands here automatically — what you planted, what you noticed,
            what you harvested. You can also write an entry yourself.
          </p>
          <button type="button" onClick={() => setOpen(true)} className="btn-primary">Write the first entry</button>
        </div>
      ) : (
        <>
          {presentTypes.size > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                aria-pressed={typeFilter === 'all'}
                className={`chip ${typeFilter === 'all' ? 'chip-on' : ''}`}
              >
                All {events.length}
              </button>
              {[...presentTypes.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTypeFilter(type)}
                    aria-pressed={typeFilter === type}
                    className={`chip ${typeFilter === type ? 'chip-on' : ''}`}
                  >
                    {eventTypeIcons[type] ?? '📝'} {type.replace(/_/g, ' ')} {count}
                  </button>
                ))}
            </div>
          )}

          {days.map(day => (
            <section key={day.label}>
              <h2 className="section-label">{day.label}</h2>

              {/* Timeline rail */}
              <div className="relative space-y-3 pl-6">
                <span
                  className="absolute left-[11px] top-2 bottom-2 w-px"
                  style={{ backgroundColor: 'var(--fg-border)' }}
                  aria-hidden
                />
                {day.items.map(event => (
                  <article key={event.id} className="card relative">
                    <span
                      className="absolute -left-6 top-5 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      style={{
                        backgroundColor: 'var(--fg-surface)',
                        border: '1px solid var(--fg-border-accent)',
                        transform: 'translateX(-1px)',
                      }}
                      aria-hidden
                    >
                      {eventTypeIcons[event.event_type] ?? '📝'}
                    </span>

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--fg-text)' }}>
                          {event.title}
                        </p>
                        {event.structured_summary && (
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--fg-text-secondary)' }}>
                            {event.structured_summary}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: 'var(--fg-text-muted)' }}>
                          <time dateTime={event.occurred_at}>{timeAgo(event.occurred_at)}</time>
                          {event.urgency !== 'none' && (
                            <span className={`urgency-${event.urgency} capitalize`}>{event.urgency}</span>
                          )}
                          {event.media_urls && event.media_urls.length > 0 && (
                            <span>📎 {plural(event.media_urls.length, 'photo')}</span>
                          )}
                        </div>
                      </div>

                      {/* Always tappable — this was hover-only, so it did not
                          exist on a phone, which is where the journal is used. */}
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(event.id)}
                        className="shrink-0 w-9 h-9 -mr-2 -mt-1 rounded-lg flex items-center justify-center transition-colors"
                        style={{ color: 'var(--fg-text-dim)' }}
                        aria-label={`Delete entry: ${event.title}`}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

          {visible.length === 0 && (
            <p className="text-sm text-center py-10" style={{ color: 'var(--fg-text-muted)' }}>
              Nothing of that kind yet.
            </p>
          )}
        </>
      )}

      {/* New entry modal */}
      {open && (
        <EditModal title="Add journal entry" onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="j-type" className="field-label">What kind of entry?</label>
              <select id="j-type" className="input-field" value={form.event_type} onChange={e => f('event_type', e.target.value)}>
                {eventTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="j-title" className="field-label">Title *</label>
              <input
                id="j-title"
                className="input-field"
                value={form.title}
                onChange={e => f('title', e.target.value)}
                placeholder="What happened?"
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="j-notes" className="field-label">Notes</label>
              <textarea
                id="j-notes"
                className="input-field resize-none"
                rows={3}
                value={form.structured_summary}
                onChange={e => f('structured_summary', e.target.value)}
                placeholder="Details, observations…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="j-zone" className="field-label">Zone</label>
                <select id="j-zone" className="input-field" value={form.zone_id} onChange={e => f('zone_id', e.target.value)}>
                  <option value="">No zone</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="j-urgency" className="field-label">Urgency</label>
                <select id="j-urgency" className="input-field" value={form.urgency} onChange={e => f('urgency', e.target.value)}>
                  {urgencyOptions.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="alert-error">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center disabled:opacity-60">
                {isPending ? 'Adding…' : 'Add entry'}
              </button>
            </div>
          </form>
        </EditModal>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <EditModal size="sm" title="Delete entry?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm mb-4" style={{ color: 'var(--fg-text-secondary)' }}>
            This removes the entry from your garden&rsquo;s history. It can&rsquo;t be undone.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="button" onClick={() => handleDelete(confirmDelete)} disabled={isPending} className="btn-danger flex-1 disabled:opacity-60">
              {isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </EditModal>
      )}
    </div>
  )
}
