import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getGardenContext } from '@/lib/garden-context'
import { quoteDelivery } from '@/lib/refirides'

export const dynamic = 'force-dynamic'

// POST — get a RefiRides delivery quote for a product → drop-off address.
// Body: { product_id, dropoff_label }
export async function POST(request: Request) {
  const ctx = await getGardenContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { product_id, dropoff_label } = await request.json()
  if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 })
  if (!dropoff_label?.trim()) return NextResponse.json({ error: 'Drop-off address required' }, { status: 400 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: product } = await (admin as any)
    .from('flowgarden_tianguis_products')
    .select('id, name, garden_id, pickup_label, pickup_lat, pickup_lng')
    .eq('id', product_id)
    .maybeSingle()

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  // Fall back to the garden's location label if the listing has no pickup point.
  let pickupLabel = product.pickup_label
  if (!pickupLabel && !product.pickup_lat) {
    const { data: garden } = await admin
      .from('flowgarden_gardens')
      .select('location_label')
      .eq('id', product.garden_id)
      .maybeSingle()
    pickupLabel = garden?.location_label ?? null
  }

  if (!pickupLabel && (product.pickup_lat == null || product.pickup_lng == null)) {
    return NextResponse.json({ error: 'This listing has no pickup location set, so delivery can’t be quoted yet.' }, { status: 422 })
  }

  const result = await quoteDelivery({
    pickup: {
      lat: product.pickup_lat ?? undefined,
      lng: product.pickup_lng ?? undefined,
      address: pickupLabel ?? undefined,
      name: 'FlowGarden Tianguis',
    },
    dropoff: { address: dropoff_label.trim() },
    manifest: { description: `Tianguis: ${product.name}` },
  })

  if (!result) {
    return NextResponse.json({ error: 'Couldn’t reach the delivery network. You can still order for pickup.' }, { status: 502 })
  }

  return NextResponse.json({ quote: result.quote, points: result.points, provider: result.provider })
}
