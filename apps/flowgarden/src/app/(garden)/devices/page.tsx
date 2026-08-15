import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/layout/PageHeader'
import { Sparkline } from '@/components/garden/Sparkline'
import { timeAgo, plural } from '@/lib/format'

export const dynamic = 'force-dynamic'

const sensorMeta: Record<string, { icon: string; label: string; ok?: [number, number] }> = {
  soil_moisture: { icon: '💧', label: 'Soil moisture', ok: [30, 70] },
  temperature:   { icon: '🌡', label: 'Temperature',   ok: [10, 32] },
  humidity:      { icon: '🌫', label: 'Humidity',      ok: [40, 80] },
  water_level:   { icon: '🪣', label: 'Water level',   ok: [20, 100] },
  light:         { icon: '☀', label: 'Light' },
  ph:            { icon: '⚗', label: 'pH',            ok: [6, 7.5] },
  ec:            { icon: '⚡', label: 'EC' },
  water_flow:    { icon: '🌊', label: 'Water flow' },
}

interface SensorReading {
  id: string
  sensor_type: string
  sensor_id: string | null
  value: number
  unit: string | null
  zone_id: string | null
  recorded_at: string
}

// A reading is only "stale" once it's older than a day — sensors report hourly.
const STALE_MS = 24 * 60 * 60 * 1000

export default async function DevicesPage() {
  const ctx = await getGardenContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.garden) redirect('/onboarding')

  const admin = createAdminClient()
  const [readingsRes, zonesRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('flowgarden_sensor_readings')
      .select('id, sensor_type, sensor_id, value, unit, zone_id, recorded_at')
      .eq('garden_id', ctx.garden.id)
      .order('recorded_at', { ascending: false })
      .limit(200),
    admin.from('flowgarden_zones').select('id, name').eq('garden_id', ctx.garden.id),
  ])

  const readings: SensorReading[] = readingsRes.data ?? []
  const zoneMap = new Map((zonesRes.data ?? []).map(z => [z.id, z.name]))

  // Latest per sensor type, plus the recent series behind it for a sparkline.
  const latest = new Map<string, SensorReading>()
  const series = new Map<string, number[]>()
  for (const r of readings) {
    if (!latest.has(r.sensor_type)) latest.set(r.sensor_type, r)
    const s = series.get(r.sensor_type) ?? []
    if (s.length < 24) { s.push(r.value); series.set(r.sensor_type, s) }
  }

  const newest = readings[0]
  const isLive = !!newest && Date.now() - new Date(newest.recorded_at).getTime() < STALE_MS

  return (
    <div className="page space-y-6">
      <PageHeader
        title="Devices & Sensors"
        subtitle={
          readings.length === 0
            ? 'Live numbers from the soil, once hardware is talking'
            : <>{plural(latest.size, 'sensor type')} · {plural(readings.length, 'reading')}</>
        }
      />

      {/* Hardware status */}
      <div
        className="card flex items-start gap-3"
        style={isLive ? { borderColor: 'var(--fg-success-line)' } : undefined}
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
          style={{ backgroundColor: isLive ? 'var(--fg-success)' : 'var(--fg-text-dim)' }}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--fg-text)' }}>
            {isLive ? 'Receiving data' : 'No hardware connected'}
          </p>
          <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--fg-text-muted)' }}>
            {isLive
              ? <>Last reading {timeAgo(newest.recorded_at)}. Readings flow in automatically and show up on the dashboard.</>
              : <>Connect a Raspberry Pi or compatible sensor hub to start receiving live readings. Until then, tell FlowMe a number (&ldquo;soil is at 40%&rdquo;) and it gets logged here.</>}
          </p>
          {!isLive && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
              {['Raspberry Pi', 'Soil sensors', 'Camera', 'Weather station'].map(item => (
                <div
                  key={item}
                  className="rounded-lg px-3 py-2.5 text-center text-xs"
                  style={{ border: '1px dashed var(--fg-border)', color: 'var(--fg-text-dim)' }}
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {readings.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">📡</span>
          <p className="empty-title">No sensor data yet</p>
          <p className="empty-body">
            Once a sensor hub is connected, soil moisture, temperature and the rest land here
            automatically — and FlowGarden starts raising missions when a number drifts.
          </p>
        </div>
      ) : (
        <>
          <section>
            <h2 className="section-label">Right now</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...latest.values()].map(r => {
                const meta = sensorMeta[r.sensor_type] ?? { icon: '📊', label: r.sensor_type.replace(/_/g, ' ') }
                const zone = r.zone_id ? zoneMap.get(r.zone_id) : null
                const points = (series.get(r.sensor_type) ?? []).slice().reverse()
                const outOfRange = meta.ok && (r.value < meta.ok[0] || r.value > meta.ok[1])
                const prev = points.length > 1 ? points[points.length - 2] : null
                const delta = prev != null ? r.value - prev : null

                return (
                  <div
                    key={r.sensor_type}
                    className="card"
                    style={outOfRange ? { borderColor: 'var(--fg-warn-line)' } : undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xl leading-none" aria-hidden>{meta.icon}</span>
                      {delta != null && Math.abs(delta) > 0.01 && (
                        <span
                          className="text-[10px] font-semibold tabular-nums"
                          style={{ color: 'var(--fg-text-muted)' }}
                          title="Change since the previous reading"
                        >
                          {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
                        </span>
                      )}
                    </div>

                    <p className="text-2xl font-bold tabular-nums mt-2 font-display" style={{ color: 'var(--fg-text)' }}>
                      {r.value}<span className="text-base font-normal">{r.unit ?? ''}</span>
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-text-secondary)' }}>{meta.label}</p>

                    {points.length > 2 && (
                      <div className="mt-2">
                        <Sparkline
                          values={points}
                          color={outOfRange ? 'var(--fg-warn)' : 'var(--fg-green)'}
                        />
                      </div>
                    )}

                    <p className="text-[10px] mt-1.5" style={{ color: 'var(--fg-text-dim)' }}>
                      {zone ? `${zone} · ` : ''}{timeAgo(r.recorded_at)}
                    </p>

                    {outOfRange && meta.ok && (
                      <p className="text-[10px] mt-1.5 font-medium" style={{ color: 'var(--fg-warn)' }}>
                        Outside {meta.ok[0]}–{meta.ok[1]}{r.unit ?? ''}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <h2 className="section-label">Recent history</h2>
            <div className="card divide-y p-0" style={{ borderColor: 'var(--fg-border)' }}>
              {readings.slice(0, 25).map(r => {
                const meta = sensorMeta[r.sensor_type] ?? { icon: '📊', label: r.sensor_type.replace(/_/g, ' ') }
                const zone = r.zone_id ? zoneMap.get(r.zone_id) : null
                return (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-base shrink-0" aria-hidden>{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--fg-text)' }}>
                        {r.value}{r.unit ?? ''}
                      </span>
                      <span className="text-xs ml-1.5" style={{ color: 'var(--fg-text-muted)' }}>{meta.label}</span>
                      {zone && <span className="text-xs ml-1.5" style={{ color: 'var(--fg-text-dim)' }}>· {zone}</span>}
                    </div>
                    <time
                      dateTime={r.recorded_at}
                      className="text-xs shrink-0 tabular-nums"
                      style={{ color: 'var(--fg-text-dim)' }}
                    >
                      {timeAgo(r.recorded_at)}
                    </time>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
