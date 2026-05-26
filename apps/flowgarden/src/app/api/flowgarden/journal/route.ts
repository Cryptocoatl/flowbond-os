import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getGardenContext } from '@/lib/garden-context'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getGardenContext()
  if (!ctx?.garden) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('flowgarden_events')
    .select('id, event_type, title, structured_summary, raw_input, urgency, media_urls, occurred_at')
    .eq('garden_id', ctx.garden.id)
    .order('occurred_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getGardenContext()
  if (!ctx?.garden) return NextResponse.json({ error: 'No garden' }, { status: 400 })

  const body = await request.json()
  const { event_type, title, structured_summary, urgency, zone_id, occurred_at } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('flowgarden_events')
    .insert({
      garden_id: ctx.garden.id,
      user_id: user.id,
      event_type: event_type || 'text_observation',
      title: title.trim(),
      structured_summary: structured_summary?.trim() || null,
      urgency: urgency || 'none',
      zone_id: zone_id || null,
      occurred_at: occurred_at || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
