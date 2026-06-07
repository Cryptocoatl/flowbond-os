'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { hubRedirect } from '@flowbond/auth'

// Ops login is unified at the FBID hub (fbid.flowbond.life). We bounce there and
// receive the session back at /auth/callback. Ops stays its own app.
function Redirector() {
  const params = useSearchParams()
  const next = params.get('next') ?? '/dashboard'
  useEffect(() => {
    const origin = window.location.origin
    window.location.assign(hubRedirect('ops', `${origin}/auth/callback`, next))
  }, [next])
  return <p className="text-sm text-ops-dim mt-1">Taking you to FlowBond sign-in…</p>
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-ops-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="text-ops-accent text-2xl font-bold">⚡</span>
          <div className="text-left">
            <p className="text-xs font-bold text-ops-text tracking-widest uppercase leading-none">FlowBond</p>
            <p className="text-[10px] text-ops-dim tracking-widest uppercase leading-none mt-0.5">OPS · dev</p>
          </div>
        </div>
        <h1 className="text-xl font-bold text-ops-text">Command Center</h1>
        <Suspense fallback={null}>
          <Redirector />
        </Suspense>
      </div>
    </div>
  )
}
