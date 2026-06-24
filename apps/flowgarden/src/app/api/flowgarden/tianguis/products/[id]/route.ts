import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getGardenContext } from '@/lib/garden-context'

export const dynamic = 'force-dynamic'

const PRODUCT_COLS =
  'id, garden_id, user_id, name, category, description, quantity, unit, price_cents, currency, photo_url, pickup_label, pickup_lat, pickup_lng, harvest_date, available_until, status, created_at'

// GET — a single listing (active to anyone, or own at any status).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getGardenContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('flowgarden_tianguis_products')
    .select(PRODUCT_COLS)
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (data.status !== 'active' && data.user_id !== ctx.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: garden } = await admin
    .from('flowgarden_gardens')
    .select('name')
    .eq('id', data.garden_id)
    .maybeSingle()

  return NextResponse.json({ data: { ...data, garden_name: garden?.name ?? 'Garden' } })
}

// PATCH — update own listing.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const allowed = [
    'name', 'category', 'description', 'quantity', 'unit', 'price_cents', 'currency',
    'photo_url', 'pickup_label', 'pickup_lat', 'pickup_lng', 'harvest_date', 'available_until', 'status',
  ]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {}
  for (const k of allowed) if (k in body) patch[k] = body[k]
  if ('name' in patch) {
    if (!patch.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    patch.name = patch.name.trim()
  }
  if ('price_cents' in patch) patch.price_cents = Math.max(0, Math.round(Number(patch.price_cents) || 0))

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('flowgarden_tianguis_products')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id) // owner-only
    .select(PRODUCT_COLS)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found or not yours' }, { status: 404 })
  return NextResponse.json({ data })
}

// DELETE — remove own listing.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('flowgarden_tianguis_products')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
