import { Suspense } from 'react'
import LoginClient from './LoginClient'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Suspense fallback={<div className="text-[var(--fb-muted)] text-sm">Loading…</div>}>
        <LoginClient />
      </Suspense>
    </main>
  )
}
