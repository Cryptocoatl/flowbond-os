import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getGardenContext } from '@/lib/garden-context'
import { createDelivery } from '@/lib/refirides'
import { openEscrow, escrowEnabled } from '@/lib/flowscrow'

export const dynamic = 'force-dynamic'

const ORDER_COLS =
  'id, product_id, garden_id, producer_user_id, buyer_user_id, buyer_name, buyer_phone, quantity, unit, item_cents, total_cents, currency, fulfillment, dropoff_label, dropoff_lat, dropoff_lng, delivery_id, delivery_provider, delivery_status, delivery_fee_cents, delivery_eta_minutes, delivery_distance_m, delivery_tracking_url, payment_method, status, notes, escrow_id, escrow_provider, escrow_status, created_at'

// GET — orders the caller is party to. ?role=buyer|producer to narrow.
export async function GET(request: Request) {
  const ctx = await getGardenContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = new URL(request.url).searchParams.get('role')
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('flowgarden_tianguis_orders')
    .select(ORDER_COLS)
    .order('created_at', { ascending: false })

  if (role === 'buyer') query = query.eq('buyer_user_id', ctx.user.id)
  else if (role === 'producer') query = query.eq('producer_user_id', ctx.user.id)
  else query = query.or(`buyer_user_id.eq.${ctx.user.id},producer_user_id.eq.${ctx.user.id}`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Decorate with product name for display.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data ?? []
  const productIds = [...new Set(rows.map(r => r.product_id))]
  const nameMap = new Map<string, { name: string; photo_url: string | null }>()
  if (productIds.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: products } = await (admin as any)
      .from('flowgarden_tianguis_products')
      .select('id, name, photo_url')
      .in('id', productIds)
    for (const p of products ?? []) nameMap.set(p.id, { name: p.name, photo_url: p.photo_url })
  }
  const decorated = rows.map(r => ({
    ...r,
    product_name: nameMap.get(r.product_id)?.name ?? 'Listing',
    product_photo_url: nameMap.get(r.product_id)?.photo_url ?? null,
  }))

  return NextResponse.json({ data: decorated })
}

