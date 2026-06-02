import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geocode } from '@/lib/geocode'

export const dynamic = 'force-dynamic'

/**
 * Server-side geocoding proxy (OpenStreetMap Nominatim, via @/lib/geocode).
 * Used by the client to preview a typed location before saving.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 })

  const result = await geocode(q)
  if (!result) return NextResponse.json({ found: false }, { status: 200 })

  return NextResponse.json({ found: true, ...result })
}
