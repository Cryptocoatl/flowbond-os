import { Suspense } from 'react'
import ConfirmEmailClient from './ConfirmEmailClient'

export default function ConfirmEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Suspense fallback={<p className="text-[var(--fb-muted)] text-sm">Loading…</p>}>
        <ConfirmEmailClient />
      </Suspense>
    </main>
  )
}