// POST — place an order. If fulfillment === 'delivery', dispatch via RefiRides.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getGardenContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    product_id, quantity, fulfillment,
    dropoff_label, dropoff_lat, dropoff_lng,
    buyer_name, buyer_phone, notes,
    delivery_fee_cents, delivery_eta_minutes, delivery_distance_m, // optional, from a prior quote
  } = body

  if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 })
  const qty = Math.max(1, Number(quantity) || 1)
  const mode = fulfillment === 'delivery' ? 'delivery' : 'pickup'
  if (mode === 'delivery' && !dropoff_label?.trim()) {
    return NextResponse.json({ error: 'Drop-off address required for delivery' }, { status: 400 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: product, error: prodErr } = await (admin as any)
    .from('flowgarden_tianguis_products')
    .select('id, name, user_id, garden_id, quantity, unit, price_cents, currency, status, pickup_label, pickup_lat, pickup_lng')
    .eq('id', product_id)
    .maybeSingle()

  if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 500 })
  if (!product || product.status !== 'active') return NextResponse.json({ error: 'Listing unavailable' }, { status: 404 })

  const itemCents = Math.round((product.price_cents || 0) * qty)
  const currency = product.currency || 'MXN'

  // Pickup location (label or coords) needed to dispatch a delivery.
  let pickupLabel = product.pickup_label as string | null
  if (mode === 'delivery' && !pickupLabel && product.pickup_lat == null) {
    const { data: garden } = await admin
      .from('flowgarden_gardens')
      .select('location_label')
      .eq('id', product.garden_id)
      .maybeSingle()
    pickupLabel = garden?.location_label ?? null
  }

  // --- RefiRides dispatch (non-fatal) -----------------------------------
  let delivery: Awaited<ReturnType<typeof createDelivery>> = null
  if (mode === 'delivery') {
    delivery = await createDelivery({
      fbid: user.id, // FBID === auth.uid in the canonical model
      provider: 'self_dispatch',
      pickup: {
        lat: product.pickup_lat ?? undefined,
        lng: product.pickup_lng ?? undefined,
        address: pickupLabel ?? undefined,
        name: 'FlowGarden Tianguis',
      },
      dropoff: {
        lat: dropoff_lat ?? undefined,
        lng: dropoff_lng ?? undefined,
        address: dropoff_label.trim(),
        name: buyer_name?.trim() || ctx.user.email || undefined,
        phone: buyer_phone?.trim() || undefined,
      },
      quote: delivery_fee_cents != null
        ? {
            provider: 'self_dispatch',
            fee_cents: Math.round(Number(delivery_fee_cents) || 0),
            currency,
            eta_minutes: Number(delivery_eta_minutes) || 0,
            distance_m: Number(delivery_distance_m) || 0,
          }
        : undefined,
      manifest: { description: `Tianguis order: ${qty} ${product.unit} ${product.name}`, value_cents: itemCents },
      reference: `tianguis_${product.id}`,
    })
  }

  const feeCents = mode === 'delivery'
    ? (delivery?.quote?.fee_cents ?? (delivery_fee_cents != null ? Math.round(Number(delivery_fee_cents)) : null))
    : null
  const totalCents = itemCents + (feeCents ?? 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('flowgarden_tianguis_orders')
    .insert({
      product_id: product.id,
      garden_id: product.garden_id,
      producer_user_id: product.user_id,
      buyer_user_id: user.id,
      buyer_name: buyer_name?.trim() || null,
      buyer_phone: buyer_phone?.trim() || null,
      quantity: qty,
      unit: product.unit,
      item_cents: itemCents,
      total_cents: totalCents,
      currency,
      fulfillment: mode,
      dropoff_label: mode === 'delivery' ? dropoff_label.trim() : null,
      dropoff_lat: dropoff_lat ?? null,
      dropoff_lng: dropoff_lng ?? null,
      delivery_id: delivery?.id ?? null,
      delivery_provider: delivery?.provider ?? null,
      delivery_status: mode === 'delivery' ? (delivery?.status ?? 'pending') : null,
      delivery_fee_cents: feeCents,
      delivery_eta_minutes: delivery?.quote?.eta_minutes ?? (delivery_eta_minutes ?? null),
      delivery_distance_m: delivery?.quote?.distance_m ?? (delivery_distance_m ?? null),
      delivery_tracking_url: delivery?.tracking_url ?? null,
      payment_method: 'cash',
      status: 'pending',
      notes: notes?.trim() || null,
    })
    .select(ORDER_COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // --- FlowScrow escrow hold (non-fatal; dormant unless FLOWSCROW_API_URL set) ---
  // Hold the buyer's payment until the order is fulfilled (released) or canceled
  // (voided). We store only the reference to the hold FlowScrow owns.
  let order = data
  if (escrowEnabled() && totalCents > 0) {
    const hold = await openEscrow({
      reference: order.id,
      amount_cents: totalCents,
      currency,
      payer: { fbid: user.id, name: buyer_name?.trim() || ctx.user.email || null },
      payee: { fbid: product.user_id },
      description: `Tianguis: ${qty} ${product.unit} ${product.name}`,
      release_on: mode === 'delivery' ? 'delivery_confirmed' : 'pickup_confirmed',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated } = await (admin as any)
      .from('flowgarden_tianguis_orders')
      .update({
        escrow_id: hold?.id ?? null,
        escrow_provider: 'flowscrow',
        escrow_status: hold ? (hold.status || 'held') : 'pending',
      })
      .eq('id', order.id)
      .select(ORDER_COLS)
      .single()
    if (updated) order = updated
  }

  return NextResponse.json({
    data: order,
    // surface a soft warning if delivery was requested but dispatch didn't go through
    delivery_warning: mode === 'delivery' && !delivery
      ? 'Order placed, but the rider network didn’t confirm yet — the producer will arrange dispatch.'
      : null,
    // surface a soft warning if escrow was expected but the hold didn't open
    escrow_warning: escrowEnabled() && totalCents > 0 && !order.escrow_id
      ? 'Order placed, but escrow didn’t open yet — payment will be settled directly.'
      : null,
  }, { status: 201 })
}
