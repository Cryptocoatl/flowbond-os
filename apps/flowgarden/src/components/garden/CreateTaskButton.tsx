'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EditModal } from './EditModal'

interface Zone { id: string; name: string }

const URGENCY: { value: string; label: string; hint: string }[] = [
  { value: 'low',    label: 'Whenever', hint: 'No rush' },
  { value: 'medium', label: 'Soon',     hint: 'This week' },
  { value: 'high',   label: 'Important',hint: 'Next day or two' },
  { value: 'urgent', label: 'Urgent',   hint: 'Today' },
]

const emptyForm = {
  title: '', description: '', urgency: 'medium', zone_id: '', due_at: '', xp_reward: 5,
}

function isoDaysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function CreateTaskButton({ zones, label = '+ New mission' }: { zones: Zone[]; label?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.title.trim()) { setError('Give the mission a title.'); return }
    startTransition(async () => {
      const res = await fetch('/api/flowgarden/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          zone_id: form.zone_id || null,
          due_at: form.due_at ? new Date(`${form.due_at}T12:00:00`).toISOString() : null,
          xp_reward: Number(form.xp_reward),
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

  const f = (field: keyof typeof form, val: string | number) =>
    setForm(prev => ({ ...prev, [field]: val }))

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary shrink-0">
        {label}
      </button>

      {open && (
        <EditModal title="Create mission" onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="mission-title" className="field-label">What needs doing? *</label>
              <input
                id="mission-title"
                className="input-field"
                value={form.title}
                onChange={e => f('title', e.target.value)}
                placeholder="Water the raised beds"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="mission-desc" className="field-label">Details <span style={{ color: 'var(--fg-text-dim)' }}>(optional)</span></label>
              <textarea
                id="mission-desc"
                className="input-field resize-none"
                rows={2}
                value={form.description}
                onChange={e => f('description', e.target.value)}
                placeholder="Anything the person taking this should know"
              />
            </div>

            {/* Urgency as chips — a 4-option <select> hid the meaning behind a tap */}
            <div>
              <span className="field-label">How urgent?</span>
              <div className="flex flex-wrap gap-2">
                {URGENCY.map(u => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => f('urgency', u.value)}
                    aria-pressed={form.urgency === u.value}
                    className={`chip ${form.urgency === u.value ? 'chip-on' : ''}`}
                    title={u.hint}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="mission-due" className="field-label">Due <span style={{ color: 'var(--fg-text-dim)' }}>(optional)</span></label>
              <div className="flex flex-wrap gap-2 mb-2">
                {[['Today', 0], ['Tomorrow', 1], ['This week', 7]].map(([lbl, d]) => {
                  const iso = isoDaysFromNow(d as number)
                  return (
                    <button
                      key={lbl as string}
                      type="button"
                      onClick={() => f('due_at', form.due_at === iso ? '' : iso)}
                      aria-pressed={form.due_at === iso}
                      className={`chip ${form.due_at === iso ? 'chip-on' : ''}`}
                    >
                      {lbl}
                    </button>
                  )
                })}
              </div>
              <input
                id="mission-due"
                type="date"
                className="input-field"
                value={form.due_at}
                onChange={e => f('due_at', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="mission-zone" className="field-label">Zone</label>
                <select
                  id="mission-zone"
                  className="input-field"
                  value={form.zone_id}
                  onChange={e => f('zone_id', e.target.value)}
                >
                  <option value="">No zone</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="mission-xp" className="field-label">XP reward</label>
                <input
                  id="mission-xp"
                  type="number"
                  min={0}
                  max={100}
                  className="input-field"
                  value={form.xp_reward}
                  onChange={e => f('xp_reward', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {error && <p className="alert-error">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center disabled:opacity-60">
                {isPending ? 'Creating…' : 'Create mission'}
              </button>
            </div>
          </form>
        </EditModal>
      )}
    </>
  )
}
