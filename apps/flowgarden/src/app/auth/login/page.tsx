'use client'

import Image from 'next/image'
import { Suspense, useState, useTransition, type MouseEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* ── Floating organic particle ── */
function Particle({
  size, top, left, delay, duration, opacity,
}: {
  size: number; top: string; left: string; delay: string; duration: string; opacity: number
}) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        top,
        left,
        backgroundColor: `rgba(201, 169, 97, ${opacity})`,
        filter: 'blur(1px)',
        animation: `fg-float-slow ${duration} ease-in-out ${delay} infinite`,
      }}
    />
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/flowgarden'
  const ref = searchParams.get('ref') ?? ''
  const urlError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const linkExpired = urlError === 'auth_failed'
  const [isPending, startTransition] = useTransition()

  const supabase = createClient()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError(null)

    startTransition(async () => {
      const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || window.location.origin
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${siteOrigin}/auth/callback?next=${encodeURIComponent(next)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`,
          shouldCreateUser: true,
        },
      })
      if (error) setError(error.message)
      else setSent(true)
    })
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#050E07' }}
    >
      {/* ── Layered background atmosphere ── */}

      {/* Radial glow — center warmth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(15,46,25,0.95) 0%, rgba(5,14,7,0) 100%)',
        }}
      />

      {/* Ambient gold bloom — top left */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600,
          height: 600,
          top: '-15%',
          left: '-10%',
          borderRadius: '50%',
          backgroundColor: 'rgba(201,169,97,0.04)',
          filter: 'blur(80px)',
          animation: 'fg-glow-pulse 12s ease-in-out infinite',
        }}
      />

      {/* Ambient green bloom — bottom right */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 700,
          height: 700,
          bottom: '-20%',
          right: '-15%',
          borderRadius: '50%',
          backgroundColor: 'rgba(26,92,53,0.08)',
          filter: 'blur(100px)',
          animation: 'fg-glow-pulse 16s ease-in-out 4s infinite',
        }}
      />

      {/* Giant background mark — breathing */}
      <div
        className="absolute pointer-events-none select-none"
        style={{
          width: '65vw',
          maxWidth: 700,
          aspectRatio: '1',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'fg-breathe 14s ease-in-out infinite',
        }}
      >
        <Image
          src="/logos/mark/flowgarden-mark-cream-1024.png"
          alt=""
          fill
          className="object-contain"
          style={{ filter: 'blur(0.5px)' }}
          priority
        />
      </div>

      {/* Floating particles */}
      <Particle size={4} top="18%" left="22%" delay="0s"    duration="9s"  opacity={0.35} />
      <Particle size={3} top="72%" left="16%" delay="2.5s"  duration="11s" opacity={0.25} />
      <Particle size={5} top="30%" left="75%" delay="1s"    duration="13s" opacity={0.20} />
      <Particle size={3} top="65%" left="80%" delay="3.5s"  duration="8s"  opacity={0.30} />
      <Particle size={4} top="82%" left="42%" delay="5s"    duration="10s" opacity={0.20} />
      <Particle size={2} top="12%" left="58%" delay="1.8s"  duration="12s" opacity={0.40} />
      <Particle size={6} top="55%" left="8%"  delay="4s"    duration="15s" opacity={0.12} />
      <Particle size={3} top="40%" left="90%" delay="0.5s"  duration="10s" opacity={0.25} />

      {/* ── Main content ── */}
      <div
        className="relative z-10 flex flex-col items-center px-6 py-12 w-full max-w-sm"
        style={{ animation: 'fg-fade-up 1s ease-out both' }}
      >
        {sent ? (
          /* ── Sent state ── */
          <div className="flex flex-col items-center text-center gap-6">
            {/* Mark pulse on sent */}
            <div
              className="relative"
              style={{ width: 100, height: 100, animation: 'fg-breathe-slow 6s ease-in-out infinite' }}
            >
              <Image
                src="/logos/mark/flowgarden-mark-gold-1024.png"
                alt="FlowGarden"
                fill
                className="object-contain"
              />
            </div>

            <div>
              <h1
                className="text-2xl font-bold italic"
                style={{ fontFamily: 'var(--font-display)', color: '#EFE8D8' }}
              >
                Check your email
              </h1>
              <p className="text-sm mt-3 leading-relaxed" style={{ color: 'rgba(239,232,216,0.55)' }}>
                We sent a magic link to{' '}
                <span style={{ color: '#C9A961' }}>{email}</span>
                .<br />Click it to open your garden.
              </p>
            </div>

            {/* Gold divider */}
            <div className="w-10 h-px" style={{ backgroundColor: 'rgba(201,169,97,0.3)' }} />

            <button
              type="button"
              onClick={() => { setSent(false); setEmail('') }}
              className="text-xs transition-colors"
              style={{ color: 'rgba(239,232,216,0.35)', letterSpacing: '0.08em' }}
              onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.color = 'rgba(239,232,216,0.7)')}
              onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.color = 'rgba(239,232,216,0.35)')}
            >
              ← Use a different email
            </button>
          </div>
        ) : (
          /* ── Login form ── */
          <>
            {/* Lockup */}
            <div className="relative mb-2" style={{ width: 220, height: 220 }}>
              <Image
                src="/logos/lockup/flowgarden-lockup-gold-2048.png"
                alt="FlowGarden — Grow · Flow · Thrive"
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* Brand essence */}
            <p
              className="text-center text-sm italic leading-relaxed mb-10"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'rgba(239,232,216,0.42)',
                maxWidth: 260,
                letterSpacing: '0.01em',
              }}
            >
              A living ecosystem where growth is effortless, connected and abundant
            </p>

            {/* Form card */}
            <div
              className="w-full rounded-2xl px-7 py-7"
              style={{
                backgroundColor: 'rgba(12,26,14,0.75)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(201,169,97,0.18)',
                animation: 'fg-shimmer-border 8s ease-in-out infinite',
              }}
            >
              {linkExpired ? (
                <div className="rounded-xl px-4 py-3 mb-4 text-center"
                  style={{ backgroundColor: 'rgba(201,169,97,0.07)', border: '1px solid rgba(201,169,97,0.2)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#C9A961' }}>Magic link expired</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(239,232,216,0.45)' }}>
                    Links expire after 1 hour. Enter your email to get a fresh one.
                  </p>
                </div>
              ) : (
                <p
                  className="text-center text-xs tracking-widest uppercase mb-6"
                  style={{ color: 'rgba(239,232,216,0.35)', letterSpacing: '0.18em' }}
                >
                  Enter your garden
                </p>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label
                    className="block text-xs mb-2"
                    style={{ color: 'rgba(239,232,216,0.45)', letterSpacing: '0.06em' }}
                  >
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    style={{
                      backgroundColor: 'rgba(239,232,216,0.04)',
                      border: '1px solid rgba(239,232,216,0.10)',
                      color: '#EFE8D8',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'rgba(201,169,97,0.45)'
                      e.currentTarget.style.backgroundColor = 'rgba(239,232,216,0.06)'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(239,232,216,0.10)'
                      e.currentTarget.style.backgroundColor = 'rgba(239,232,216,0.04)'
                    }}
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/30 rounded-xl px-4 py-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isPending || !email.trim()}
                  className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all mt-1 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
                  style={{
                    backgroundColor: '#1A5C35',
                    color: '#EFE8D8',
                    letterSpacing: '0.04em',
                  }}
                  onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => { if (!isPending && email.trim()) e.currentTarget.style.backgroundColor = '#256B41' }}
                  onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = '#1A5C35')}
                >
                  {isPending ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            </div>

            {/* Footer */}
            <p
              className="text-center text-[10px] mt-8 tracking-widest uppercase"
              style={{ color: 'rgba(239,232,216,0.18)', letterSpacing: '0.16em' }}
            >
              FlowBond · Regenerative Intelligence
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: '#050E07' }}
        >
          <div className="opacity-40" style={{ width: 80, height: 80, position: 'relative' }}>
            <Image src="/logos/mark/flowgarden-mark-gold-1024.png" alt="" fill className="object-contain animate-pulse" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
