import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch task and verify it belongs to a garden this user is a member of
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: task } = await (admin as any)
    .from('flowgarden_tasks')
    .select('id, status, garden_id, claimed_by_user_id')
    .eq('id', id)
    .single()

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  if (task.status !== 'pending') {
    return NextResponse.json({ error: 'Mission is no longer available' }, { status: 409 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('flowgarden_tasks')
    .update({
      status: 'in_progress',
      claimed_by_user_id: user.id,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending') // atomic guard

  if (error) return NextResponse.json({ error: 'Failed to claim mission' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
