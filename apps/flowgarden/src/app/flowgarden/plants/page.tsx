import { store } from '@/lib/mock-data'
import type { Plant } from '@flowbond/core'

export const dynamic = 'force-dynamic'

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  seed: { label: 'Seed', color: 'bg-stone-100 text-stone-600', dot: 'bg-stone-400' },
  sprout: { label: 'Sprout', color: 'bg-lime-100 text-lime-700', dot: 'bg-lime-500' },
  seedling: { label: 'Seedling', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  growing: { label: 'Growing', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  flowering: { label: 'Flowering', color: 'bg-pink-100 text-pink-700', dot: 'bg-pink-400' },
  fruiting: { label: 'Fruiting', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  harvested: { label: 'Harvested', color: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
  dead: { label: 'Dead', color: 'bg-red-100 text-red-400', dot: 'bg-red-300' },
}

const typeIcons: Record<string, string> = {
  vegetable: 'V',
  herb: 'H',
  flower: 'F',
  fruit: 'Fr',
  tree: 'T',
  companion: 'C',
  cover_crop: 'CC',
  other: '?',
}

const typeColors: Record<string, string> = {
  vegetable: 'bg-green-100 text-green-800',
  herb: 'bg-teal-100 text-teal-800',
  flower: 'bg-pink-100 text-pink-800',
  fruit: 'bg-orange-100 text-orange-800',
  tree: 'bg-amber-100 text-amber-800',
  companion: 'bg-purple-100 text-purple-800',
  cover_crop: 'bg-lime-100 text-lime-800',
  other: 'bg-stone-100 text-stone-600',
}

function PlantCard({ plant }: { plant: Plant }) {
  const zone = store.zones.find(z => z.id === plant.zoneId)
  const status = statusConfig[plant.status]
  const daysPlanted = plant.plantedDate
    ? Math.round((Date.now() - plant.plantedDate.getTime()) / 86400000)
    : null
  const daysToHarvest = plant.expectedHarvestDate
    ? Math.round((plant.expectedHarvestDate.getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${typeColors[plant.type]}`}>
            {typeIcons[plant.type]}
          </div>
          <div>
            <h3 className="font-semibold text-stone-900 text-sm">{plant.name}</h3>
            {plant.variety && <p className="text-xs text-stone-400">{plant.variety}</p>}
          </div>
        </div>
        <span className={`badge ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 mb-3">
        {zone && (
          <div>
            <p className="text-xs text-stone-400">Zone</p>
            <p className="text-xs font-medium text-stone-700">{zone.name}</p>
          </div>
        )}
        {plant.quantity > 1 && (
          <div>
            <p className="text-xs text-stone-400">Qty</p>
            <p className="text-xs font-medium text-stone-700">{plant.quantity} plants</p>
          </div>
        )}
        {daysPlanted !== null && (
          <div>
            <p className="text-xs text-stone-400">Age</p>
            <p className="text-xs font-medium text-stone-700">{daysPlanted}d</p>
          </div>
        )}
        {daysToHarvest !== null && daysToHarvest > 0 && (
          <div>
            <p className="text-xs text-stone-400">Harvest in</p>
            <p className="text-xs font-medium text-amber-700">{daysToHarvest}d</p>
          </div>
        )}
      </div>

      {plant.notes && (
        <p className="text-xs text-stone-500 border-t border-stone-50 pt-2">{plant.notes}</p>
      )}
    </div>
  )
}

export default function PlantsPage() {
  const { plants, zones } = store

  const byType: Record<string, Plant[]> = {}
  plants.forEach(p => {
    if (!byType[p.type]) byType[p.type] = []
    byType[p.type].push(p)
  })

  const statusCounts: Record<string, number> = {}
  plants.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1
  })

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Plants</h1>
          <p className="text-sm text-stone-400 mt-1">{plants.length} plants across {zones.length} zones</p>
        </div>
        <button className="btn-primary">+ Add Plant</button>
      </div>

      {/* Status summary */}
      <div className="flex flex-wrap gap-2 mb-8">
        {Object.entries(statusCounts).map(([status, count]) => {
          const cfg = statusConfig[status]
          return (
            <span key={status} className={`badge ${cfg.color} py-1 px-3`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {count} {cfg.label}
            </span>
          )
        })}
      </div>

      {/* All plants grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plants.map(plant => (
          <PlantCard key={plant.id} plant={plant} />
        ))}
      </div>

      <div className="mt-6 card border-dashed border-stone-200 bg-stone-50/50 text-center py-8">
        <p className="text-stone-400 text-sm">Add a plant to track its growth journey</p>
        <button className="btn-primary mt-3">+ Add Plant</button>
      </div>
    </div>
  )
}
