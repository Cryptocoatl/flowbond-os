import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, location_label, climate_zone } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Garden name is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create the garden
  const { data: garden, error: gardenError } = await admin
    .from('flowgarden_gardens')
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      location_label: location_label?.trim() || null,
      climate_zone: climate_zone?.trim() || null,
    })
    .select()
    .single()

  if (gardenError || !garden) {
    return NextResponse.json({ error: gardenError?.message ?? 'Failed to create garden' }, { status: 500 })
  }

  // Add creator as owner in garden_members
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: memberError } = await (admin as any)
    .from('flowgarden_garden_members')
    .insert({ garden_id: garden.id, user_id: user.id, role: 'owner' })

  if (memberError) {
    // Roll back garden if member insert fails
    await admin.from('flowgarden_gardens').delete().eq('id', garden.id)
    return NextResponse.json({ error: 'Failed to initialize garden membership' }, { status: 500 })
  }

  // Update the user's display_name in flowgarden_profiles if provided
  if (body.display_name?.trim()) {
    await admin
      .from('flowgarden_profiles')
      .update({ display_name: body.display_name.trim(), updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
  }

  return NextResponse.json({ garden }, { status: 201 })
}
