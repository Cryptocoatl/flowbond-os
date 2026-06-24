import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const sensorIcons: Record<string, string> = {
  soil_moisture: '💧',
  temperature:   '🌡',
  humidity:      '🌫',
  water_level:   '🪣',
  light:         '☀',
  ph:            '⚗',
  ec:            '⚡',
  water_flow:    '🌊',
}

const sensorLabels: Record<string, string> = {
  soil_moisture: 'Soil Moisture',
  temperature:   'Temperature',
  humidity:      'Humidity',
  water_level:   'Water Level',
  light:         'Light',
  ph:            'pH',
  ec:            'EC',
  water_flow:    'Water Flow',
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

interface Zone {
  id: string
  name: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

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
      .limit(50),
    admin
      .from('flowgarden_zones')
      .select('id, name')
      .eq('garden_id', ctx.garden.id),
  ])

  const readings: SensorReading[] = readingsRes.data ?? []
  const zones: Zone[] = zonesRes.data ?? []
  const zoneMap = new Map(zones.map(z => [z.id, z.name]))

  // Latest reading per sensor type
  const latest = new Map<string, SensorReading>()
  readings.forEach(r => {
    if (!latest.has(r.sensor_type)) latest.set(r.sensor_type, r)
  })

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Devices & Sensors</h1>
        <p className="text-sm text-stone-400 mt-1">
          {readings.length > 0 ? `${latest.size} sensor type${latest.size !== 1 ? 's' : ''} · ${readings.length} readings` : 'No data yet'}
        </p>
      </div>

      {/* Hardware connection status */}
      <div className="card mb-6 border-stone-200 bg-stone-50/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-stone-300" />
          <p className="text-sm font-semibold text-stone-600">No hardware connected</p>
        </div>
        <p className="text-xs text-stone-400 leading-relaxed mb-4">
          Connect a Raspberry Pi or compatible sensor hub to start receiving live readings.
          Manual readings can be logged through the Garden Intelligence.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['Raspberry Pi', 'Soil sensors', 'Camera', 'Weather station'].map(item => (
            <div key={item} className="border border-dashed border-stone-200 rounded-lg px-3 py-2.5 text-center">
              <p className="text-xs text-stone-400">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sensor readings */}
      {readings.length === 0 ? (
        <div className="card border-dashed border-stone-200 bg-stone-50/50 text-center py-16">
          <p className="text-2xl mb-3">📡</p>
          <p className="text-stone-600 font-medium">No sensor data yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Connect hardware or log manual readings through the Garden Intelligence.
          </p>
        </div>
      ) : (
        <>
          {/* Latest per sensor type */}
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Latest readings</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[...latest.values()].map(r => {
              const icon = sensorIcons[r.sensor_type] ?? '📊'
              const label = sensorLabels[r.sensor_type] ?? r.sensor_type.replace(/_/g, ' ')
              const zone = r.zone_id ? zoneMap.get(r.zone_id) : null
              return (
                <div key={r.sensor_type} className="card p-4">
                  <div className="text-xl mb-2">{icon}</div>
                  <p className="text-2xl font-bold text-stone-900 tabular-nums">
                    {r.value}{r.unit ?? ''}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">{label}</p>
                  {zone && <p className="text-[10px] text-stone-400 mt-0.5">{zone}</p>}
                  <p className="text-[10px] text-stone-300 mt-1">{timeAgo(r.recorded_at)}</p>
                </div>
              )
            })}
          </div>

          {/* Recent history */}
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
            Recent history
          </h2>
          <div className="space-y-2">
            {readings.slice(0, 20).map(r => {
              const icon = sensorIcons[r.sensor_type] ?? '📊'
              const label = sensorLabels[r.sensor_type] ?? r.sensor_type.replace(/_/g, ' ')
              const zone = r.zone_id ? zoneMap.get(r.zone_id) : null
              return (
                <div key={r.id} className="flex items-center gap-3 py-2.5 px-4 bg-white border border-stone-100 rounded-xl">
                  <span className="text-base">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-stone-800 tabular-nums">
                      {r.value}{r.unit ?? ''}
                    </span>
                    <span className="text-xs text-stone-400 ml-1.5">{label}</span>
                    {zone && <span className="text-xs text-stone-300 ml-1.5">· {zone}</span>}
                  </div>
                  <span className="text-xs text-stone-300 shrink-0">{timeAgo(r.recorded_at)}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
