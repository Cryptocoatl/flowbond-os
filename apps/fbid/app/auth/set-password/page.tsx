import { Suspense } from 'react'
import SetPasswordClient from './SetPasswordClient'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Suspense fallback={<div className="text-[var(--fb-muted)] text-sm">Loading…</div>}>
        <SetPasswordClient />
      </Suspense>
    </main>
  )
}
