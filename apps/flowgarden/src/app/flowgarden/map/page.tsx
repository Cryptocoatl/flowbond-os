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
  const { data: zones } = await admin
    .from('flowgarden_zones')
    .select('id, name, description, zone_type, sun_exposure, soil_notes, created_at')
    .eq('garden_id', ctx.garden.id)
    .order('created_at', { ascending: true })

  return <ZonesClient zones={zones ?? []} />
}
