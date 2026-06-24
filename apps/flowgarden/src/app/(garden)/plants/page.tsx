import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { PlantsClient } from './PlantsClient'

export const dynamic = 'force-dynamic'

export default async function PlantsPage() {
  const ctx = await getGardenContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.garden) redirect('/onboarding')

  const admin = createAdminClient()
  const [plantsRes, zonesRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('flowgarden_plant_groups')
      .select('id, name, species, variety, quantity, status, health_status, notes, zone_id, created_at')
      .eq('garden_id', ctx.garden.id)
      .order('created_at', { ascending: true }),
    admin
      .from('flowgarden_zones')
      .select('id, name')
      .eq('garden_id', ctx.garden.id)
      .order('name', { ascending: true }),
  ])

  return (
    <PlantsClient
      plants={plantsRes.data ?? []}
      zones={zonesRes.data ?? []}
    />
  )
}
