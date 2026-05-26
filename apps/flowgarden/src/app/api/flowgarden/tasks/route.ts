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
    .from('flowgarden_tasks')
    .select('id, title, description, status, urgency, is_mission, due_at, zone_id, xp_reward, created_at')
    .eq('garden_id', ctx.garden.id)
    .order('created_at', { ascending: false })

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
  const { title, description, urgency, zone_id, due_at, xp_reward } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('flowgarden_tasks')
    .insert({
      garden_id: ctx.garden.id,
      title: title.trim(),
      description: description?.trim() || null,
      urgency: urgency || 'medium',
      zone_id: zone_id || null,
      due_at: due_at || null,
      xp_reward: xp_reward ?? 5,
      status: 'pending',
      is_mission: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
