import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { GardenSettingsClient } from '@/components/garden/GardenSettingsClient'

export const dynamic = 'force-dynamic'

type Visibility = 'private' | 'city' | 'exact' | 'live'

export default async function SettingsPage() {
  const ctx = await getGardenContext()
  if (!ctx) redirect('/auth/login')

  const admin = createAdminClient()

  // The garden this user OWNS (location is the owner's to control).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: owned } = await (admin as any)
    .from('flowgarden_gardens')
    .select('name, location_label, map_visibility, live_url, latitude, longitude, city_label')
    .eq('user_id', ctx.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('flowgarden_profiles')
    .select('password_set')
    .eq('user_id', ctx.user.id)
    .maybeSingle()

  return (
    <div className="p-5 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg">Settings</h1>
        <p className="text-sm text-fg-muted mt-1">Your account, garden location, and map privacy</p>
      </div>

      <GardenSettingsClient
        ownsGarden={!!owned}
        passwordSet={!!profile?.password_set}
        initial={{
          name: owned?.name ?? '',
          location_label: owned?.location_label ?? '',
          map_visibility: (owned?.map_visibility ?? 'private') as Visibility,
          live_url: owned?.live_url ?? '',
          city_label: owned?.city_label ?? null,
          has_coords: owned?.latitude != null && owned?.longitude != null,
        }}
      />
    </div>
  )
}
