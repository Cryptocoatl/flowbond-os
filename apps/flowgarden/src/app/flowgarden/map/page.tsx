import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const sunLabels: Record<string, string> = {
  full_sun:      '☀ Full sun',
  partial_shade: '⛅ Partial shade',
  full_shade:    '🌑 Full shade',
}

interface Zone {
  id: string
  name: string
  description: string | null
  zone_type: string | null
  sun_exposure: string | null
  soil_notes: string | null
  created_at: string | null
}

function ZoneCard({ zone }: { zone: Zone }) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-stone-900">{zone.name}</h3>
        {zone.zone_type && (
          <span className="badge bg-emerald-50 text-emerald-700 shrink-0 capitalize">
            {zone.zone_type.replace(/_/g, ' ')}
          </span>
        )}
      </div>
      {zone.description && (
        <p className="text-sm text-stone-600 mb-3 leading-relaxed">{zone.description}</p>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {zone.sun_exposure && (
          <div>
            <p className="text-[10px] text-stone-400 uppercase tracking-wide">Sun</p>
            <p className="text-xs font-medium text-stone-700">{sunLabels[zone.sun_exposure] ?? zone.sun_exposure}</p>
          </div>
        )}
        {zone.soil_notes && (
          <div>
            <p className="text-[10px] text-stone-400 uppercase tracking-wide">Soil</p>
            <p className="text-xs font-medium text-stone-700">{zone.soil_notes}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-wide">Added</p>
          <p className="text-xs font-medium text-stone-600">
            {zone.created_at ? new Date(zone.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default async function MapPage() {
  const ctx = await getGardenContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.garden) redirect('/onboarding')

  const admin = createAdminClient()
  const { data: zones } = await admin
    .from('flowgarden_zones')
    .select('id, name, description, zone_type, sun_exposure, soil_notes, created_at')
    .eq('garden_id', ctx.garden.id)
    .order('created_at', { ascending: true })

  const allZones: Zone[] = zones ?? []

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Garden Map</h1>
        <p className="text-sm text-stone-400 mt-1">{allZones.length} zone{allZones.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="card mb-6 bg-gradient-to-br from-emerald-50 to-stone-50 border-dashed border-stone-300">
        <div className="text-center py-6">
          <p className="text-stone-500 text-sm font-medium">Visual garden layout</p>
          <p className="text-stone-400 text-xs mt-1">Interactive map coming soon · Hardware sensors will overlay here</p>
          {allZones.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {allZones.map(z => (
                <div key={z.id} className="bg-white border border-emerald-200 rounded-lg px-3 py-2 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-800">{z.name}</p>
                  {z.zone_type && (
                    <p className="text-[10px] text-emerald-500 capitalize">{z.zone_type.replace(/_/g, ' ')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {allZones.length === 0 ? (
        <div className="card border-dashed border-stone-200 bg-stone-50/50 text-center py-16">
          <p className="text-2xl mb-3">🗺</p>
          <p className="text-stone-600 font-medium">No zones yet</p>
          <p className="text-stone-400 text-sm mt-1 max-w-xs mx-auto">
            Tell the Garden Intelligence about your areas — front bed, pots, greenhouse — and they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {allZones.map(zone => <ZoneCard key={zone.id} zone={zone} />)}
        </div>
      )}
    </div>
  )
}
