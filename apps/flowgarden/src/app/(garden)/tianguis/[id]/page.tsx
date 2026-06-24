import { notFound, redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductOrderClient } from './ProductOrderClient'

export const dynamic = 'force-dynamic'

const PRODUCT_COLS =
  'id, garden_id, user_id, name, category, description, quantity, unit, price_cents, currency, photo_url, pickup_label, pickup_lat, pickup_lng, harvest_date, available_until, status, created_at'

export default async function TianguisProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getGardenContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.garden) redirect('/onboarding')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: product } = await (admin as any)
    .from('flowgarden_tianguis_products')
    .select(PRODUCT_COLS)
    .eq('id', id)
    .maybeSingle()

  if (!product) notFound()
  if (product.status !== 'active' && product.user_id !== ctx.user.id) notFound()

  const { data: garden } = await admin
    .from('flowgarden_gardens')
    .select('name')
    .eq('id', product.garden_id)
    .maybeSingle()

  return (
    <ProductOrderClient
      product={{ ...product, garden_name: garden?.name ?? 'Garden' }}
      isOwner={product.user_id === ctx.user.id}
      buyerEmail={ctx.user.email ?? ''}
    />
  )
}
