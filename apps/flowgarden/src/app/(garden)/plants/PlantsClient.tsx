'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EditModal } from '@/components/garden/EditModal'
import { HealthRing } from '@/components/garden/HealthRing'

const statusOptions = [
  'seed', 'germinating', 'seedling', 'transplanted', 'established',
  'flowering', 'fruiting', 'harvested', 'dormant', 'dead',
]
const healthOptions = ['excellent', 'good', 'stressed', 'critical', 'unknown']

// Lifecycle order for the little progress track on each card.
const LIFECYCLE = ['seed', 'germinating', 'seedling', 'transplanted', 'established', 'flowering', 'fruiting', 'harvested']

const statusConfig: Record<string, { label: string; dot: string }> = {
  seed:         { label: 'Seed',         dot: '#a8a29e' },
  germinating:  { label: 'Germinating',  dot: '#84cc16' },
  seedling:     { label: 'Seedling',     dot: '#22c55e' },
  transplanted: { label: 'Transplanted', dot: '#14b8a6' },
  established:  { label: 'Established',  dot: '#059669' },
  flowering:    { label: 'Flowering',    dot: '#ec4899' },
  fruiting:     { label: 'Fruiting',     dot: '#f59e0b' },
  harvested:    { label: 'Harvested',    dot: '#0d9488' },
  dormant:      { label: 'Dormant',      dot: '#a8a29e' },
  dead:         { label: 'Dead',         dot: '#ef4444' },
}

const healthConfig: Record<string, { label: string; text: string; dot: string }> = {
  excellent: { label: 'Excellent', text: 'text-emerald-600 dark:text-emerald-400', dot: '#10b981' },
  good:      { label: 'Good',      text: 'text-green-600 dark:text-green-400',     dot: '#22c55e' },
  stressed:  { label: 'Stressed',  text: 'text-amber-600 dark:text-amber-400',     dot: '#f59e0b' },
  critical:  { label: 'Critical',  text: 'text-red-600 dark:text-red-400',         dot: '#ef4444' },
  unknown:   { label: 'Unknown',   text: 'text-fg-muted',                          dot: '#a8a29e' },
}

