import { store } from '@/lib/mock-data'
import { existsSync } from 'fs'
import { join } from 'path'
import Link from 'next/link'
import Image from 'next/image'
import type { GardenTask, SensorReading } from '@flowbond/core'

function getLatestCameraSnapshot(): string | null {
  const device = store.devices.find(d => d.type === 'camera' && (d.metadata as Record<string, unknown>)?.live)
  if (!device) return null
  const filename = `${device.id}_latest.jpg`
  const filePath = join(process.cwd(), 'public', 'captures', filename)
  if (existsSync(filePath)) return `/captures/${filename}`
  return null
}

export const dynamic = 'force-dynamic'

function SensorCard({
  label,
  value,
  unit,
  icon,
  color,
  source,
  placeholder,
}: {
  label: string
  value?: number
  unit?: string
  icon: string
  color: string
  source?: string
  placeholder?: boolean
}) {
  return (
    <div className={`card flex flex-col gap-2 ${placeholder ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">{label}</span>
        <span className={`text-lg ${color}`}>{icon}</span>
      </div>
      {placeholder ? (
        <div>
          <p className="text-xl font-bold text-stone-300">—</p>
          <p className="text-xs text-stone-400 mt-1">Waiting for sensor</p>
        </div>
      ) : (
        <div>
          <p className="sensor-value text-stone-900">
            {value}<span className="text-sm font-normal text-stone-500 ml-1">{unit}</span>
          </p>
          {source && <p className="text-xs text-stone-400 mt-1">{source}</p>}
        </div>
      )}
    </div>
  )
}

function TaskRow({ task }: { task: GardenTask }) {
  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-amber-100 text-amber-700',
    medium: 'bg-stone-100 text-stone-600',
    low: 'bg-stone-50 text-stone-500',
  }
  const zone = store.zones.find(z => z.id === task.zoneId)

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-stone-50 last:border-0">
      <div className={`w-1.5 h-1.5 rounded-full ${task.priority === 'urgent' || task.priority === 'high' ? 'bg-amber-500' : 'bg-stone-300'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800 truncate">{task.title}</p>
        {zone && <p className="text-xs text-stone-400">{zone.name}</p>}
      </div>
      <span className={`badge ${priorityColors[task.priority]}`}>{task.priority}</span>
    </div>
  )
}

function ReadingRow({ reading }: { reading: SensorReading }) {
  const zone = store.zones.find(z => z.id === reading.zoneId)
  const icons: Record<string, string> = {
    soil_moisture: '💧',
    temperature: '🌡',
    humidity: '🌫',
    water_level: '🪣',
    light: '☀',
    ph: '⚗',
    ec: '⚡',
    water_flow: '🌊',
  }
  const ago = Math.round((Date.now() - reading.recordedAt.getTime()) / 3600000)

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-stone-50 last:border-0">
      <span className="text-base">{icons[reading.readingType]}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-stone-800">
          {reading.value}{reading.unit}
          <span className="text-stone-400 font-normal ml-1">
            {reading.readingType.replace('_', ' ')}
          </span>
        </p>
        {zone && <p className="text-xs text-stone-400">{zone.name}</p>}
      </div>
      <p className="text-xs text-stone-400">{ago}h ago</p>
    </div>
  )
}

export default function DashboardPage() {
  const { zones, plants, tasks, sensorReadings } = store
  const cameraSnapshot = getLatestCameraSnapshot()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today.getTime() + 86400000)

  const todayTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false
    return t.dueDate >= today && t.dueDate < tomorrow
  })

  const pendingTasks = tasks
    .filter(t => t.status === 'pending' || t.status === 'in_progress')
    .sort((a, b) => {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 }
      return order[a.priority] - order[b.priority]
    })
    .slice(0, 5)

  const latestReadings = [...sensorReadings]
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
    .slice(0, 5)

  const soilMoisture = sensorReadings.find(r => r.readingType === 'soil_moisture')
  const temperature = sensorReadings.find(r => r.readingType === 'temperature')
  const humidity = sensorReadings.find(r => r.readingType === 'humidity')
  const waterLevel = sensorReadings.find(r => r.readingType === 'water_level')

  const activeFlowering = plants.filter(
    p => p.status === 'flowering' || p.status === 'fruiting',
  ).length

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Garden Dashboard</h1>
        <p className="text-sm text-stone-400 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href="/flowgarden/map" className="card hover:shadow-md transition-shadow group">
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium">Zones</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{zones.length}</p>
          <p className="text-xs text-emerald-600 mt-1 group-hover:underline">View map →</p>
        </Link>
        <Link href="/flowgarden/plants" className="card hover:shadow-md transition-shadow group">
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium">Plants</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{plants.length}</p>
          <p className="text-xs text-emerald-600 mt-1 group-hover:underline">
            {activeFlowering} flowering/fruiting
          </p>
        </Link>
        <Link href="/flowgarden/tasks" className="card hover:shadow-md transition-shadow group">
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium">Today</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{todayTasks.length}</p>
          <p className="text-xs text-amber-600 mt-1 group-hover:underline">
            {pendingTasks.length} pending total
          </p>
        </Link>
        <Link href="/flowgarden/journal" className="card hover:shadow-md transition-shadow group">
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium">Journal</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{store.journal.length}</p>
          <p className="text-xs text-emerald-600 mt-1 group-hover:underline">Last entry 1d ago</p>
        </Link>
      </div>

      {/* Sensor grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Sensors</h2>
          <Link href="/flowgarden/devices" className="text-xs text-emerald-600 hover:underline">
            Manage devices →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SensorCard
            label="Soil Moisture"
            icon="💧"
            color="text-blue-500"
            value={soilMoisture?.value}
            unit={soilMoisture?.unit}
            source={soilMoisture ? `Manual · ${store.zones.find(z => z.id === soilMoisture.zoneId)?.name ?? 'Unknown'}` : undefined}
            placeholder={!soilMoisture}
          />
          <SensorCard
            label="Temperature"
            icon="🌡"
            color="text-orange-500"
            value={temperature?.value}
            unit={temperature?.unit}
            source={temperature ? 'Manual entry' : undefined}
            placeholder={!temperature}
          />
          <SensorCard
            label="Humidity"
            icon="🌫"
            color="text-sky-500"
            value={humidity?.value}
            unit={humidity?.unit}
            source={humidity ? 'Manual entry' : undefined}
            placeholder={!humidity}
          />
          <SensorCard
            label="Water Tank"
            icon="🪣"
            color="text-teal-500"
            value={waterLevel?.value}
            unit={waterLevel?.unit}
            source={waterLevel ? 'Manual entry' : undefined}
            placeholder={!waterLevel}
          />
          {/* Live camera card */}
          <div className="card flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Camera</span>
              <span className="text-lg text-stone-400">📷</span>
            </div>
            {cameraSnapshot ? (
              <div>
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-stone-100 mt-1">
                  <Image
                    src={cameraSnapshot}
                    alt="Back Garden"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <p className="text-xs text-emerald-600 mt-1.5 font-medium">Live · Lake Castle back</p>
              </div>
            ) : (
              <div>
                <p className="text-xl font-bold text-stone-300">—</p>
                <p className="text-xs text-stone-400 mt-1">Capture agent offline</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tasks + Readings side by side */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pending missions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900">Active Missions</h2>
            <Link href="/flowgarden/tasks" className="text-xs text-emerald-600 hover:underline">
              All missions →
            </Link>
          </div>
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">No pending tasks. Garden is thriving.</p>
          ) : (
            pendingTasks.map(t => <TaskRow key={t.id} task={t} />)
          )}
        </div>

        {/* Latest readings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900">Latest Readings</h2>
            <Link href="/flowgarden/devices" className="text-xs text-emerald-600 hover:underline">
              All data →
            </Link>
          </div>
          {latestReadings.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">No readings yet. Add manual readings or connect sensors.</p>
          ) : (
            latestReadings.map(r => <ReadingRow key={r.id} reading={r} />)
          )}
        </div>
      </div>

      {/* AI placeholder */}
      <div className="mt-6 card border-dashed border-emerald-200 bg-emerald-50/40">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-700">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">AI Garden Intelligence</p>
            <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
              Connect your Anthropic API key to enable: garden health summaries, watering recommendations,
              pest risk detection, and mission generation. Stubs are ready — just add <code className="font-mono bg-emerald-100 px-1 rounded">ANTHROPIC_API_KEY</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
