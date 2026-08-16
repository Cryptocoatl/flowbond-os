import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { SurveyClient } from './SurveyClient'

export const dynamic = 'force-dynamic'

export default async function SurveyPage() {
  const ctx = await getGardenContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.garden) redirect('/onboarding')

  // Existing zones let the gardener say "this is the same bed I already have"
  // instead of ending up with two records for one raised bed.
  const admin = createAdminClient()
  const { data: zones } = await admin
    .from('flowgarden_zones')
    .select('id, name')
    .eq('garden_id', ctx.garden.id)
    .order('name')

  return <SurveyClient gardenId={ctx.garden.id} existingZones={zones ?? []} />
}
