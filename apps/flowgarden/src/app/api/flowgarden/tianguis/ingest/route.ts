// Cross-app product ingest for the FlowMe → Tianguis path.
//
// FlowMe (a separate app, flowme.one) is the vendor-facing upload surface. A
// vendor loads a product there (photo + name + price) and it appears in the
// Tianguis marketplace exactly as entered. Both apps share the canonical
// Supabase/FBID project, so we authenticate with the vendor's OWN access token
// (Authorization: Bearer <token>) — no service key is shared with FlowMe, and a
// vendor can only create products as themselves.
//
// Contract — POST multipart/form-data:
//   Authorization: Bearer <supabase access token>   (required)
//   name            (required)
//   price           decimal string e.g. "45.00"     (or price_cents)
//   currency        default MXN
//   category        one of CATEGORIES (default 'other')
//   description, quantity, unit, pickup_label, pickup_lat, pickup_lng, status
//   file            image (jpeg/png/webp/heic, <=10MB)   — OR —
//   photo_url       an already-hosted image URL
//
// Photo rule: every category EXCEPT produce (vegetables/fruits/herbs/seedlings)
// MUST include an image (file or photo_url). Produce may be listed without one.
//
// Stall: products are stall-scoped (a flowgarden "garden"). If the vendor has no
// stall yet, a personal one is provisioned so first-time FlowMe vendors can sell
// immediately. (The richer vendor-presence model — delivery area/hours, market
// schedule — lands in Phase 1.)

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_BYTES = 10 * 1024 * 1024
const CATEGORY_KEYS = ['vegetables', 'fruits', 'herbs', 'seedlings', 'honey', 'eggs', 'dairy', 'crafts', 'other']
// Produce may be listed photo-less (and bulk "excel" listed later); everything
// else requires a picture.
const PRODUCE = new Set(['vegetables', 'fruits', 'herbs', 'seedlings'])
const BUCKET = 'flowgarden-photos'

// FlowMe calls this cross-origin; allow its origins (and localhost for dev).
const ALLOWED_ORIGINS = new Set([
  'https://flowme.one',
  'https://www.flowme.one',
  'http://localhost:3000',
  'http://localhost:3001',
])
function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://flowme.one'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

/** Resolve the vendor's stall, provisioning a personal one on first sale. */
async function resolveStall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  userId: string,
  fallbackName: string,
): Promise<{ id: string; location_label: string | null } | null> {
  // Existing membership (earliest).
  const { data: member } = await admin
    .from('flowgarden_garden_members')
    .select('garden_id')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  let gardenId: string | null = member?.garden_id ?? null

  // Owned-but-unmembered self-heal.
  if (!gardenId) {
    const { data: owned } = await admin
      .from('flowgarden_gardens')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (owned) {
      gardenId = owned.id
      await admin.from('flowgarden_garden_members').insert({ garden_id: gardenId, user_id: userId, role: 'owner' })
    }
  }

  // Provision a stall.
  if (!gardenId) {
    const { data: created, error } = await admin
      .from('flowgarden_gardens')
      .insert({ name: `${fallbackName}'s stall`, user_id: userId })
      .select('id')
      .single()
    if (error || !created) return null
    gardenId = created.id
    await admin.from('flowgarden_garden_members').insert({ garden_id: gardenId, user_id: userId, role: 'owner' })
  }

  const { data: g } = await admin
    .from('flowgarden_gardens')
    .select('id, location_label')
    .eq('id', gardenId)
    .single()
  return g ?? { id: gardenId, location_label: null }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  const cors = corsHeaders(origin)
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: cors })

  // --- Auth: the vendor's own FBID token (shared Supabase project) -----------
  const authz = request.headers.get('authorization') || ''
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : ''
  if (!token) return json({ error: 'Missing bearer token' }, 401)

  const admin = createAdminClient()
  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !user) return json({ error: 'Invalid or expired token' }, 401)

  // --- Parse multipart payload ----------------------------------------------
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'Expected multipart/form-data' }, 400)
  }
  const str = (k: string) => {
    const v = form.get(k)
    return typeof v === 'string' ? v.trim() : ''
  }

  const name = str('name')
  if (!name) return json({ error: 'name is required' }, 400)

  const category = CATEGORY_KEYS.includes(str('category')) ? str('category') : 'other'

  // price: accept decimal `price` or integer `price_cents`
  const priceCentsRaw = str('price_cents')
  const price_cents = priceCentsRaw
    ? Math.max(0, Math.round(Number(priceCentsRaw) || 0))
    : Math.max(0, Math.round((parseFloat(str('price')) || 0) * 100))

  // --- Image: file upload, or a provided URL; enforce the photo rule --------
  let photo_url: string | null = str('photo_url') || null
  const file = form.get('file')
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_TYPES.includes(file.type)) return json({ error: 'Only JPEG, PNG, WebP, or HEIC images allowed' }, 400)
    if (file.size > MAX_BYTES) return json({ error: 'Image too large (max 10 MB)' }, 400)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${user.id}/${randomUUID()}.${ext}`
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
    if (upErr) return json({ error: `Image upload failed: ${upErr.message}` }, 500)
    photo_url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  if (!photo_url && !PRODUCE.has(category)) {
    return json({ error: `A photo is required for ${category}. Only fresh produce may be listed without one.` }, 422)
  }

  // --- Resolve/provision stall, then create the listing ----------------------
  const fallbackName = (user.email?.split('@')[0] || 'Vendor').replace(/[^a-zA-Z0-9 ]/g, '') || 'Vendor'
  const stall = await resolveStall(admin, user.id, fallbackName)
  if (!stall) return json({ error: 'Could not resolve a stall for this vendor' }, 500)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('flowgarden_tianguis_products')
    .insert({
      garden_id: stall.id,
      user_id: user.id,
      name,
      category,
      description: str('description') || null,
      quantity: str('quantity') ? Number(str('quantity')) : 1,
      unit: str('unit') || 'piece',
      price_cents,
      currency: str('currency') || 'MXN',
      photo_url,
      pickup_label: str('pickup_label') || stall.location_label || null,
      pickup_lat: str('pickup_lat') ? Number(str('pickup_lat')) : null,
      pickup_lng: str('pickup_lng') ? Number(str('pickup_lng')) : null,
      status: 'active',
    })
    .select('id, name, category, price_cents, currency, photo_url, status, garden_id, created_at')
    .single()

  if (error) return json({ error: error.message }, 500)
  return json({ ok: true, product: data, marketplace_url: 'https://www.flowgarden.life/tianguis' }, 201)
}
