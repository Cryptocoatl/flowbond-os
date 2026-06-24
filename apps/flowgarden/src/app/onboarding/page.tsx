import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // If already has a garden membership, skip onboarding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (supabase as any)
    .from('flowgarden_garden_members')
    .select('garden_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (membership) {
    redirect('/')
  }

  // Get existing display name if set
  const { data: profile } = await supabase
    .from('flowgarden_profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .single()

  return (
    <OnboardingClient
      email={user.email ?? ''}
      existingDisplayName={profile?.display_name ?? null}
      inviteCode={code ?? null}
    />
  )
}
