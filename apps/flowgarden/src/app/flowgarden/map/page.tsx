import { store } from '@/lib/mock-data'
import Link from 'next/link'
import type { GardenZone } from '@flowbond/core'

export const dynamic = 'force-dynamic'

const sunIcons: Record<string, string> = {
  full_sun: '☀️ Full Sun',
  partial_shade: '⛅ Partial Shade',
  full_shade: '🌑 Full Shade',
}

const irrigationIcons: Record<string, string> = {
  drip: 'Drip',
  sprinkler: 'Sprinkler',
  hand: 'Hand',
  none: 'None',
}

function ZoneCard({ zone }: { zone: GardenZone }) {
  const plants = store.plants.filter(p => p.zoneId === zone.id)
  const area = zone.widthM && zone.lengthM ? (zone.widthM * zone.lengthM).toFixed(1) : null

  const statusCounts: Record<string, number> = {}
  plants.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1
  })

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-stone-900">{zone.name}</h3>
          {zone.locationNotes && (
            <p className="text-xs text-stone-400 mt-0.5">{zone.locationNotes}</p>
          )}
        </div>
        {area && (
          <span className="badge bg-stone-100 text-stone-600">{area} m²</span>
        )}
      </div>

      {zone.description && (
        <p className="text-sm text-stone-600 mb-3">{zone.description}</p>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-4">
        {zone.sunExposure && (
          <div>
            <p className="text-xs text-stone-400">Sun</p>
            <p className="text-xs font-medium text-stone-700">{sunIcons[zone.sunExposure]}</p>
          </div>
        )}
        {zone.irrigationType && (
          <div>
            <p className="text-xs text-stone-400">Irrigation</p>
            <p className="text-xs font-medium text-stone-700">{irrigationIcons[zone.irrigationType]}</p>
          </div>
        )}
        {zone.soilType && (
          <div>
            <p className="text-xs text-stone-400">Soil</p>
            <p className="text-xs font-medium text-stone-700 capitalize">{zone.soilType}</p>
          </div>
        )}
        {zone.widthM && zone.lengthM && (
          <div>
            <p className="text-xs text-stone-400">Size</p>
            <p className="text-xs font-medium text-stone-700">{zone.widthM}m × {zone.lengthM}m</p>
          </div>
        )}
      </div>

      {/* Plants summary */}
      <div className="border-t border-stone-100 pt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-500">
            {plants.length} plant{plants.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-1 flex-wrap justify-end">
            {Object.entries(statusCounts).map(([status, count]) => (
              <span key={status} className="badge bg-emerald-50 text-emerald-700">
                {count} {status}
              </span>
            ))}
          </div>
        </div>
      </div>

      {zone.notes && (
        <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-xs text-amber-800">{zone.notes}</p>
        </div>
      )}
    </div>
  )
}

export default function MapPage() {
  const { zones } = store

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Garden Map</h1>
          <p className="text-sm text-stone-400 mt-1">{zones.length} zones · {store.plants.length} plants</p>
        </div>
        <button className="btn-primary">
          + New Zone
        </button>
      </div>

      {/* Visual area placeholder */}
      <div className="card mb-6 bg-gradient-to-br from-emerald-50 to-stone-50 border-dashed border-stone-300">
        <div className="text-center py-8">
          <p className="text-stone-400 text-sm font-medium">Visual garden layout</p>
          <p className="text-stone-300 text-xs mt-1">
            Interactive drag-and-drop map coming soon. Connect to hardware for real-time overlays.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {zones.map(z => (
              <div key={z.id} className="bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-2 text-center">
                <p className="text-xs font-medium text-emerald-800">{z.name}</p>
                {z.widthM && z.lengthM && (
                  <p className="text-xs text-emerald-600">{z.widthM}×{z.lengthM}m</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {zones.map(zone => (
          <ZoneCard key={zone.id} zone={zone} />
        ))}
      </div>

      <div className="mt-6 card border-dashed border-stone-200 bg-stone-50/50 text-center py-8">
        <p className="text-stone-400 text-sm">No more zones. Ready to add one?</p>
        <button className="btn-primary mt-3">+ Add Zone</button>
      </div>
    </div>
  )
}
