import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_GARDEN_MEMBERS = 5

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const inviteCode = body.invite_code?.trim().toUpperCase()

  if (!inviteCode) {
    return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Find the garden by invite code
  const { data: garden, error: gardenError } = await admin
    .from('flowgarden_gardens')
    .select('id, name, invite_code')
    .eq('invite_code', inviteCode)
    .single()

  if (gardenError || !garden) {
    return NextResponse.json({ error: 'Invalid invite code. Check the code and try again.' }, { status: 404 })
  }

  // Check if user is already a member
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('flowgarden_garden_members')
    .select('id')
    .eq('garden_id', garden.id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Already a member — just redirect them to the garden
    return NextResponse.json({ garden, already_member: true }, { status: 200 })
  }

  // Check member count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (admin as any)
    .from('flowgarden_garden_members')
    .select('id', { count: 'exact', head: true })
    .eq('garden_id', garden.id)

  if ((count ?? 0) >= MAX_GARDEN_MEMBERS) {
    return NextResponse.json(
      { error: `This garden is full (max ${MAX_GARDEN_MEMBERS} members).` },
      { status: 409 }
    )
  }

  // Add user as member
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: memberError } = await (admin as any)
    .from('flowgarden_garden_members')
    .insert({ garden_id: garden.id, user_id: user.id, role: 'member' })

  if (memberError) {
    return NextResponse.json({ error: 'Failed to join garden' }, { status: 500 })
  }

  // Update display_name if provided
  if (body.display_name?.trim()) {
    await admin
      .from('flowgarden_profiles')
      .update({ display_name: body.display_name.trim(), updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
  }

  return NextResponse.json({ garden }, { status: 200 })
}