// Map a plant to a friendly emoji from its name/species/variety.
const EMOJI_MAP: [RegExp, string][] = [
  [/tomato/i, '🍅'], [/chil|chili|pepper|jalap|habaner/i, '🌶️'], [/bell ?pepper/i, '🫑'],
  [/lettuce|spinach|kale|chard|cabbage|greens?/i, '🥬'], [/basil|mint|cilantro|parsley|herb|thyme|oregano|sage|rosemary/i, '🌿'],
  [/strawberr/i, '🍓'], [/carrot/i, '🥕'], [/corn|maize/i, '🌽'], [/pumpkin/i, '🎃'],
  [/cucumber|cuke/i, '🥒'], [/eggplant|aubergine/i, '🍆'], [/potato/i, '🥔'], [/sweet ?potato|yam/i, '🍠'],
  [/onion|scallion|leek/i, '🧅'], [/garlic/i, '🧄'], [/mushroom|fungi/i, '🍄'], [/broccoli/i, '🥦'],
  [/grape/i, '🍇'], [/lemon/i, '🍋'], [/lime/i, '🟢'], [/orange|citrus|mandarin/i, '🍊'],
  [/apple/i, '🍎'], [/avocado/i, '🥑'], [/banana/i, '🍌'], [/pineapple/i, '🍍'], [/peach/i, '🍑'],
  [/cherr/i, '🍒'], [/coconut/i, '🥥'], [/melon|watermelon/i, '🍉'], [/blueberr/i, '🫐'],
  [/bean|pea|legume/i, '🫛'], [/peanut/i, '🥜'], [/wheat|grain|barley|oat|rice/i, '🌾'],
  [/sunflower/i, '🌻'], [/rose/i, '🌹'], [/tulip/i, '🌷'], [/daisy|chamomile/i, '🌼'],
  [/hibiscus|flower|bloom/i, '🌺'], [/cactus|succulent|aloe/i, '🌵'], [/tree|oak|maple/i, '🌳'],
  [/palm/i, '🌴'], [/clover/i, '🍀'], [/lavender/i, '💜'], [/squash|zucchini|courgette/i, '🥒'],
]
function plantEmoji(plant: { name: string; species: string | null; variety: string | null }): string {
  const hay = `${plant.name} ${plant.species ?? ''} ${plant.variety ?? ''}`
  for (const [re, emoji] of EMOJI_MAP) if (re.test(hay)) return emoji
  return '🌱'
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

type Filter = 'all' | 'thriving' | 'care'

export function PlantsClient({ plants, zones }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Plant | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const totalQty = plants.reduce((s, p) => s + (p.quantity ?? 1), 0)
  const healthyQty = plants
    .filter(p => p.health_status === 'good' || p.health_status === 'excellent')
    .reduce((s, p) => s + (p.quantity ?? 1), 0)
  const careQty = plants
    .filter(p => p.health_status === 'stressed' || p.health_status === 'critical')
    .reduce((s, p) => s + (p.quantity ?? 1), 0)

  const visible = useMemo(() => {
    if (filter === 'thriving') return plants.filter(p => p.health_status === 'good' || p.health_status === 'excellent')
    if (filter === 'care') return plants.filter(p => p.health_status === 'stressed' || p.health_status === 'critical')
    return plants
  }, [plants, filter])

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
    <div className="p-5 md:p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-fg">Plants</h1>
          <p className="text-sm text-fg-muted mt-1">
            {totalQty} plant{totalQty !== 1 ? 's' : ''} · {plants.length} group{plants.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary shrink-0">
          <span className="text-base leading-none">＋</span> Add plant
        </button>
      </div>

      {plants.length === 0 ? (
        <div className="card-accent text-center py-16">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-fg font-semibold">No plants yet</p>
          <p className="text-fg-muted text-sm mt-1 mb-5 max-w-xs mx-auto">
            Add your first plant — or just tell FlowMe “I planted 6 tomatoes” and it’ll do it for you.
          </p>
          <button onClick={openAdd} className="btn-primary">Add first plant</button>
        </div>
      ) : (
        <>
          {/* Health hero */}
          <div
            className="rounded-2xl p-5 md:p-6 flex items-center gap-5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--fg-green-muted) 0%, var(--fg-gold-bg) 100%)',
              border: '1px solid var(--fg-border-accent)',
            }}
          >
            <HealthRing healthy={healthyQty} total={totalQty} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-fg-gold">Plant health</p>
              <p className="text-base md:text-lg font-semibold text-fg mt-1 leading-snug">
                {careQty === 0
                  ? 'Every plant is doing great 🌿'
                  : `${careQty} plant${careQty > 1 ? 's' : ''} need${careQty > 1 ? '' : 's'} some love`}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                <span className="badge-green">🌿 {healthyQty} thriving</span>
                {careQty > 0 && (
                  <span className="badge" style={{ backgroundColor: 'rgba(245,158,11,0.14)', color: '#b45309' }}>
                    ⚠️ {careQty} need care
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              ['all', `All ${totalQty}`],
              ['thriving', `🌿 Thriving ${healthyQty}`],
              ['care', `⚠️ Needs care ${careQty}`],
            ] as [Filter, string][]).map(([key, label]) => {
              const on = filter === key
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  disabled={key === 'care' && careQty === 0}
                  className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-40"
                  style={{
                    backgroundColor: on ? 'var(--fg-green)' : 'var(--fg-panel)',
                    color: on ? '#fff' : 'var(--fg-text-secondary)',
                    border: `1px solid ${on ? 'var(--fg-green)' : 'var(--fg-border)'}`,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Plant grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map(plant => {
              const status = statusConfig[plant.status] ?? { label: plant.status, dot: '#a8a29e' }
              const health = healthConfig[plant.health_status] ?? healthConfig.unknown
              const zone = zones.find(z => z.id === plant.zone_id)
              const needsCare = plant.health_status === 'stressed' || plant.health_status === 'critical'
              const stageIdx = LIFECYCLE.indexOf(plant.status)
              const emoji = plantEmoji(plant)

              return (
                <div
                  key={plant.id}
                  className="card flex flex-col gap-3"
                  style={needsCare ? { borderColor: 'rgba(245,158,11,0.4)' } : undefined}
                >
                  {/* Top: avatar + name + status */}
                  <div className="flex items-start gap-3">
                    <span
                      className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                      style={{ background: 'linear-gradient(135deg, var(--fg-green-muted), var(--fg-gold-bg))' }}
                    >
                      {emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-fg leading-tight truncate">
                        {plant.name}
                        {plant.variety ? <span className="text-fg-muted font-normal"> · {plant.variety}</span> : null}
                      </h3>
                      {plant.species && <p className="text-xs text-fg-muted italic mt-0.5 truncate">{plant.species}</p>}
                    </div>
                    <span
                      className="badge shrink-0"
                      style={{ backgroundColor: 'var(--fg-panel)', color: 'var(--fg-text-secondary)', border: '1px solid var(--fg-border)' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.dot }} />
                      {status.label}
                    </span>
                  </div>

                  {/* Lifecycle progress */}
                  {stageIdx >= 0 && (
                    <div className="flex items-center gap-1" title={`${status.label} — stage ${stageIdx + 1} of ${LIFECYCLE.length}`}>
                      {LIFECYCLE.map((_, i) => (
                        <span
                          key={i}
                          className="h-1 flex-1 rounded-full transition-colors"
                          style={{
                            backgroundColor:
                              i < stageIdx ? 'var(--fg-green)'
                              : i === stageIdx ? 'var(--fg-gold)'
                              : 'var(--fg-border)',
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-fg-muted text-xs">Qty</span>
                      <span className="font-semibold text-fg">{plant.quantity}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: health.dot }} />
                      <span className={`font-semibold ${health.text}`}>{health.label}</span>
                    </div>
                    {zone && (
                      <div className="flex items-center gap-1 text-fg-muted text-xs min-w-0">
                        <span>📍</span>
                        <span className="truncate">{zone.name}</span>
                      </div>
                    )}
                  </div>

                  {plant.notes && (
                    <p className="text-xs text-fg-secondary leading-relaxed line-clamp-3" style={{ borderTop: '1px solid var(--fg-border)', paddingTop: '0.5rem' }}>
                      {plant.notes}
                    </p>
                  )}

                  {/* Actions (always visible — touch friendly) */}
                  <div className="flex gap-4 mt-auto pt-1">
                    <button onClick={() => openEdit(plant)} className="text-xs font-medium text-fg-gold hover:underline">
                      Edit
                    </button>
                    <button onClick={() => setConfirmDelete(plant.id)} className="text-xs font-medium text-fg-muted hover:text-red-500 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {visible.length === 0 && (
            <p className="text-sm text-fg-muted text-center py-10">No plants in this filter.</p>
          )}
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
              <label className="block text-xs text-fg-secondary mb-1">Name *</label>
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
                <label className="block text-xs text-fg-secondary mb-1">Species</label>
                <input
                  className="input-field-light"
                  value={form.species}
                  onChange={e => f('species', e.target.value)}
                  placeholder="e.g. Solanum lycopersicum"
                />
              </div>
              <div>
                <label className="block text-xs text-fg-secondary mb-1">Variety</label>
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
                <label className="block text-xs text-fg-secondary mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  className="input-field-light"
                  value={form.quantity}
                  onChange={e => f('quantity', parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className="block text-xs text-fg-secondary mb-1">Zone</label>
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
                <label className="block text-xs text-fg-secondary mb-1">Status</label>
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
                <label className="block text-xs text-fg-secondary mb-1">Health</label>
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
              <label className="block text-xs text-fg-secondary mb-1">Notes</label>
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
              <button type="button" onClick={closeModal} className="flex-1 btn-secondary justify-center">
                Cancel
              </button>
              <button type="submit" disabled={isPending} className="flex-1 btn-primary justify-center">
                {isPending ? 'Saving…' : modal === 'add' ? 'Add plant' : 'Save changes'}
              </button>
            </div>
          </form>
        </EditModal>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <EditModal title="Delete plant?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-fg-secondary mb-4">
            This will permanently delete the plant. This can&apos;t be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 btn-secondary justify-center">
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
