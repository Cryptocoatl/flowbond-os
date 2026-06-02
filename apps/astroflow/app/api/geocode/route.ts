import { NextRequest, NextResponse } from 'next/server';

// Server-side birthplace search via OpenStreetMap Nominatim (no API key, behaves
// the same from any country, never ships a map key to the client). Mirrors
// FlowGarden's geocoder. Coordinates come back as east-positive lng / north-
// positive lat — exactly what the astro engine expects.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '6');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AstroFlow/1.0 (https://flowbond.life; birth-chart geocoding)',
        'Accept-Language': 'en',
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json({ results: [] });

    const rows = (await res.json()) as Array<{
      place_id: number;
      lat: string;
      lon: string;
      display_name: string;
      address?: Record<string, string>;
    }>;

    const results = rows.map((r) => {
      const a = r.address ?? {};
      const city = a.city || a.town || a.village || a.municipality || a.county || a.state_district;
      const label = [city, a.state || a.region, a.country].filter(Boolean).join(', ') || r.display_name;
      return { id: r.place_id, label, lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
    });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
