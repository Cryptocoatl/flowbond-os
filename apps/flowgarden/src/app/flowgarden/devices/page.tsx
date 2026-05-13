import { store } from '@/lib/mock-data'
import { existsSync } from 'fs'
import { join } from 'path'
import Image from 'next/image'
import type { Device, SensorReading } from '@flowbond/core'

function getCameraSnapshot(deviceId: string): string | null {
  const filename = `${deviceId}_latest.jpg`
  const filePath = join(process.cwd(), 'public', 'captures', filename)
  return existsSync(filePath) ? `/captures/${filename}` : null
}

export const dynamic = 'force-dynamic'

const deviceTypeLabels: Record<string, string> = {
  raspberry_pi: 'Raspberry Pi',
  soil_sensor: 'Soil Sensor',
  camera: 'Camera',
  weather_station: 'Weather Station',
  water_flow_meter: 'Water Flow Meter',
  water_level_sensor: 'Water Level',
  valve_controller: 'Valve Controller',
}

const deviceTypeIcons: Record<string, string> = {
  raspberry_pi: '🖥',
  soil_sensor: '🌱',
  camera: '📷',
  weather_station: '🌤',
  water_flow_meter: '🌊',
  water_level_sensor: '🪣',
  valve_controller: '🔧',
}

const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
  online: { label: 'Online', dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-700' },
  offline: { label: 'Offline', dot: 'bg-stone-300', text: 'text-stone-400' },
  warning: { label: 'Warning', dot: 'bg-amber-400', text: 'text-amber-700' },
  error: { label: 'Error', dot: 'bg-red-400', text: 'text-red-600' },
}

function DeviceCard({ device }: { device: Device }) {
  const zone = store.zones.find(z => z.id === device.zoneId)
  const status = statusConfig[device.status]
  const readings = store.sensorReadings
    .filter(r => r.deviceId === device.id)
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
    .slice(0, 3)

  const isPlanned = Boolean((device.metadata as Record<string, unknown>)?.planned)
  const isLive = Boolean((device.metadata as Record<string, unknown>)?.live)
  const snapshot = isLive && device.type === 'camera' ? getCameraSnapshot(device.id) : null

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-xl">
            {deviceTypeIcons[device.type]}
          </div>
          <div>
            <h3 className="font-semibold text-stone-900 text-sm">{device.name}</h3>
            <p className="text-xs text-stone-400">{deviceTypeLabels[device.type]}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${status.dot}`} />
          <span className={`text-xs font-medium ${status.text}`}>{status.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
        {zone && (
          <div>
            <p className="text-xs text-stone-400">Zone</p>
            <p className="text-xs font-medium text-stone-700">{zone.name}</p>
          </div>
        )}
        {device.firmwareVersion && (
          <div>
            <p className="text-xs text-stone-400">Firmware</p>
            <p className="text-xs font-medium text-stone-700">{device.firmwareVersion}</p>
          </div>
        )}
        {device.lastSeenAt && (
          <div>
            <p className="text-xs text-stone-400">Last seen</p>
            <p className="text-xs font-medium text-stone-700">
              {device.lastSeenAt.toLocaleDateString()}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-stone-400">ID</p>
          <p className="text-xs font-mono text-stone-500">{device.id.slice(0, 16)}…</p>
        </div>
      </div>

      {readings.length > 0 && (
        <div className="border-t border-stone-100 pt-3 space-y-1">
          {readings.map((r: SensorReading) => (
            <div key={r.id} className="flex justify-between text-xs">
              <span className="text-stone-500 capitalize">{r.readingType.replace('_', ' ')}</span>
              <span className="font-medium text-stone-700">{r.value}{r.unit}</span>
            </div>
          ))}
        </div>
      )}

      {snapshot && (
        <div className="mt-3">
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-stone-100">
            <Image src={snapshot} alt={device.name} fill className="object-cover" unoptimized />
          </div>
          <p className="text-xs text-emerald-600 mt-1.5">Latest snapshot</p>
        </div>
      )}

      {isLive && !snapshot && (
        <div className="mt-3 p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
          <p className="text-xs text-emerald-700 font-medium">Capture agent not running</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Run <code className="font-mono bg-emerald-100 px-1 rounded">pnpm --filter @flowbond/flowgarden-capture dev</code>
          </p>
        </div>
      )}

      {isPlanned && (
        <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-xs text-amber-700 font-medium">Hardware not yet deployed</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Ready to receive data via POST /api/flowgarden/ingest/mock-sensor
          </p>
        </div>
      )}
    </div>
  )
}

export default function DevicesPage() {
  const { devices, sensorReadings } = store

  const onlineCount = devices.filter(d => d.status === 'online').length
  const offlineCount = devices.filter(d => d.status === 'offline').length

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Devices</h1>
          <p className="text-sm text-stone-400 mt-1">
            {onlineCount} online · {offlineCount} offline · {sensorReadings.length} readings stored
          </p>
        </div>
        <button className="btn-primary">+ Add Device</button>
      </div>

      {/* Hardware status banner */}
      <div className="card mb-6 bg-stone-900 text-white border-stone-800">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-xl shrink-0">
            🖥
          </div>
          <div>
            <p className="font-semibold text-sm">Raspberry Pi Integration</p>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              All devices are ready to receive data. Your Pi should POST sensor readings to:
            </p>
            <code className="text-xs text-emerald-400 mt-1 block font-mono">
              POST /api/flowgarden/ingest/mock-sensor
            </code>
            <p className="text-xs text-stone-400 mt-1">
              See <span className="text-emerald-400">packages/flowgarden-hardware/README.md</span> for the full integration guide.
            </p>
          </div>
        </div>
      </div>

      {/* Device grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {devices.map(device => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>

      {/* Sensor readings table */}
      <div className="card">
        <h2 className="font-semibold text-stone-900 mb-4">Recent Sensor Readings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left py-2 text-xs font-medium text-stone-400 uppercase">Type</th>
                <th className="text-left py-2 text-xs font-medium text-stone-400 uppercase">Value</th>
                <th className="text-left py-2 text-xs font-medium text-stone-400 uppercase">Zone</th>
                <th className="text-left py-2 text-xs font-medium text-stone-400 uppercase">Source</th>
                <th className="text-left py-2 text-xs font-medium text-stone-400 uppercase">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {[...sensorReadings]
                .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
                .map(r => {
                  const zone = store.zones.find(z => z.id === r.zoneId)
                  return (
                    <tr key={r.id} className="border-b border-stone-50">
                      <td className="py-2.5 text-stone-700 capitalize">{r.readingType.replace('_', ' ')}</td>
                      <td className="py-2.5 font-medium text-stone-900">{r.value}{r.unit}</td>
                      <td className="py-2.5 text-stone-500">{zone?.name ?? '—'}</td>
                      <td className="py-2.5">
                        <span className="badge bg-stone-50 text-stone-500">{r.source}</span>
                      </td>
                      <td className="py-2.5 text-stone-400 text-xs">
                        {r.recordedAt.toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
