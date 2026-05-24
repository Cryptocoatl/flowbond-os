import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { getGardenContext } from '@/lib/garden-context'

export default async function GardenLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getGardenContext()

  if (!ctx) {
    redirect('/auth/login')
  }

  if (!ctx.garden) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen flex bg-stone-50">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileNav gardenName={ctx.garden?.name} />
        <main className="flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  )
}
