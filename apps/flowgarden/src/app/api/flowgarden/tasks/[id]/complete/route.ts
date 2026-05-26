import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MISSION_XP = 5

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { completion_notes, photo_path } = body as { completion_notes?: string; photo_path?: string }

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: task } = await (admin as any)
    .from('flowgarden_tasks')
    .select('id, status, garden_id, claimed_by_user_id, xp_reward, title')
    .eq('id', id)
    .single()

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  if (task.status === 'completed') return NextResponse.json({ error: 'Already completed' }, { status: 409 })

  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (admin as any)
    .from('flowgarden_tasks')
    .update({
      status: 'completed',
      completed_by_user_id: user.id,
      completed_at: now,
      completion_photo_url: photo_path ?? null,
      completion_notes: completion_notes ?? null,
      updated_at: now,
    })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: 'Failed to complete mission' }, { status: 500 })

  // Award XP — use task's xp_reward if set, else default 5
  const xpAmount = task.xp_reward && task.xp_reward > 0 ? task.xp_reward : MISSION_XP

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('flowgarden_xp_log').insert({
    user_id: user.id,
    garden_id: task.garden_id,
    source_task_id: id,
    amount: xpAmount,
    reason: `Completed mission: ${task.title}`,
  })

  // Also update FlowBond identity points if one exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: identity } = await (admin as any)
    .from('flowbond_identities')
    .select('id, points_balance')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (identity) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('flowbond_identities')
      .update({ points_balance: (identity.points_balance ?? 0) + xpAmount, updated_at: now })
      .eq('id', identity.id)
  }

  return NextResponse.json({ ok: true, xp: xpAmount })
}
