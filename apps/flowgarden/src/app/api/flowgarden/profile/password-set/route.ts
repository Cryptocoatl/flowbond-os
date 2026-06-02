import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/** Mark the current user as having set a password (drives the Settings nudge). */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('flowgarden_profiles')
    .update({ password_set: true, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
