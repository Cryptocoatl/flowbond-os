import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { MyStallClient } from './MyStallClient'

export const dynamic = 'force-dynamic'

const PRODUCT_COLS =
  'id, garden_id, user_id, name, category, description, quantity, unit, price_cents, currency, photo_url, pickup_label, harvest_date, available_until, status, created_at'
const ORDER_COLS =
  'id, product_id, garden_id, producer_user_id, buyer_user_id, buyer_name, buyer_phone, quantity, unit, item_cents, total_cents, currency, fulfillment, dropoff_label, delivery_id, delivery_provider, delivery_status, delivery_fee_cents, delivery_eta_minutes, delivery_tracking_url, payment_method, status, notes, created_at'

export default async function MyStallPage() {
  const ctx = await getGardenContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.garden) redirect('/onboarding')

  const admin = createAdminClient()
  const uid = ctx.user.id

  const [productsRes, receivedRes, boughtRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_tianguis_products').select(PRODUCT_COLS).eq('user_id', uid).order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_tianguis_orders').select(ORDER_COLS).eq('producer_user_id', uid).order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_tianguis_orders').select(ORDER_COLS).eq('buyer_user_id', uid).order('created_at', { ascending: false }),
  ])

  // Attach product names to orders.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders: any[] = [...(receivedRes.data ?? []), ...(boughtRes.data ?? [])]
  const productIds = [...new Set(orders.map(o => o.product_id))]
  const nameMap = new Map<string, string>()
  if (productIds.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prods } = await (admin as any)
      .from('flowgarden_tianguis_products')
      .select('id, name')
      .in('id', productIds)
    for (const p of prods ?? []) nameMap.set(p.id, p.name)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decorate = (o: any) => ({ ...o, product_name: nameMap.get(o.product_id) ?? 'Listing' })

  return (
    <MyStallClient
      products={productsRes.data ?? []}
      received={(receivedRes.data ?? []).map(decorate)}
      bought={(boughtRes.data ?? []).map(decorate)}
      gardenName={ctx.garden.name}
      gardenLocation={ctx.garden.location_label ?? ''}
    />
  )
}
