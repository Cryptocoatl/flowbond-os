import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { ZonesClient } from './ZonesClient'

export const dynamic = 'force-dynamic'

export default async function MapPage() {
  const ctx = await getGardenContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.garden) redirect('/onboarding')

  const admin = createAdminClient()
  const [zonesRes, plantsRes] = await Promise.all([
    admin
      .from('flowgarden_zones')
      .select('id, name, description, zone_type, sun_exposure, soil_notes, created_at')
      .eq('garden_id', ctx.garden.id)
      .order('created_at', { ascending: true }),
    admin
      .from('flowgarden_plant_groups')
      .select('zone_id, quantity')
      .eq('garden_id', ctx.garden.id),
  ])

  // How many plants live in each zone, so a zone card says something real.
  const plantCounts: Record<string, number> = {}
  for (const p of plantsRes.data ?? []) {
    if (!p.zone_id) continue
    plantCounts[p.zone_id] = (plantCounts[p.zone_id] ?? 0) + (p.quantity ?? 1)
  }

  return <ZonesClient zones={zonesRes.data ?? []} plantCounts={plantCounts} />
}
