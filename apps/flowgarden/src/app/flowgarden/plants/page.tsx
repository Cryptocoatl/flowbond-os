import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

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

interface PlantGroup {
  id: string
  name: string
  species: string | null
  variety: string | null
  quantity: number
  status: string
  health_status: string
  notes: string | null
  created_at: string
}

function PlantCard({ plant }: { plant: PlantGroup }) {
  const status = statusConfig[plant.status] ?? { label: plant.status, color: 'bg-stone-100 text-stone-600', dot: 'bg-stone-400' }
  const health = healthConfig[plant.health_status] ?? healthConfig.unknown

  return (
    <div className="card hover:shadow-md transition-shadow">
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
          <p className="text-[10px] text-stone-400 uppercase tracking-wide">Quantity</p>
          <p className="text-sm font-semibold text-stone-800">{plant.quantity}</p>
        </div>
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-wide">Health</p>
          <p className={`text-sm font-semibold ${health.color}`}>{health.label}</p>
        </div>
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-wide">Added</p>
          <p className="text-sm font-medium text-stone-600">
            {new Date(plant.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      {plant.notes && (
        <p className="text-xs text-stone-500 border-t border-stone-50 pt-2 leading-relaxed">
          {plant.notes}
        </p>
      )}
    </div>
  )
}

export default async function PlantsPage() {
  const ctx = await getGardenContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.garden) redirect('/onboarding')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plants } = await (admin as any)
    .from('flowgarden_plant_groups')
    .select('id, name, species, variety, quantity, status, health_status, notes, created_at')
    .eq('garden_id', ctx.garden.id)
    .order('created_at', { ascending: true })

  const allPlants: PlantGroup[] = plants ?? []
  const totalQty = allPlants.reduce((s, p) => s + (p.quantity ?? 1), 0)

  const statusCounts: Record<string, number> = {}
  allPlants.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + (p.quantity ?? 1)
  })

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Plants</h1>
        <p className="text-sm text-stone-400 mt-1">
          {totalQty} plants · {allPlants.length} group{allPlants.length !== 1 ? 's' : ''}
        </p>
      </div>

      {allPlants.length === 0 ? (
        <div className="card border-dashed border-stone-200 bg-stone-50/50 text-center py-16">
          <p className="text-2xl mb-3">🌱</p>
          <p className="text-stone-600 font-medium">No plants yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Tell the Garden Intelligence what you&apos;ve planted and it will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(statusCounts).map(([status, count]) => {
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
            {allPlants.map(plant => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
