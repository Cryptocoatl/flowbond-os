// SERVER-ONLY geocoding via OpenStreetMap Nominatim.
// Runs from our server so it behaves identically from any country / VPN / browser
// and never ships a map API key to the client.

export interface GeocodeResult {
  latitude: number
  longitude: number
  display_name: string
  city_label: string
  country: string | null
}

export async function geocode(query: string): Promise<GeocodeResult | null> {
  const q = query.trim()
  if (!q) return null

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', q)
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('limit', '1')
    url.searchParams.set('addressdetails', '1')

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'FlowGarden/1.0 (https://flowgarden.app; garden community map)',
        'Accept-Language': 'en',
      },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null

    const results = (await res.json()) as Array<{
      lat: string
      lon: string
      display_name: string
      address?: Record<string, string>
    }>
    if (!results.length) return null

    const r = results[0]
    const a = r.address ?? {}
    const city = a.city || a.town || a.village || a.municipality || a.county || null
    const state = a.state || a.region || null
    const country = a.country || null
    const cityLabel = [city, state, country].filter(Boolean).join(', ') || r.display_name

    return {
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      display_name: r.display_name,
      city_label: cityLabel,
      country,
    }
  } catch (err) {
    console.error('[geocode] error:', err)
    return null
  }
}

/**
 * Deterministically fuzz a coordinate to ~city level (never reveals exact spot).
 * Same garden id always yields the same offset, so the blurred point is stable
 * (it doesn't jump around on every map load) but cannot be reversed to exact.
 */
export function fuzzCoordinate(lat: number, lon: number, seed: string) {
  // ~0.05 deg ≈ 5.5km of deterministic jitter, plus rounding to ~city grid.
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const jLat = ((h % 1000) / 1000 - 0.5) * 0.08
  const jLon = (((h >> 10) % 1000) / 1000 - 0.5) * 0.08
  return {
    latitude: Math.round((lat + jLat) * 100) / 100,
    longitude: Math.round((lon + jLon) * 100) / 100,
  }
}
