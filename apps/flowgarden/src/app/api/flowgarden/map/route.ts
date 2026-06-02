import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fuzzCoordinate } from '@/lib/geocode'

export const dynamic = 'force-dynamic'

export interface MapGarden {
  id: string
  name: string
  visibility: 'city' | 'exact' | 'live'
  latitude: number
  longitude: number
  /** Only set for city tier — a human label of the approximate area. */
  city_label: string | null
  /** Only set for live tier. */
  live_url: string | null
  member_count: number
  /** True if the current user belongs to this garden. */
  is_mine: boolean
}

/**
 * Community world map data. Privacy is enforced HERE, server-side:
 *  - private  → never returned
 *  - city     → coordinates fuzzed to ~city level before they leave the server
 *  - exact    → precise pin
 *  - live     → precise pin + broadcast url
 * Exact coordinates of city-tier gardens never reach any browser.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: gardens } = await (admin as any)
    .from('flowgarden_gardens')
    .select('id, name, latitude, longitude, map_visibility, city_label, live_url')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .neq('map_visibility', 'private')

  const rows: Array<{
    id: string; name: string; latitude: number; longitude: number
    map_visibility: 'city' | 'exact' | 'live'; city_label: string | null; live_url: string | null
  }> = gardens ?? []

  // Member counts + which gardens belong to the current user (single pass).
  const ids = rows.map(r => r.id)
  let countsByGarden = new Map<string, number>()
  const mine = new Set<string>()
  if (ids.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: members } = await (admin as any)
      .from('flowgarden_garden_members')
      .select('garden_id, user_id')
      .in('garden_id', ids)
    for (const m of (members ?? []) as { garden_id: string; user_id: string }[]) {
      countsByGarden.set(m.garden_id, (countsByGarden.get(m.garden_id) ?? 0) + 1)
      if (m.user_id === user.id) mine.add(m.garden_id)
    }
  }

  const result: MapGarden[] = rows.map(g => {
    const isCity = g.map_visibility === 'city'
    const coords = isCity
      ? fuzzCoordinate(g.latitude, g.longitude, g.id)
      : { latitude: g.latitude, longitude: g.longitude }
    return {
      id: g.id,
      name: g.name,
      visibility: g.map_visibility,
      latitude: coords.latitude,
      longitude: coords.longitude,
      city_label: isCity ? g.city_label : null,
      live_url: g.map_visibility === 'live' ? g.live_url : null,
      member_count: countsByGarden.get(g.id) ?? 0,
      is_mine: mine.has(g.id),
    }
  })

  return NextResponse.json({ gardens: result })
}
