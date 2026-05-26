'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EditModal } from '@/components/garden/EditModal'

const statusOptions = [
  'seed', 'germinating', 'seedling', 'transplanted', 'established',
  'flowering', 'fruiting', 'harvested', 'dormant', 'dead',
]
const healthOptions = ['excellent', 'good', 'stressed', 'critical', 'unknown']

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  seed:         { label: 'Seed',         color: 'bg-stone-100 text-stone-600',     dot: 'bg-stone-400' },
  germinating:  { label: 'Germinating',  color: 'bg-lime-100 text-lime-700',       dot: 'bg-lime-500' },
  seedling:     { label: 'Seedling',     color: 'bg-green-100 text-green-700',     dot: 'bg-green-500' },
  transplanted: { label: 'Transplanted', color: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-500' },
  established:  { label: 'Established',  color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-600' },
  flowering:    { label: 'Flowering',    color: 'bg-pink-100 text-pink-700',       dot: 'bg-pink-400' },
  fruiting:     { label: 'Fruiting',     color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
  harvested:    { label: 'Harvested',    color: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-500' },
  dormant:      { label: 'Dormant',      color: 'bg-stone-100 text-stone-500',     dot: 'bg-stone-300' },
  dead:         { label: 'Dead',         color: 'bg-red-100 text-red-400',         dot: 'bg-red-300' },
}

const healthConfig: Record<string, { label: string; color: string }> = {
  excellent: { label: 'Excellent', color: 'text-emerald-600' },
  good:      { label: 'Good',      color: 'text-green-600' },
  stressed:  { label: 'Stressed',  color: 'text-amber-600' },
  critical:  { label: 'Critical',  color: 'text-red-600' },
  unknown:   { label: 'Unknown',   color: 'text-stone-400' },
}

interface Plant {
  id: string
  name: string
  species: string | null
  variety: string | null
  quantity: number
  status: string
  health_status: string
  notes: string | null
  zone_id: string | null
  created_at: string
}

interface Zone { id: string; name: string }

interface Props {
  plants: Plant[]
  zones: Zone[]
}

const emptyForm = {
  name: '', species: '', variety: '', quantity: 1,
  status: 'seedling', health_status: 'good', notes: '', zone_id: '',
}

export function PlantsClient({ plants, zones }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Plant | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const totalQty = plants.reduce((s, p) => s + (p.quantity ?? 1), 0)

  function openAdd() {
    setForm(emptyForm)
    setEditing(null)
    setError(null)
    setModal('add')
  }

  function openEdit(plant: Plant) {
    setForm({
      name: plant.name,
      species: plant.species ?? '',
      variety: plant.variety ?? '',
      quantity: plant.quantity,
      status: plant.status,
      health_status: plant.health_status,
      notes: plant.notes ?? '',
      zone_id: plant.zone_id ?? '',
    })
    setEditing(plant)
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
      const url = editing ? `/api/flowgarden/plants/${editing.id}` : '/api/flowgarden/plants'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          zone_id: form.zone_id || null,
        }),
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
      await fetch(`/api/flowgarden/plants/${id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      router.refresh()
    })
  }

  const f = (field: keyof typeof form, val: string | number) =>
    setForm(prev => ({ ...prev, [field]: val }))

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6 md:mb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Plants</h1>
            <p className="text-sm text-stone-400 mt-1">
              {totalQty} plants · {plants.length} group{plants.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="btn-primary shrink-0"
          >
            + Add plant
          </button>
        </div>
      </div>

      {plants.length === 0 ? (
        <div className="card border-dashed border-stone-200 bg-stone-50/50 text-center py-16">
          <p className="text-2xl mb-3">🌱</p>
          <p className="text-stone-600 font-medium">No plants yet</p>
          <p className="text-stone-400 text-sm mt-1 mb-4">
            Add plants manually or tell the Garden Intelligence what you&apos;ve planted.
          </p>
          <button onClick={openAdd} className="btn-primary">Add first plant</button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(
              plants.reduce((acc, p) => {
                acc[p.status] = (acc[p.status] ?? 0) + (p.quantity ?? 1)
                return acc
              }, {} as Record<string, number>)
            ).map(([status, count]) => {
              const cfg = statusConfig[status] ?? { label: status, color: 'bg-stone-100 text-stone-600', dot: 'bg-stone-400' }
              return (
                <span key={status} className={`badge ${cfg.color} py-1 px-3`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {count} {cfg.label}
                </span>
              )
            })}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plants.map(plant => {
              const status = statusConfig[plant.status] ?? { label: plant.status, color: 'bg-stone-100 text-stone-600', dot: 'bg-stone-400' }
              const health = healthConfig[plant.health_status] ?? healthConfig.unknown
              const zone = zones.find(z => z.id === plant.zone_id)
              return (
                <div key={plant.id} className="card hover:shadow-md transition-shadow group relative">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-stone-900 leading-tight">
                        {plant.name}
                        {plant.variety ? <span className="text-stone-400 font-normal"> · {plant.variety}</span> : null}
                      </h3>
                      {plant.species && (
                        <p className="text-xs text-stone-400 italic mt-0.5">{plant.species}</p>
                      )}
                    </div>
                    <span className={`badge shrink-0 ${status.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-2 mb-3">
                    <div>
                      <p className="text-[10px] text-stone-400 uppercase tracking-wide">Qty</p>
                      <p className="text-sm font-semibold text-stone-800">{plant.quantity}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400 uppercase tracking-wide">Health</p>
                      <p className={`text-sm font-semibold ${health.color}`}>{health.label}</p>
                    </div>
                    {zone && (
                      <div>
                        <p className="text-[10px] text-stone-400 uppercase tracking-wide">Zone</p>
                        <p className="text-sm font-medium text-stone-600">{zone.name}</p>
                      </div>
                    )}
                  </div>

                  {plant.notes && (
                    <p className="text-xs text-stone-500 border-t border-stone-50 pt-2 leading-relaxed">
                      {plant.notes}
                    </p>
                  )}

                  <div className="flex gap-2 mt-3 pt-2 border-t border-stone-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(plant)}
                      className="text-xs text-stone-500 hover:text-emerald-700 transition-colors"
                    >
                      Edit
                    </button>
                    <span className="text-stone-200">·</span>
                    <button
                      onClick={() => setConfirmDelete(plant.id)}
                      className="text-xs text-stone-400 hover:text-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <EditModal
          title={modal === 'add' ? 'Add plant' : 'Edit plant'}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Name *</label>
              <input
                className="input-field-light"
                value={form.name}
                onChange={e => f('name', e.target.value)}
                placeholder="e.g. Tomatoes"
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Species</label>
                <input
                  className="input-field-light"
                  value={form.species}
                  onChange={e => f('species', e.target.value)}
                  placeholder="e.g. Solanum lycopersicum"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Variety</label>
                <input
                  className="input-field-light"
                  value={form.variety}
                  onChange={e => f('variety', e.target.value)}
                  placeholder="e.g. Cherry"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  className="input-field-light"
                  value={form.quantity}
                  onChange={e => f('quantity', parseInt(e.target.value) || 1)}
                />
              </div>
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Status</label>
                <select
                  className="input-field-light"
                  value={form.status}
                  onChange={e => f('status', e.target.value)}
                >
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Health</label>
                <select
                  className="input-field-light"
                  value={form.health_status}
                  onChange={e => f('health_status', e.target.value)}
                >
                  {healthOptions.map(h => (
                    <option key={h} value={h}>{h.charAt(0).toUpperCase() + h.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Notes</label>
              <textarea
                className="input-field resize-none"
                rows={3}
                value={form.notes}
                onChange={e => f('notes', e.target.value)}
                placeholder="Any observations..."
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={closeModal} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isPending} className="flex-1 btn-primary">
                {isPending ? 'Saving…' : modal === 'add' ? 'Add plant' : 'Save changes'}
              </button>
            </div>
          </form>
        </EditModal>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <EditModal title="Delete plant?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-stone-600 mb-4">
            This will permanently delete the plant. This can&apos;t be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 btn-secondary">
              Cancel
            </button>
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
