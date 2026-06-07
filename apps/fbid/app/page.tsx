import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import LoginClient from './LoginClient'
import DashboardClient from './DashboardClient'
import { createClient } from '@/lib/supabase/server'
import { isAllowedRedirect } from '@flowbond/auth'
import { getMyIdentity } from '@flowbond/auth/identity'

export const dynamic = 'force-dynamic'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const app = typeof sp.app === 'string' ? sp.app : ''
  const redirectParam = typeof sp.redirect === 'string' ? sp.redirect : ''

  const supabase = await createClient()
  let identity = null
  try {
    // RLS returns only the caller's own row → null when there's no hub session.
    identity = await getMyIdentity(supabase as never)
  } catch {
    identity = null
  }

  // "Remember this device": an app sent the user here to log in, but the hub
  // already has their session → skip the form entirely and hand straight back.
  // Login once at FBID, every app opens logged in on this device.
  if (identity && app && app !== 'fbid' && isAllowedRedirect(redirectParam)) {
    redirect(
      `/api/handoff?app=${encodeURIComponent(app)}&redirect=${encodeURIComponent(redirectParam)}`,
    )
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
