'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const contactTypes = [
  { value: 'client_call', label: '📞 Call' },
  { value: 'client_message', label: '💬 Message' },
  { value: 'client_email', label: '✉️ Email' },
  { value: 'client_meeting', label: '🤝 Meeting' },
  { value: 'note', label: '◻ Note' },
  { value: 'milestone', label: '⭐ Milestone' },
]

export default function LogForm({ projects }: { projects: { id: string; name: string; slug: string; icon: string }[] }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    project_id: '',
    type: 'note',
    title: '',
    body: '',
    url: '',
  })
  const router = useRouter()

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        project_id: form.project_id || null,
        url: form.url || null,
        body: form.body || null,
      }),
    })
    setSaving(false)
    setForm({ project_id: '', type: 'note', title: '', body: '', url: '' })
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full card text-sm text-ops-dim hover:border-ops-muted hover:text-ops-text transition-colors text-left"
      >
        + Log a client conversation, note, or milestone...
      </button>
    )
  }

  return (
    <div className="card border-violet-500/20 space-y-3">
      <h3 className="text-sm font-semibold text-ops-text">Log Entry</h3>
      <div className="grid grid-cols-2 gap-3">
        <select
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          className="select text-sm"
        >
          {contactTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          value={form.project_id}
          onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
          className="select text-sm"
        >
          <option value="">No project</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
        </select>
      </div>
      <input
        autoFocus
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        placeholder="What happened? (e.g. 'Sol confirmed MercadoPago is priority')"
        className="input"
      />
      <textarea
        value={form.body}
        onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
        placeholder="Details / next actions (optional)"
        className="input resize-none h-20 text-sm"
      />
      <input
        value={form.url}
        onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
        placeholder="Link (optional)"
        className="input text-sm"
      />
      <div className="flex gap-2">
        <button onClick={save} disabled={!form.title.trim() || saving} className="btn-primary text-sm disabled:opacity-40">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-ghost text-sm">Cancel</button>
      </div>
    </div>
  )
}
