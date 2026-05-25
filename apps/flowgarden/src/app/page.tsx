import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FlowGardenLockup } from '@flowbond/ui'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Already logged in → go straight to the app
  if (user) redirect('/flowgarden')

  return (
    <main className="min-h-screen bg-flow-dark flex flex-col items-center justify-between px-6 py-16">
      <div className="flex-1 flex flex-col items-center justify-center gap-10 w-full max-w-2xl">
        <FlowGardenLockup width={420} color="gold" priority />

        <p className="font-serif text-2xl md:text-4xl text-flow-cream text-center leading-relaxed max-w-2xl">
          A living ecosystem where growth is effortless, connected and abundant.
        </p>

        <Link
          href="/auth/login"
          className="px-8 py-3 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-semibold rounded-xl text-sm tracking-wide transition-colors touch-manipulation"
        >
          Open your garden
        </Link>
      </div>

      <footer className="text-flow-gold text-xs tracking-[0.3em] uppercase">
        GROW · FLOW · THRIVE
      </footer>
    </main>
  )
}
