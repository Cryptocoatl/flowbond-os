import { cookies } from 'next/headers'
import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'

export const ACTIVE_GARDEN_COOKIE = 'fg_active_garden'

export interface GardenMember {
  user_id: string
  role: string
  joined_at: string
  display_name: string | null
}

export interface GardenSummary {
  id: string
  name: string
  role: string
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
  /** Every garden the user belongs to — drives the garden switcher. */
  gardens: GardenSummary[]
}

export async function getGardenContext(): Promise<GardenContext | null> {
  // Use regular client only to verify identity — auth token from cookies
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const cookieStore = await cookies()

  // Use admin client for server-side reads — we're in trusted server code
  // and filter explicitly by user.id, so bypassing RLS is safe here
  const admin = createAdminClient()

  // All of the user's garden memberships (earliest first).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: memberships } = await (admin as any)
    .from('flowgarden_garden_members')
    .select('garden_id, role, joined_at')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })

  let memberRows: { garden_id: string; role: string; joined_at: string }[] = memberships ?? []

  // Self-heal: a user may OWN a garden but be missing its membership row
  // (e.g. created before membership was guaranteed). Without this they get
  // trapped in onboarding and can't reach the rest of the app.
  if (memberRows.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: owned } = await (admin as any)
      .from('flowgarden_gardens')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (owned) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from('flowgarden_garden_members')
        .insert({ garden_id: owned.id, user_id: user.id, role: 'owner' })
      memberRows = [{ garden_id: owned.id, role: 'owner', joined_at: new Date().toISOString() }]
    }
  }

  if (memberRows.length === 0) {
    return { user: { id: user.id, email: user.email }, garden: null, role: null, members: [], gardens: [] }
  }

  // Names for every garden the user belongs to (for the switcher).
  const allIds = memberRows.map(m => m.garden_id)
  const { data: gardenNames } = await admin
    .from('flowgarden_gardens')
    .select('id, name')
    .in('id', allIds)
  const nameMap = new Map((gardenNames ?? []).map(g => [g.id, g.name]))
  const gardens: GardenSummary[] = memberRows.map(m => ({
    id: m.garden_id,
    name: nameMap.get(m.garden_id) ?? 'Garden',
    role: m.role,
  }))

  // Pick the active garden: the cookie's choice if the user still belongs to
  // it, otherwise their earliest garden.
  const activeId = cookieStore.get(ACTIVE_GARDEN_COOKIE)?.value
  const active = memberRows.find(m => m.garden_id === activeId) ?? memberRows[0]

  const [gardenRes, membersRes] = await Promise.all([
    admin
      .from('flowgarden_gardens')
      .select('id, name, description, location_label, climate_zone, invite_code, user_id, created_at')
      .eq('id', active.garden_id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('flowgarden_garden_members')
      .select('user_id, role, joined_at')
      .eq('garden_id', active.garden_id),
  ])

  // Fetch display names separately (no direct FK between garden_members and profiles)
  const rows: { user_id: string; role: string; joined_at: string }[] = membersRes.data ?? []
  const userIds = rows.map((m) => m.user_id)
  const profilesRes = userIds.length
    ? await admin.from('flowgarden_profiles').select('user_id, display_name').in('user_id', userIds)
    : { data: [] }
  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.user_id, p.display_name])
  )

  const members: GardenMember[] = rows.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    display_name: profileMap.get(m.user_id) ?? null,
  }))

  return {
    user: { id: user.id, email: user.email },
    garden: gardenRes.data ?? null,
    role: active.role,
    members,
    gardens,
  }
}
