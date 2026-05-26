import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getGardenContext } from '@/lib/garden-context'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getGardenContext()
  if (!ctx?.garden) return NextResponse.json({ error: 'No garden' }, { status: 400 })

  const { id } = await params
  const body = await request.json()
  const { title, description, urgency, zone_id, due_at, xp_reward, status } = body

  const update: Record<string, unknown> = {}
  if (title !== undefined) update.title = title?.trim() || null
  if (description !== undefined) update.description = description?.trim() || null
  if (urgency !== undefined) update.urgency = urgency
  if (zone_id !== undefined) update.zone_id = zone_id || null
  if (due_at !== undefined) update.due_at = due_at || null
  if (xp_reward !== undefined) update.xp_reward = xp_reward
  if (status !== undefined) update.status = status

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('flowgarden_tasks')
    .update(update)
    .eq('id', id)
    .eq('garden_id', ctx.garden.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getGardenContext()
  if (!ctx?.garden) return NextResponse.json({ error: 'No garden' }, { status: 400 })

  const { id } = await params
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('flowgarden_tasks')
    .delete()
    .eq('id', id)
    .eq('garden_id', ctx.garden.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
