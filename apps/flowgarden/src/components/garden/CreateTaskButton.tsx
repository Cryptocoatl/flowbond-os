'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EditModal } from './EditModal'

interface Zone { id: string; name: string }

const urgencyOptions = ['low', 'medium', 'high', 'urgent']

const emptyForm = {
  title: '', description: '', urgency: 'medium', zone_id: '', due_at: '', xp_reward: 5,
}

export function CreateTaskButton({ zones }: { zones: Zone[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/flowgarden/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          zone_id: form.zone_id || null,
          due_at: form.due_at || null,
          xp_reward: Number(form.xp_reward),
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

  const f = (field: keyof typeof form, val: string | number) =>
    setForm(prev => ({ ...prev, [field]: val }))

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary shrink-0">
        + New mission
      </button>

      {open && (
        <EditModal title="Create mission" onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Title *</label>
              <input
                className="input-field-light"
                value={form.title}
                onChange={e => f('title', e.target.value)}
                placeholder="e.g. Water the raised beds"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Description</label>
              <textarea
                className="input-field-light resize-none"
                rows={2}
                value={form.description}
                onChange={e => f('description', e.target.value)}
                placeholder="What needs to be done and why..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="block text-xs text-stone-500 mb-1">XP reward</label>
                <input
                  type="number"
                  min={0}
                  className="input-field-light"
                  value={form.xp_reward}
                  onChange={e => f('xp_reward', parseInt(e.target.value) || 0)}
                />
              </div>
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
                <label className="block text-xs text-stone-500 mb-1">Due date</label>
                <input
                  type="date"
                  className="input-field-light"
                  value={form.due_at}
                  onChange={e => f('due_at', e.target.value ? new Date(e.target.value).toISOString() : '')}
                />
              </div>
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isPending} className="flex-1 btn-primary">
                {isPending ? 'Creating…' : 'Create mission'}
              </button>
            </div>
          </form>
        </EditModal>
      )}
    </>
  )
}
