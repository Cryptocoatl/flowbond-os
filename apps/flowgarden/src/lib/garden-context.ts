import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'

export interface GardenMember {
  user_id: string
  role: string
  joined_at: string
  display_name: string | null
}

export interface GardenContext {
  user: { id: string; email?: string }
  garden: {
    id: string
    name: string
    description: string | null
    location_label: string | null
    climate_zone: string | null
    invite_code: string | null
    user_id: string
    created_at: string | null
  } | null
  role: string | null
  members: GardenMember[]
}

export async function getGardenContext(): Promise<GardenContext | null> {
  // Use regular client only to verify identity — auth token from cookies
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Use admin client for server-side reads — we're in trusted server code
  // and filter explicitly by user.id, so bypassing RLS is safe here
  const admin = createAdminClient()

  // Find user's earliest garden membership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (admin as any)
    .from('flowgarden_garden_members')
    .select('garden_id, role, joined_at')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1)
    .single()

  if (!membership) {
    return { user: { id: user.id, email: user.email }, garden: null, role: null, members: [] }
  }

  const [gardenRes, membersRes] = await Promise.all([
    admin
      .from('flowgarden_gardens')
      .select('id, name, description, location_label, climate_zone, invite_code, user_id, created_at')
      .eq('id', membership.garden_id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('flowgarden_garden_members')
      .select('user_id, role, joined_at')
      .eq('garden_id', membership.garden_id),
  ])

  // Fetch display names separately (no direct FK between garden_members and profiles)
  const memberRows: { user_id: string; role: string; joined_at: string }[] = membersRes.data ?? []
  const userIds = memberRows.map((m) => m.user_id)
  const profilesRes = userIds.length
    ? await admin.from('flowgarden_profiles').select('user_id, display_name').in('user_id', userIds)
    : { data: [] }
  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.user_id, p.display_name])
  )

  const members: GardenMember[] = memberRows.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    display_name: profileMap.get(m.user_id) ?? null,
  }))

  return {
    user: { id: user.id, email: user.email },
    garden: gardenRes.data ?? null,
    role: membership.role,
    members,
  }
}
