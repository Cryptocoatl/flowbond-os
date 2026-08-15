'use client'

import { useEffect } from 'react'
import Link from 'next/link'

// Any garden page that throws lands here instead of Next's raw error screen.
export default function GardenError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[flowgarden]', error)
  }, [error])

  return (
    <div className="page">
      <div className="empty-state max-w-md mx-auto">
        <span className="empty-emoji">🥀</span>
        <p className="empty-title">Something wilted</p>
        <p className="empty-body">
          This page didn&rsquo;t load. Nothing in your garden was lost — try again, and if it keeps
          happening, tell FlowMe what you were doing.
        </p>
        <div className="flex gap-2 justify-center">
          <button type="button" onClick={reset} className="btn-primary">Try again</button>
          <Link href="/" className="btn-secondary">Back to dashboard</Link>
        </div>
        {error.digest && (
          <p className="text-[10px] mt-4 font-mono" style={{ color: 'var(--fg-text-dim)' }}>
            ref {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
