'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EditModal } from '@/components/garden/EditModal'

const zoneTypeOptions = [
  'raised_bed', 'grounded_bed', 'container', 'greenhouse',
  'nursery', 'lawn', 'compost', 'herb_garden', 'orchard', 'other',
]
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

const emptyForm = {
  name: '', description: '', zone_type: '', sun_exposure: '', soil_notes: '',
}

export function ZonesClient({ zones }: { zones: Zone[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Zone | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function openAdd() {
    setForm(emptyForm)
    setEditing(null)
    setError(null)
    setModal('add')
  }

  function openEdit(zone: Zone) {
    setForm({
      name: zone.name,
      description: zone.description ?? '',
      zone_type: zone.zone_type ?? '',
      sun_exposure: zone.sun_exposure ?? '',
      soil_notes: zone.soil_notes ?? '',
    })
    setEditing(zone)
    setError(null)
    setModal('edit')
  }

  function closeModal() {
    setModal(null)
    setEditing(null)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const url = editing ? `/api/flowgarden/zones/${editing.id}` : '/api/flowgarden/zones'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const json = await res.json()
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

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6 md:mb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Garden Map</h1>
            <p className="text-sm text-stone-400 mt-1">{zones.length} zone{zones.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openAdd} className="btn-primary shrink-0">
            + Add zone
          </button>
        </div>
      </div>

      <div className="card mb-6 bg-gradient-to-br from-emerald-50 to-stone-50 border-dashed border-stone-300">
        <div className="text-center py-6">
          <p className="text-stone-500 text-sm font-medium">Visual garden layout</p>
          <p className="text-stone-400 text-xs mt-1">Interactive map coming soon · Hardware sensors will overlay here</p>
          {zones.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {zones.map(z => (
                <div key={z.id} className="bg-white border border-emerald-200 rounded-lg px-3 py-2 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-800">{z.name}</p>
                  {z.zone_type && (
                    <p className="text-[10px] text-emerald-500 capitalize">{z.zone_type.replace(/_/g, ' ')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {zones.length === 0 ? (
        <div className="card border-dashed border-stone-200 bg-stone-50/50 text-center py-16">
          <p className="text-2xl mb-3">🗺</p>
          <p className="text-stone-600 font-medium">No zones yet</p>
          <p className="text-stone-400 text-sm mt-1 mb-4 max-w-xs mx-auto">
            Add zones for your garden areas — raised beds, pots, greenhouse — or let the Garden Intelligence create them.
          </p>
          <button onClick={openAdd} className="btn-primary">Add first zone</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {zones.map(zone => (
            <div key={zone.id} className="card hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-stone-900">{zone.name}</h3>
                {zone.zone_type && (
                  <span className="badge bg-emerald-50 text-emerald-700 shrink-0 capitalize">
                    {zone.zone_type.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              {zone.description && (
                <p className="text-sm text-stone-600 mb-3 leading-relaxed">{zone.description}</p>
              )}
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-3">
                {zone.sun_exposure && (
                  <div>
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">Sun</p>
                    <p className="text-xs font-medium text-stone-700">{sunLabels[zone.sun_exposure] ?? zone.sun_exposure}</p>
                  </div>
                )}
                {zone.soil_notes && (
                  <div>
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">Soil</p>
                    <p className="text-xs font-medium text-stone-700">{zone.soil_notes}</p>
                  </div>
                )}
                {zone.created_at && (
                  <div>
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">Added</p>
                    <p className="text-xs font-medium text-stone-600">
                      {new Date(zone.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(zone)}
                  className="text-xs text-stone-500 hover:text-emerald-700 transition-colors"
                >
                  Edit
                </button>
                <span className="text-stone-200">·</span>
                <button
                  onClick={() => setConfirmDelete(zone.id)}
                  className="text-xs text-stone-400 hover:text-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <EditModal title={modal === 'add' ? 'Add zone' : 'Edit zone'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Name *</label>
              <input
                className="input-field-light"
                value={form.name}
                onChange={e => f('name', e.target.value)}
                placeholder="e.g. Front raised bed"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Description</label>
              <textarea
                className="input-field resize-none"
                rows={2}
                value={form.description}
                onChange={e => f('description', e.target.value)}
                placeholder="What's here, purpose, notes..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Type</label>
                <select
                  className="input-field-light"
                  value={form.zone_type}
                  onChange={e => f('zone_type', e.target.value)}
                >
                  <option value="">Select type</option>
                  {zoneTypeOptions.map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Sun exposure</label>
                <select
                  className="input-field-light"
                  value={form.sun_exposure}
                  onChange={e => f('sun_exposure', e.target.value)}
                >
                  <option value="">Unknown</option>
                  {sunOptions.map(s => (
                    <option key={s} value={s}>{sunLabels[s]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Soil notes</label>
              <input
                className="input-field-light"
                value={form.soil_notes}
                onChange={e => f('soil_notes', e.target.value)}
                placeholder="e.g. Sandy loam, amended with compost"
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={closeModal} className="flex-1 btn-secondary">Cancel</button>
              <button type="submit" disabled={isPending} className="flex-1 btn-primary">
                {isPending ? 'Saving…' : modal === 'add' ? 'Add zone' : 'Save changes'}
              </button>
            </div>
          </form>
        </EditModal>
      )}

      {confirmDelete && (
        <EditModal title="Delete zone?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-stone-600 mb-4">This will permanently delete the zone. This can&apos;t be undone.</p>
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
