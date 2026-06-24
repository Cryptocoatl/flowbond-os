import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { JournalClient } from './JournalClient'

export const dynamic = 'force-dynamic'

export default async function JournalPage() {
  const ctx = await getGardenContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.garden) redirect('/onboarding')

  const admin = createAdminClient()
  const [eventsRes, zonesRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('flowgarden_events')
      .select('id, event_type, title, structured_summary, raw_input, urgency, media_urls, occurred_at')
      .eq('garden_id', ctx.garden.id)
      .order('occurred_at', { ascending: false })
      .limit(100),
    admin.from('flowgarden_zones').select('id, name').eq('garden_id', ctx.garden.id).order('name'),
  ])

  return (
    <JournalClient
      events={eventsRes.data ?? []}
      zones={zonesRes.data ?? []}
    />
  )
}
