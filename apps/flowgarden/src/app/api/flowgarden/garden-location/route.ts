import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { geocode } from '@/lib/geocode'

export const dynamic = 'force-dynamic'

const VALID_VISIBILITY = ['private', 'city', 'exact', 'live'] as const
type Visibility = (typeof VALID_VISIBILITY)[number]

/**
 * Update the calling user's garden: name, location (geocoded), map visibility,
 * and live broadcast URL. Only the garden OWNER may change these.
 */
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // The garden the user owns (location is a property of the place's owner).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: garden } = await (admin as any)
    .from('flowgarden_gardens')
    .select('id, location_label, latitude, longitude')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!garden) {
    return NextResponse.json({ error: 'You do not own a garden to update' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = { updated_at: new Date().toISOString() }

  if (typeof body.name === 'string' && body.name.trim()) {
    update.name = body.name.trim()
  }

  if (typeof body.map_visibility === 'string') {
    if (!VALID_VISIBILITY.includes(body.map_visibility as Visibility)) {
      return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 })
    }
    update.map_visibility = body.map_visibility
  }

  if ('live_url' in body) {
    const u = typeof body.live_url === 'string' ? body.live_url.trim() : ''
    update.live_url = u || null
  }

  // Decide whether we need to geocode. We geocode when the location text
  // changed OR when the garden still has no coordinates (e.g. it was created
  // before geocoding existed) — otherwise picking a map visibility would
  // silently never place the garden on the map.
  const incomingLabel = typeof body.location_label === 'string' ? body.location_label.trim() : null
  const currentLabel = garden.location_label ?? ''
  const labelChanged = incomingLabel !== null && incomingLabel !== currentLabel
  const missingCoords = garden.latitude == null || garden.longitude == null
  const effectiveLabel = incomingLabel !== null ? incomingLabel : currentLabel

  let geocodeFailed = false
  if (labelChanged && !incomingLabel) {
    // Location was cleared.
    update.location_label = null
    update.latitude = null
    update.longitude = null
    update.city_label = null
  } else if (effectiveLabel && (labelChanged || missingCoords)) {
    if (labelChanged) update.location_label = effectiveLabel
    const geo = await geocode(effectiveLabel)
    if (geo) {
      update.latitude = geo.latitude
      update.longitude = geo.longitude
      update.city_label = geo.city_label
      update.country = geo.country
    } else {
      geocodeFailed = true
    }
  }

  // Guard: can't be visible on the map without coordinates.
  const finalVisibility = update.map_visibility ?? null
  const willHaveCoords = update.latitude != null || (!missingCoords && !('latitude' in update))
  if (finalVisibility && finalVisibility !== 'private' && !willHaveCoords) {
    return NextResponse.json(
      { error: 'Add a location we can find on the map before sharing it. Try a “City, Country” and tap Check.' },
      { status: 400 },
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (admin as any)
    .from('flowgarden_gardens')
    .update(update)
    .eq('id', garden.id)
    .select('id, name, location_label, map_visibility, live_url, latitude, longitude, city_label')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ garden: updated, geocode_failed: geocodeFailed })
}
