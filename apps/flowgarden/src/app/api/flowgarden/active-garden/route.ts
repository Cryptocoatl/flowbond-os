import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ACTIVE_GARDEN_COOKIE } from '@/lib/garden-context'

export const dynamic = 'force-dynamic'

/** Switch the active garden (must be a member). Sets the selection cookie. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { garden_id } = await request.json().catch(() => ({}))
  if (!garden_id) return NextResponse.json({ error: 'Missing garden_id' }, { status: 400 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (admin as any)
    .from('flowgarden_garden_members')
    .select('garden_id')
    .eq('user_id', user.id)
    .eq('garden_id', garden_id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Not a member of that garden' }, { status: 403 })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ACTIVE_GARDEN_COOKIE, garden_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}
