'use client'

import Image from 'next/image'
import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { hubRedirect } from '@flowbond/auth'

// FlowGarden login is unified at the FBID hub (fbid.flowbond.life) — the single
// source of truth for identity (magic link / password / OAuth / wallet). We
// bounce there and receive the session back at /auth/callback. The referral
// `ref` and `next` are preserved through the round-trip.
function Redirector() {
  const params = useSearchParams()
  const next = params.get('next') ?? '/flowgarden'
  const ref = params.get('ref') ?? ''

  useEffect(() => {
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || window.location.origin
    const callback = `${origin}/auth/callback${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`
    window.location.assign(hubRedirect('flowgarden', callback, next))
  }, [next, ref])

  return (
    <p className="text-center text-sm" style={{ color: 'rgba(239,232,216,0.5)' }}>
      Taking you to FlowBond sign-in…
    </p>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ backgroundColor: '#050E07' }}>
      <div className="relative opacity-90" style={{ width: 120, height: 120 }}>
        <Image src="/logos/mark/flowgarden-mark-gold-1024.png" alt="FlowGarden" fill className="object-contain animate-pulse" priority />
      </div>
      <Suspense fallback={null}>
        <Redirector />
      </Suspense>
    </div>
  )
}
