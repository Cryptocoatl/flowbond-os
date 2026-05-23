import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
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
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
