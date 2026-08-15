'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EditModal } from '@/components/garden/EditModal'
import { PageHeader } from '@/components/layout/PageHeader'
import { shortDate, plural } from '@/lib/format'

const zoneTypeOptions = [
  'raised_bed', 'grounded_bed', 'container', 'greenhouse',
  'nursery', 'lawn', 'compost', 'herb_garden', 'orchard', 'other',
]

const zoneTypeEmoji: Record<string, string> = {
  raised_bed: '🛏', grounded_bed: '🌾', container: '🪴', greenhouse: '🏠',
  nursery: '🌱', lawn: '🟩', compost: '🍂', herb_garden: '🌿',
  orchard: '🌳', other: '📍',
}

const sunOptions = ['full_sun', 'partial_shade', 'full_shade']
const sunLabels: Record<string, string> = {
  full_sun: '☀ Full sun',
  partial_shade: '⛅ Partial shade',
  full_shade: '🌑 Full shade',
}

interface Zone {
  id: string
  name: string
  description: string | null
  zone_type: string | null
  sun_exposure: string | null
  soil_notes: string | null
  created_at: string | null
}

interface Props {
  zones: Zone[]
  /** How many plants live in each zone — turns the map into a real overview. */
  plantCounts?: Record<string, number>
}

const emptyForm = {
  name: '', description: '', zone_type: '', sun_exposure: '', soil_notes: '',
}

