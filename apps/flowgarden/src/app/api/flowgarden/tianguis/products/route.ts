import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getGardenContext } from '@/lib/garden-context'

export const dynamic = 'force-dynamic'

const PRODUCT_COLS =
  'id, garden_id, user_id, name, category, description, quantity, unit, price_cents, currency, photo_url, pickup_label, pickup_lat, pickup_lng, harvest_date, available_until, status, created_at'

// GET — the market. By default returns every active listing across all gardens.
// ?mine=1 returns the caller's own listings (any status).
// ?category=<key> filters by category.
export async function GET(request: Request) {
  const ctx = await getGardenContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const mine = url.searchParams.get('mine') === '1'
  const category = url.searchParams.get('category')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('flowgarden_tianguis_products')
    .select(PRODUCT_COLS)
    .order('created_at', { ascending: false })

  if (mine) {
    query = query.eq('user_id', ctx.user.id)
  } else {
    query = query.eq('status', 'active')
  }
  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach the producer garden name for display.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data ?? []
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

  return NextResponse.json({ data: withGarden })
}

// POST — create a listing under the caller's active garden.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getGardenContext()
  if (!ctx?.garden) return NextResponse.json({ error: 'No garden' }, { status: 400 })

  const body = await request.json()
  const {
    name, category, description, quantity, unit, price_cents, currency,
    photo_url, pickup_label, pickup_lat, pickup_lng, harvest_date, available_until, status,
  } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('flowgarden_tianguis_products')
    .insert({
      garden_id: ctx.garden.id,
      user_id: user.id,
      name: name.trim(),
      category: category || 'vegetables',
      description: description?.trim() || null,
      quantity: quantity ?? 1,
      unit: unit || 'kg',
      price_cents: Math.max(0, Math.round(Number(price_cents) || 0)),
      currency: currency || 'MXN',
      photo_url: photo_url?.trim() || null,
      pickup_label: pickup_label?.trim() || ctx.garden.location_label || null,
      pickup_lat: pickup_lat ?? null,
      pickup_lng: pickup_lng ?? null,
      harvest_date: harvest_date || null,
      available_until: available_until || null,
      status: status || 'active',
    })
    .select(PRODUCT_COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
