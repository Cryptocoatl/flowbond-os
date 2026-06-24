import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { MarketClient } from './MarketClient'

export const dynamic = 'force-dynamic'

const PRODUCT_COLS =
  'id, garden_id, user_id, name, category, description, quantity, unit, price_cents, currency, photo_url, pickup_label, harvest_date, available_until, status, created_at'

export default async function TianguisPage() {
  const ctx = await getGardenContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.garden) redirect('/onboarding')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: products } = await (admin as any)
    .from('flowgarden_tianguis_products')
    .select(PRODUCT_COLS)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = products ?? []
  const gardenIds = [...new Set(rows.map(r => r.garden_id))]
  const gardenMap = new Map<string, string>()
  if (gardenIds.length) {
    const { data: gardens } = await admin
      .from('flowgarden_gardens')
      .select('id, name')
      .in('id', gardenIds)
    for (const g of gardens ?? []) gardenMap.set(g.id, g.name)
  }
  const withGarden = rows.map(r => ({ ...r, garden_name: gardenMap.get(r.garden_id) ?? 'Garden' }))

  return <MarketClient products={withGarden} myUserId={ctx.user.id} />
}