function titleCase(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function ZonesClient({ zones, plantCounts = {} }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Zone | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Zone | null>(null)

  function openAdd() {
    setForm(emptyForm); setEditing(null); setError(null); setModal('add')
  }

  function openEdit(zone: Zone) {
    setForm({
      name: zone.name,
      description: zone.description ?? '',
      zone_type: zone.zone_type ?? '',
      sun_exposure: zone.sun_exposure ?? '',
      soil_notes: zone.soil_notes ?? '',
    })
    setEditing(zone); setError(null); setModal('edit')
  }

  function closeModal() { setModal(null); setEditing(null); setError(null) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) { setError('Give the zone a name.'); return }
    startTransition(async () => {
      const url = editing ? `/api/flowgarden/zones/${editing.id}` : '/api/flowgarden/zones'
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, name: form.name.trim() }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? 'Something went wrong')
        return
      }
      closeModal()
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await fetch(`/api/flowgarden/zones/${id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      router.refresh()
    })
  }

  const f = (field: keyof typeof form, val: string) =>
    setForm(prev => ({ ...prev, [field]: val }))

  const totalPlants = Object.values(plantCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="page space-y-6">
      <PageHeader
        title="Garden Map"
        subtitle={
          zones.length === 0
            ? 'The beds, pots and patches that make up this garden'
            : <>{plural(zones.length, 'zone')}{totalPlants > 0 ? ` · ${plural(totalPlants, 'plant')} placed` : ''}</>
        }
        action={<button type="button" onClick={openAdd} className="btn-primary">+ Add zone</button>}
      />

      {zones.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">🗺</span>
          <p className="empty-title">No zones yet</p>
          <p className="empty-body">
            Zones are the places in your garden — the front raised bed, the greenhouse, the herb
            corner. Plants and sensors hang off them, so it&rsquo;s worth mapping them first.
          </p>
          <button type="button" onClick={openAdd} className="btn-primary">Add first zone</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map(zone => {
            const count = plantCounts[zone.id] ?? 0
            return (
              <div key={zone.id} className="card flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                    style={{ background: 'linear-gradient(135deg, var(--fg-green-muted), var(--fg-gold-bg))' }}
                    aria-hidden
                  >
                    {zoneTypeEmoji[zone.zone_type ?? 'other'] ?? '📍'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-tight truncate" style={{ color: 'var(--fg-text)' }}>
                      {zone.name}
                    </h3>
                    {zone.zone_type && (
                      <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--fg-text-muted)' }}>
                        {zone.zone_type.replace(/_/g, ' ')}
                      </p>
                    )}
                  </div>
                  {count > 0 && (
                    <Link
                      href="/plants"
                      className="badge-green shrink-0 hover:underline"
                      title={`${plural(count, 'plant')} in this zone`}
                    >
                      🌿 {count}
                    </Link>
                  )}
                </div>

                {zone.description && (
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-text-secondary)' }}>
                    {zone.description}
                  </p>
                )}

                <dl className="flex flex-wrap gap-x-5 gap-y-2">
                  {zone.sun_exposure && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-text-dim)' }}>Sun</dt>
                      <dd className="text-xs font-medium" style={{ color: 'var(--fg-text-secondary)' }}>
                        {sunLabels[zone.sun_exposure] ?? zone.sun_exposure}
                      </dd>
                    </div>
                  )}
                  {zone.soil_notes && (
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-text-dim)' }}>Soil</dt>
                      <dd className="text-xs font-medium truncate" style={{ color: 'var(--fg-text-secondary)' }}>
                        {zone.soil_notes}
                      </dd>
                    </div>
                  )}
                  {zone.created_at && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-text-dim)' }}>Added</dt>
                      <dd className="text-xs font-medium" style={{ color: 'var(--fg-text-secondary)' }}>
                        {shortDate(zone.created_at)}
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Always visible — these were opacity-0 until hover, i.e. absent on touch */}
                <div className="flex gap-4 mt-auto pt-2" style={{ borderTop: '1px solid var(--fg-border)' }}>
                  <button
                    type="button"
                    onClick={() => openEdit(zone)}
                    className="text-xs font-medium hover:underline py-1"
                    style={{ color: 'var(--fg-gold)' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(zone)}
                    className="text-xs font-medium py-1 transition-colors"
                    style={{ color: 'var(--fg-text-muted)' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <EditModal title={modal === 'add' ? 'Add zone' : 'Edit zone'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="z-name" className="field-label">Name *</label>
              <input
                id="z-name"
                className="input-field"
                value={form.name}
                onChange={e => f('name', e.target.value)}
                placeholder="Front raised bed"
                required
                autoFocus
              />
            </div>

            {/* Type as a visual picker — a 10-item <select> gave no sense of what a zone is */}
            <div>
              <span className="field-label">Type</span>
              <div className="grid grid-cols-3 gap-2">
                {zoneTypeOptions.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => f('zone_type', form.zone_type === t ? '' : t)}
                    aria-pressed={form.zone_type === t}
                    className="rounded-xl px-2 py-2.5 text-center transition-colors"
                    style={{
                      backgroundColor: form.zone_type === t ? 'var(--fg-gold-bg)' : 'var(--fg-panel)',
                      border: `1px solid ${form.zone_type === t ? 'var(--fg-border-accent)' : 'var(--fg-border)'}`,
                      color: form.zone_type === t ? 'var(--fg-gold)' : 'var(--fg-text-secondary)',
                    }}
                  >
                    <span className="block text-base leading-none mb-1" aria-hidden>{zoneTypeEmoji[t]}</span>
                    <span className="block text-[10px] leading-tight">{titleCase(t)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="field-label">Sun exposure</span>
              <div className="flex flex-wrap gap-2">
                {sunOptions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => f('sun_exposure', form.sun_exposure === s ? '' : s)}
                    aria-pressed={form.sun_exposure === s}
                    className={`chip ${form.sun_exposure === s ? 'chip-on' : ''}`}
                  >
                    {sunLabels[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="z-desc" className="field-label">Description</label>
              <textarea
                id="z-desc"
                className="input-field resize-none"
                rows={2}
                value={form.description}
                onChange={e => f('description', e.target.value)}
                placeholder="What's here, what it's for…"
              />
            </div>

            <div>
              <label htmlFor="z-soil" className="field-label">Soil notes</label>
              <input
                id="z-soil"
                className="input-field"
                value={form.soil_notes}
                onChange={e => f('soil_notes', e.target.value)}
                placeholder="Sandy loam, amended with compost"
              />
            </div>

            {error && <p className="alert-error">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center disabled:opacity-60">
                {isPending ? 'Saving…' : modal === 'add' ? 'Add zone' : 'Save changes'}
              </button>
            </div>
          </form>
        </EditModal>
      )}

      {confirmDelete && (
        <EditModal size="sm" title={`Delete “${confirmDelete.name}”?`} onClose={() => setConfirmDelete(null)}>
          <p className="text-sm mb-4" style={{ color: 'var(--fg-text-secondary)' }}>
            {(plantCounts[confirmDelete.id] ?? 0) > 0
              ? `${plural(plantCounts[confirmDelete.id], 'plant')} sits in this zone — they'll stay, but lose their place on the map.`
              : 'This permanently deletes the zone.'}
            {' '}This can&rsquo;t be undone.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="button" onClick={() => handleDelete(confirmDelete.id)} disabled={isPending} className="btn-danger flex-1 disabled:opacity-60">
              {isPending ? 'Deleting…' : 'Delete zone'}
            </button>
          </div>
        </EditModal>
      )}
    </div>
  )
}
