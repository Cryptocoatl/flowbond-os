'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { GardenMapSketch } from '@/components/garden/GardenMapSketch'
import type { SurveyResult, SurveyZone, SurveyPlant, SurveyMission } from '@/lib/survey'

interface Shot { id: string; file: File; preview: string; path?: string; error?: string }
interface ExistingZone { id: string; name: string }

type Stage = 'capture' | 'analysing' | 'review' | 'saving'

const MAX_PHOTOS = 12

/** "full_sun" → "Full sun". Enum values only — never applied to species names. */
function sentence(v?: string | null): string | undefined {
  if (!v) return undefined
  const t = v.replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function SurveyClient({ gardenId, existingZones }: { gardenId: string; existingZones: ExistingZone[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<Stage>('capture')
  const [shots, setShots] = useState<Shot[]>([])
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  const [survey, setSurvey] = useState<SurveyResult | null>(null)
  const [photoPaths, setPhotoPaths] = useState<string[]>([])
  // Everything starts accepted; the gardener unticks what's wrong. Reviewing a
  // proposal is much less work than filling a form, which is the whole point.
  const [keepZone, setKeepZone] = useState<Record<string, boolean>>({})
  const [keepPlant, setKeepPlant] = useState<Record<string, boolean>>({})
  const [keepMission, setKeepMission] = useState<Record<string, boolean>>({})
  const [zoneMap, setZoneMap] = useState<Record<string, string>>({}) // survey key → existing zone id
  const [layout, setLayout] = useState<Record<string, { x: number; y: number }>>({})

  // Object URLs are only released on unmount — releasing per-render would blank
  // the thumbnails mid-review.
  useEffect(() => () => { shots.forEach(s => URL.revokeObjectURL(s.preview)) }, [shots])

  const addFiles = useCallback((list: FileList | null) => {
    if (!list?.length) return
    setError(null)
    setShots(prev => {
      const room = MAX_PHOTOS - prev.length
      if (room <= 0) {
        setError(`That's the ${MAX_PHOTOS}-photo limit for one survey. Run a second one for the rest.`)
        return prev
      }
      const next = [...list].slice(0, room).map(file => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      }))
      if (list.length > room) setError(`Added ${room} — that's the ${MAX_PHOTOS}-photo limit for one survey.`)
      return [...prev, ...next]
    })
  }, [])

  function removeShot(id: string) {
    setShots(prev => {
      const gone = prev.find(s => s.id === id)
      if (gone) URL.revokeObjectURL(gone.preview)
      return prev.filter(s => s.id !== id)
    })
  }

  async function runSurvey() {
    if (shots.length === 0) return
    setError(null)
    setStage('analysing')

    try {
      // Upload in batches of four: a phone on garden wifi pushing a dozen
      // full-size photos in one request is how half of them time out.
      setProgress(`Uploading ${shots.length} photo${shots.length === 1 ? '' : 's'}…`)
      const paths: string[] = []
      for (let i = 0; i < shots.length; i += 4) {
        const batch = shots.slice(i, i + 4)
        const fd = new FormData()
        batch.forEach(s => fd.append('files', s.file))
        const res = await fetch('/api/flowgarden/upload', { method: 'POST', body: fd })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error ?? 'Upload failed')
        paths.push(...(json.paths ?? []))
        setProgress(`Uploaded ${Math.min(i + batch.length, shots.length)} of ${shots.length}…`)
      }
      if (paths.length === 0) throw new Error('No photos made it up. Check your connection and try again.')

      setProgress('Reading your garden… this takes a minute for a full walk.')
      const res = await fetch('/api/flowgarden/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gardenId, paths, note: note.trim() || undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'The survey failed')

      const result = json.survey as SurveyResult
      setSurvey(result)
      setPhotoPaths(json.photos ?? paths)
      setKeepZone(Object.fromEntries(result.zones.map(z => [z.key, true])))
      // Low-confidence identifications start unticked — the gardener opts in
      // rather than having to catch a confident mistake.
      setKeepPlant(Object.fromEntries(result.plants.map(p => [p.key, p.confidence >= 0.6])))
      setKeepMission(Object.fromEntries(result.missions.map(m => [m.key, true])))
      setLayout(Object.fromEntries(result.zones.map(z => [z.key, { x: z.x, y: z.y }])))
      setStage('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStage('capture')
    } finally {
      setProgress(null)
    }
  }

  async function apply() {
    if (!survey) return
    setStage('saving')
    setError(null)
    try {
      const res = await fetch('/api/flowgarden/survey/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gardenId,
          photos: photoPaths,
          summary: survey.summary,
          zones: survey.zones
            .filter(z => keepZone[z.key])
            .map(z => ({ ...z, ...(layout[z.key] ?? {}), existing_id: zoneMap[z.key] ?? null })),
          plants: survey.plants.filter(p => keepPlant[p.key] && (!p.zone_key || keepZone[p.zone_key] || zoneMap[p.zone_key])),
          missions: survey.missions.filter(m => keepMission[m.key]),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not save')
      router.push('/')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
      setStage('review')
    }
  }

  const counts = useMemo(() => ({
    zones: survey?.zones.filter(z => keepZone[z.key]).length ?? 0,
    plants: survey?.plants.filter(p => keepPlant[p.key]).length ?? 0,
    missions: survey?.missions.filter(m => keepMission[m.key]).length ?? 0,
  }), [survey, keepZone, keepPlant, keepMission])

  // ── Capture ──────────────────────────────────────────────────────────────
  if (stage === 'capture' || stage === 'analysing') {
    const busy = stage === 'analysing'
    return (
      <div className="page-narrow space-y-6">
        <PageHeader
          title="Survey your garden"
          subtitle="Walk around and photograph each bed from a couple of angles. FlowMe reads the whole set as one place."
        />

        <div className="card">
          <ol className="space-y-2 text-sm" style={{ color: 'var(--fg-text-secondary)' }}>
            {[
              'Photograph each bed or pot from two angles — wide enough to see its neighbours.',
              'Get closer on anything that looks unwell; leaves tell the story.',
              'Include a path, fence or wall in some shots so the layout can be worked out.',
            ].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{ backgroundColor: 'var(--fg-gold-bg)', color: 'var(--fg-gold)', border: '1px solid var(--fg-border-accent)' }}
                >{i + 1}</span>
                <span className="leading-snug">{t}</span>
              </li>
            ))}
          </ol>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="sr-only"
          onChange={e => { addFiles(e.target.files); e.target.value = '' }}
        />

        {shots.length === 0 ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="empty-state w-full block transition-colors hover:border-solid"
          >
            <span className="empty-emoji">📷</span>
            <span className="empty-title block">Add photos</span>
            <span className="empty-body block">Take them now, or pick a set from your camera roll. Up to {MAX_PHOTOS}.</span>
            <span className="btn-primary">Choose photos</span>
          </button>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {shots.map((s, i) => (
                <div
                  key={s.id}
                  className="relative rounded-xl overflow-hidden"
                  style={{ aspectRatio: '1', border: '1px solid var(--fg-border)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.preview} alt={`Garden photo ${i + 1}`} className="w-full h-full object-cover" />
                  <span
                    className="absolute bottom-1 left-1 text-[10px] px-1.5 rounded-full font-semibold"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                  >{i + 1}</span>
                  {!busy && (
                    <button
                      type="button"
                      onClick={() => removeShot(s.id)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                      style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                    >×</button>
                  )}
                </div>
              ))}
              {shots.length < MAX_PHOTOS && !busy && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl flex flex-col items-center justify-center gap-1 text-xs"
                  style={{ aspectRatio: '1', border: '1px dashed var(--fg-border-accent)', color: 'var(--fg-text-muted)' }}
                >
                  <span className="text-xl leading-none">＋</span>
                  Add more
                </button>
              )}
            </div>

            <div>
              <label htmlFor="survey-note" className="field-label">
                Anything FlowMe should know? <span style={{ color: 'var(--fg-text-dim)' }}>(optional)</span>
              </label>
              <textarea
                id="survey-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                disabled={busy}
                rows={2}
                className="input-field resize-none"
                placeholder="The back bed gets no sun after 2pm. Something is eating the kale."
              />
            </div>
          </>
        )}

        {error && <p className="alert-error">{error}</p>}

        {busy ? (
          <div className="card flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full border-2 shrink-0 animate-spin"
              style={{ borderColor: 'var(--fg-border)', borderTopColor: 'var(--fg-green)' }}
              aria-hidden
            />
            <p className="text-sm" style={{ color: 'var(--fg-text-secondary)' }} role="status" aria-live="polite">
              {progress ?? 'Working…'}
            </p>
          </div>
        ) : shots.length > 0 && (
          <button type="button" onClick={runSurvey} className="btn-primary w-full justify-center py-3">
            Read my garden ({shots.length} photo{shots.length === 1 ? '' : 's'})
          </button>
        )}
      </div>
    )
  }

  // ── Review ───────────────────────────────────────────────────────────────
  if (!survey) return null
  const saving = stage === 'saving'

  return (
    <div className="page-narrow space-y-6">
      <PageHeader
        title="What FlowMe found"
        subtitle="Untick anything that's wrong. Nothing is saved to your garden until you confirm."
      />

      <div className="hero-band">
        <div className="min-w-0 flex-1">
          <p className="hero-eyebrow">Survey</p>
          <p className="text-base md:text-lg font-semibold mt-1 leading-snug" style={{ color: 'var(--fg-text)' }}>
            {survey.summary}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
            <span className="badge-green">🗺 {counts.zones} zones</span>
            <span className="badge-green">🌿 {counts.plants} plants</span>
            <span className="badge-gold">⚡ {counts.missions} missions</span>
          </div>
        </div>
      </div>

      {survey.zones.length > 0 && (
        <section>
          <h2 className="section-label">The map — drag to match your garden</h2>
          <GardenMapSketch
            zones={survey.zones.filter(z => keepZone[z.key])}
            layout={layout}
            onMove={(key, x, y) => setLayout(l => ({ ...l, [key]: { x, y } }))}
          />
        </section>
      )}

      {survey.zones.length > 0 && (
        <section>
          <h2 className="section-label">Zones — {counts.zones} of {survey.zones.length}</h2>
          <div className="space-y-2">
            {survey.zones.map(z => (
              <ReviewRow
                key={z.key}
                checked={!!keepZone[z.key]}
                onToggle={() => setKeepZone(s => ({ ...s, [z.key]: !s[z.key] }))}
                title={z.name}
                meta={[sentence(z.zone_type), sentence(z.sun_exposure), `photo${z.photo_indexes.length === 1 ? '' : 's'} ${z.photo_indexes.map(i => i + 1).join(', ')}`]}
                body={z.description}
              >
                {existingZones.length > 0 && (
                  <select
                    className="input-field mt-2 text-xs"
                    value={zoneMap[z.key] ?? ''}
                    onChange={e => setZoneMap(m => ({ ...m, [z.key]: e.target.value }))}
                    aria-label={`Match ${z.name} to an existing zone`}
                  >
                    <option value="">Create as a new zone</option>
                    {existingZones.map(ez => (
                      <option key={ez.id} value={ez.id}>Same as my “{ez.name}”</option>
                    ))}
                  </select>
                )}
              </ReviewRow>
            ))}
          </div>
        </section>
      )}

      {survey.plants.length > 0 && (
        <section>
          <h2 className="section-label">Plants — {counts.plants} of {survey.plants.length}</h2>
          <div className="space-y-2">
            {survey.plants.map(p => {
              const unsure = p.confidence < 0.6
              return (
                <ReviewRow
                  key={p.key}
                  checked={!!keepPlant[p.key]}
                  onToggle={() => setKeepPlant(s => ({ ...s, [p.key]: !s[p.key] }))}
                  title={`${p.quantity > 1 ? `${p.quantity}× ` : ''}${p.name}`}
                  badge={unsure ? { text: 'not sure — check this', tone: 'warn' } : undefined}
                  meta={[
                    // species keeps its own capitalisation — it is a proper name
                    p.species ?? undefined,
                    sentence(p.status),
                    sentence(p.health_status),
                    `photo${p.photo_indexes.length === 1 ? '' : 's'} ${p.photo_indexes.map(i => i + 1).join(', ')}`,
                  ]}
                  body={p.notes}
                />
              )
            })}
          </div>
        </section>
      )}

      {survey.missions.length > 0 && (
        <section>
          <h2 className="section-label">Missions — {counts.missions} of {survey.missions.length}</h2>
          <div className="space-y-2">
            {survey.missions.map(m => (
              <ReviewRow
                key={m.key}
                checked={!!keepMission[m.key]}
                onToggle={() => setKeepMission(s => ({ ...s, [m.key]: !s[m.key] }))}
                title={m.title}
                badge={{ text: m.urgency, tone: m.urgency === 'urgent' || m.urgency === 'high' ? 'warn' : 'plain' }}
                meta={[
                  m.due_in_days === 0 ? 'today' : m.due_in_days ? `in ${m.due_in_days} days` : undefined,
                  `+${m.xp_reward} XP`,
                ]}
                body={m.description}
                reason={m.reason}
              />
            ))}
          </div>
        </section>
      )}

      {survey.needs_better_photo.length > 0 && (
        <section>
          <h2 className="section-label">FlowMe couldn&rsquo;t tell</h2>
          <div className="card">
            <ul className="space-y-1.5">
              {survey.needs_better_photo.map((n, i) => (
                <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--fg-text-secondary)' }}>
                  <span aria-hidden>📷</span><span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {error && <p className="alert-error">{error}</p>}

      <div className="flex gap-2 pb-2">
        <button
          type="button"
          onClick={() => { setStage('capture'); setSurvey(null) }}
          disabled={saving}
          className="btn-secondary flex-1 justify-center"
        >
          Start over
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={saving || (counts.zones + counts.plants + counts.missions === 0)}
          className="btn-primary flex-1 justify-center disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Add to my garden'}
        </button>
      </div>
    </div>
  )
}

function ReviewRow({
  checked, onToggle, title, meta = [], body, reason, badge, children,
}: {
  checked: boolean
  onToggle: () => void
  title: string
  meta?: (string | undefined)[]
  body?: string | null
  reason?: string
  badge?: { text: string; tone: 'warn' | 'plain' }
  children?: React.ReactNode
}) {
  return (
    <div className="card" style={{ opacity: checked ? 1 : 0.55 }}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 w-5 h-5 shrink-0"
          style={{ accentColor: 'var(--fg-green)' }}
          aria-label={`Include ${title}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--fg-text)' }}>{title}</p>
            {badge && (
              <span className={badge.tone === 'warn' ? 'urgency-high shrink-0' : 'urgency-medium shrink-0 capitalize'}>
                {badge.text}
              </span>
            )}
          </div>
          {meta.filter(Boolean).length > 0 && (
            <p className="text-xs mt-1" style={{ color: 'var(--fg-text-muted)' }}>
              {meta.filter(Boolean).join(' · ')}
            </p>
          )}
          {body && (
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--fg-text-secondary)' }}>{body}</p>
          )}
          {reason && (
            <p
              className="text-xs mt-2 leading-relaxed rounded-lg px-3 py-2"
              style={{ backgroundColor: 'var(--fg-panel)', color: 'var(--fg-text-secondary)', border: '1px solid var(--fg-border)' }}
            >
              <span className="font-semibold" style={{ color: 'var(--fg-gold)' }}>Why: </span>{reason}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
