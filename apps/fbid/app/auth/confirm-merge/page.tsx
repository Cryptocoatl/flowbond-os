import { Suspense } from 'react'
import ConfirmMergeClient from './ConfirmMergeClient'

export default function ConfirmMergePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Suspense fallback={<p className="text-[var(--fb-muted)] text-sm">Loading…</p>}>
        <ConfirmMergeClient />
      </Suspense>
    </main>
  )
}
