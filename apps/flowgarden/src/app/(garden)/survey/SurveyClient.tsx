'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { GardenMapSketch } from '@/components/garden/GardenMapSketch'
import type { SurveyResult, SurveyZone } from '@/lib/survey'

interface ClimateSummary {
  rainTotalMm: number
  et0TotalMm: number
  waterDeficitMm: number
  coldestNightC: number
  hottestDayC: number
  soilTemp6cm: number | null
  days: { date: string; tMax: number; tMin: number; rainMm: number }[]
}

interface Shot { id: string; file: File; preview: string; path?: string; error?: string }
interface ExistingZone { id: string; name: string }

type Stage = 'capture' | 'analysing' | 'review' | 'saving'

const MAX_PHOTOS = 8

/** "full_sun" → "Full sun". Enum values only — never applied to species names. */
function sentence(v?: string | null): string | undefined {
  if (!v) return undefined
  const t = v.replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function SurveyClient({ gardenId, existingZones }: { gardenId: string; existingZones: ExistingZone[] }) {
  const router = useRouter()
  const libraryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

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
  const [climate, setClimate] = useState<ClimateSummary | null>(null)
  // survey plant key → the species the gardener picked from Pl@ntNet's list
  const [speciesPick, setSpeciesPick] = useState<Record<string, string>>({})

  // Every object URL ever created, so they can be released on unmount and ONLY
  // on unmount. Depending this effect on `shots` revokes the existing previews
  // every time a photo is added, which blanks the thumbnails you already had.
  const urlsRef = useRef<string[]>([])
  useEffect(() => () => { urlsRef.current.forEach(u => URL.revokeObjectURL(u)) }, [])

  // NOT a deferred updater over `list`. A FileList is LIVE: the onChange
  // handler clears the input's value (so re-picking the same file still fires
  // change), which empties the FileList before a queued setState updater would
  // read it — which is how photos silently failed to append. Materialise first,
  // then update state.
  function addFiles(list: FileList | null) {
    if (!list?.length) return
    const incoming = Array.from(list)

    const room = MAX_PHOTOS - shots.length
    if (room <= 0) {
      setError(`That's the ${MAX_PHOTOS}-photo limit for one survey. Run a second one for the rest.`)
      return
    }
    setError(incoming.length > room
      ? `Added ${room} — that's the ${MAX_PHOTOS}-photo limit for one survey.`
      : null)

    const next = incoming.slice(0, room).map(file => {
      const preview = URL.createObjectURL(file)
      urlsRef.current.push(preview)
      return { id: crypto.randomUUID(), file, preview }
    })
    setShots(prev => [...prev, ...next])
  }

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

      setProgress('Reading your garden…')
      const res = await fetch('/api/flowgarden/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gardenId, paths, note: note.trim() || undefined }),
      })
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'The survey failed')
      }

      // Newline-delimited JSON. The heartbeats are what keep the connection
      // alive through a two-minute vision call — reading them is not optional.
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let done: { survey: SurveyResult; photos: string[]; climate: ClimateSummary | null } | null = null

      while (true) {
        const { value, done: finished } = await reader.read()
        if (finished) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          let evt: { type: string; seconds?: number; note?: string; error?: string; survey?: SurveyResult; photos?: string[]; climate?: ClimateSummary | null }
          try { evt = JSON.parse(line) } catch { continue }
          if (evt.type === 'progress') {
            const s = evt.seconds ?? 0
            setProgress(evt.note
              ? `${evt.note} (${s}s)`
              : `Reading your garden… ${s}s. A full walk takes a couple of minutes.`)
          } else if (evt.type === 'error') {
            throw new Error(evt.error ?? 'The survey failed')
          } else if (evt.type === 'done' && evt.survey) {
            done = { survey: evt.survey, photos: evt.photos ?? paths, climate: evt.climate ?? null }
          }
        }
      }
      if (!done) throw new Error('The survey ended without a result. Try again.')

      const json = { survey: done.survey, photos: done.photos, climate: done.climate }
      const result = json.survey
      setSurvey(result)
      setPhotoPaths(json.photos ?? paths)
      setClimate(json.climate ?? null)
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
          plants: survey.plants
            .filter(p => keepPlant[p.key] && (!p.zone_key || keepZone[p.zone_key] || zoneMap[p.zone_key]))
            .map(p => (speciesPick[p.key] ? { ...p, species: speciesPick[p.key] } : p)),
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

        {/* Two inputs on purpose. `capture` and `multiple` do not coexist: with
            `capture` set the browser opens the camera and hands back exactly one
            file, which is why batch selection was impossible. So the library
            picker gets `multiple`, and the camera gets its own button. */}
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={e => { addFiles(e.target.files); e.target.value = '' }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={e => { addFiles(e.target.files); e.target.value = '' }}
        />

        {shots.length === 0 ? (
          <div className="empty-state">
            <span className="empty-emoji">📷</span>
            <span className="empty-title block">Add photos</span>
            <span className="empty-body block">
              Pick a whole set from your camera roll, or shoot them one at a time. Up to {MAX_PHOTOS}.
            </span>
            <div className="flex gap-2 justify-center flex-wrap">
              <button type="button" onClick={() => libraryRef.current?.click()} disabled={busy} className="btn-primary">
                Choose photos
              </button>
              <button type="button" onClick={() => cameraRef.current?.click()} disabled={busy} className="btn-secondary">
                Take a photo
              </button>
            </div>
          </div>
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
                  onClick={() => libraryRef.current?.click()}
                  className="rounded-xl flex flex-col items-center justify-center gap-1 text-xs"
                  style={{ aspectRatio: '1', border: '1px dashed var(--fg-border-accent)', color: 'var(--fg-text-muted)' }}
                >
                  <span className="text-xl leading-none">＋</span>
                  Add more
                </button>
              )}
            </div>

            {shots.length < MAX_PHOTOS && !busy && (
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => libraryRef.current?.click()} className="btn-secondary text-xs">
                  ＋ Choose more photos
                </button>
                <button type="button" onClick={() => cameraRef.current?.click()} className="btn-secondary text-xs">
                  📷 Take a photo
                </button>
                <span className="text-xs self-center" style={{ color: 'var(--fg-text-dim)' }}>
                  {shots.length} of {MAX_PHOTOS}
                </span>
              </div>
            )}

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

      {climate && (
        <section>
          <h2 className="section-label">The week these missions are timed against</h2>
          <div className="card">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {climate.days.map(d => (
                <div key={d.date} className="shrink-0 text-center rounded-lg px-2.5 py-2"
                  style={{ backgroundColor: 'var(--fg-panel)', border: '1px solid var(--fg-border)', minWidth: 62 }}>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--fg-text-dim)' }}>
                    {new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
                  </p>
                  <p className="text-sm font-bold tabular-nums mt-0.5" style={{ color: 'var(--fg-text)' }}>
                    {Math.round(d.tMax)}°
                  </p>
                  <p className="text-[10px] tabular-nums" style={{ color: 'var(--fg-text-muted)' }}>
                    {Math.round(d.tMin)}°
                  </p>
                  {d.rainMm > 0 && (
                    <p className="text-[10px] tabular-nums mt-0.5" style={{ color: 'var(--fg-gold)' }}>
                      💧{d.rainMm.toFixed(1)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--fg-text-secondary)' }}>
              {climate.waterDeficitMm > 0
                ? `The garden is set to lose ${climate.waterDeficitMm} mm more water than it receives this week (${climate.et0TotalMm} mm evaporating, ${climate.rainTotalMm} mm of rain).`
                : `Rain covers the week — ${climate.rainTotalMm} mm falling against ${climate.et0TotalMm} mm evaporating, so watering can wait.`}
              {climate.soilTemp6cm !== null && ` Soil is ${climate.soilTemp6cm}°C at 6 cm, which is what decides whether seed will germinate.`}
            </p>
          </div>
        </section>
      )}

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
                >
                  {p.candidates && p.candidates.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--fg-gold)' }}>
                        Pl@ntNet&rsquo;s best matches — pick the right one:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.candidates.slice(0, 4).map(c => {
                          const on = speciesPick[p.key] === c.scientificName
                          return (
                            <button
                              key={c.scientificName}
                              type="button"
                              onClick={() => setSpeciesPick(m => ({
                                ...m,
                                [p.key]: on ? '' : c.scientificName,
                              }))}
                              aria-pressed={on}
                              className={`chip ${on ? 'chip-on' : ''}`}
                              title={c.commonNames.join(', ')}
                            >
                              <span className="italic">{c.scientificName}</span>
                              <span className="opacity-70 ml-1">{Math.round(c.score * 100)}%</span>
                            </button>
                          )
                        })}
                      </div>
                      {speciesPick[p.key] && (
                        <p className="text-[11px] mt-1.5" style={{ color: 'var(--fg-text-muted)' }}>
                          Saving as <span className="italic">{speciesPick[p.key]}</span>.
                        </p>
                      )}
                    </div>
                  )}
                </ReviewRow>
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
