import { Suspense } from 'react'
import LoginClient from './LoginClient'
import DashboardClient from './DashboardClient'
import { createClient } from '@/lib/supabase/server'
import { getMyIdentity } from '@flowbond/auth/identity'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const supabase = await createClient()
  let identity = null
  try {
    // RLS returns only the caller's own row → null when there's no hub session.
    identity = await getMyIdentity(supabase as never)
  } catch {
    identity = null
  }

  if (identity) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <DashboardClient identity={identity} />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Suspense fallback={<div className="text-[var(--fb-muted)] text-sm">Loading…</div>}>
        <LoginClient />
      </Suspense>
    </main>
  )
}
