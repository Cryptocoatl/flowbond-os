import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { SWRegister } from '@/components/pwa/SWRegister'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { ChatLauncher } from '@/components/garden/ChatLauncher'
import { TourGuide } from '@/components/garden/TourGuide'
import { getGardenContext } from '@/lib/garden-context'
import { createClient } from '@/lib/supabase/server'
import { FlowMeChip } from '@flowbond/ui'

export default async function GardenLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getGardenContext()

  if (!ctx) redirect('/welcome')
  if (!ctx.garden) redirect('/onboarding')

  // Ecosystem back-link: this gardener's FlowMe profile (cross-app read of
  // their own row on public.flowme_profiles — owner-readable via RLS).
  let flowMeHandle: string | null = null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data } = await (supabase as unknown as {
      from: (t: string) => any
    })
      .from('flowme_profiles')
      .select('handle')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    flowMeHandle = data?.handle ?? null
  }

  return (
    <div className="min-h-screen flex bg-fg-bg">
      <div className="hidden md:block fixed top-3 right-4 z-40">
        <FlowMeChip handle={flowMeHandle} className="text-fg-muted hover:text-fg transition" />
      </div>
      <Sidebar gardens={ctx.gardens} activeId={ctx.garden.id} activeName={ctx.garden.name} />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileNav gardens={ctx.gardens} activeId={ctx.garden.id} activeName={ctx.garden.name} />
        <main className="flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0">
          {children}
        </main>
      </div>
      <SWRegister />
      <InstallPrompt />
      <ChatLauncher gardenId={ctx.garden.id} />
      <TourGuide />
    </div>
  )
}
