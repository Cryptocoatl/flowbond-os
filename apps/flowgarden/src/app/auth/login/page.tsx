'use client'

import Image from 'next/image'
import { Suspense, useState, useTransition, type MouseEvent } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Client-only: keeps Reown AppKit's createAppKit() out of the server bundle.
const WalletAuth = dynamic(() => import('@/components/garden/WalletAuth'), { ssr: false })

type Provider = 'google' | 'apple' | 'github'

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

  const [mode, setMode] = useState<'magic' | 'password'>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState<false | 'magic' | 'reset'>(false)
  const [error, setError] = useState<string | null>(null)
  const linkExpired = urlError === 'auth_failed'
  const [isPending, startTransition] = useTransition()

  const supabase = createClient()

  function callbackUrl() {
    const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || window.location.origin
    return `${siteOrigin}/auth/callback?next=${encodeURIComponent(next)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`
  }

  function handleMagic(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError(null)
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
      })
      if (error) setError(error.message)
      else setSent('magic')
    })
  }

  function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setError(null)
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        setError(
          error.message.toLowerCase().includes('invalid')
            ? 'Wrong email or password. First time here? Use a magic link to set up your account.'
            : error.message,
        )
      } else {
        window.location.href = next
      }
    })
  }

  function handleForgot() {
    if (!email.trim()) { setError('Enter your email first, then tap “Forgot password”.'); return }
    setError(null)
    startTransition(async () => {
      const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || window.location.origin
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${siteOrigin}/auth/callback?next=${encodeURIComponent('/auth/set-password')}`,
      })
      if (error) setError(error.message)
      else setSent('reset')
    })
  }

  function handleOAuth(provider: Provider) {
    setError(null)
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl() },
      })
      // On success the browser redirects to the provider; only errors return here.
      if (error) setError(`${providerName(provider)} sign-in isn’t enabled yet. Try a magic link for now.`)
    })
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#050E07' }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(15,46,25,0.95) 0%, rgba(5,14,7,0) 100%)' }} />
      <div className="absolute pointer-events-none" style={{ width: 600, height: 600, top: '-15%', left: '-10%', borderRadius: '50%', backgroundColor: 'rgba(201,169,97,0.04)', filter: 'blur(80px)', animation: 'fg-glow-pulse 12s ease-in-out infinite' }} />
      <div className="absolute pointer-events-none" style={{ width: 700, height: 700, bottom: '-20%', right: '-15%', borderRadius: '50%', backgroundColor: 'rgba(26,92,53,0.08)', filter: 'blur(100px)', animation: 'fg-glow-pulse 16s ease-in-out 4s infinite' }} />

      <div className="absolute pointer-events-none select-none" style={{ width: '65vw', maxWidth: 700, aspectRatio: '1', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', animation: 'fg-breathe 14s ease-in-out infinite' }}>
        <Image src="/logos/mark/flowgarden-mark-cream-1024.png" alt="" fill className="object-contain" style={{ filter: 'blur(0.5px)' }} priority />
      </div>

      <Particle size={4} top="18%" left="22%" delay="0s"    duration="9s"  opacity={0.35} />
      <Particle size={3} top="72%" left="16%" delay="2.5s"  duration="11s" opacity={0.25} />
      <Particle size={5} top="30%" left="75%" delay="1s"    duration="13s" opacity={0.20} />
      <Particle size={3} top="65%" left="80%" delay="3.5s"  duration="8s"  opacity={0.30} />
      <Particle size={2} top="12%" left="58%" delay="1.8s"  duration="12s" opacity={0.40} />

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center px-6 py-12 w-full max-w-sm" style={{ animation: 'fg-fade-up 1s ease-out both' }}>
        {sent ? (
          <div className="flex flex-col items-center text-center gap-6">
            <div className="relative" style={{ width: 100, height: 100, animation: 'fg-breathe-slow 6s ease-in-out infinite' }}>
              <Image src="/logos/mark/flowgarden-mark-gold-1024.png" alt="FlowGarden" fill className="object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold italic" style={{ fontFamily: 'var(--font-display)', color: '#EFE8D8' }}>
                Check your email
              </h1>
              <p className="text-sm mt-3 leading-relaxed" style={{ color: 'rgba(239,232,216,0.55)' }}>
                {sent === 'reset'
                  ? <>We sent a link to set a new password to{' '}<span style={{ color: '#C9A961' }}>{email}</span>.</>
                  : <>We sent a magic link to{' '}<span style={{ color: '#C9A961' }}>{email}</span>.<br />Click it to open your garden.</>}
              </p>
            </div>
            <div className="w-10 h-px" style={{ backgroundColor: 'rgba(201,169,97,0.3)' }} />
            <button
              type="button"
              onClick={() => { setSent(false); setEmail(''); setPassword('') }}
              className="text-xs transition-colors"
              style={{ color: 'rgba(239,232,216,0.35)', letterSpacing: '0.08em' }}
              onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.color = 'rgba(239,232,216,0.7)')}
              onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.color = 'rgba(239,232,216,0.35)')}
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <>
            <div className="relative mb-2" style={{ width: 200, height: 200 }}>
              <Image src="/logos/lockup/flowgarden-lockup-gold-2048.png" alt="FlowGarden — Grow · Flow · Thrive" fill className="object-contain" priority />
            </div>
            <p className="text-center text-sm italic leading-relaxed mb-8" style={{ fontFamily: 'var(--font-display)', color: 'rgba(239,232,216,0.42)', maxWidth: 260, letterSpacing: '0.01em' }}>
              A living ecosystem where growth is effortless, connected and abundant
            </p>

            <div className="w-full rounded-2xl px-7 py-7" style={{ backgroundColor: 'rgba(12,26,14,0.75)', backdropFilter: 'blur(20px)', border: '1px solid rgba(201,169,97,0.18)', animation: 'fg-shimmer-border 8s ease-in-out infinite' }}>
              {linkExpired && (
                <div className="rounded-xl px-4 py-3 mb-4 text-center" style={{ backgroundColor: 'rgba(201,169,97,0.07)', border: '1px solid rgba(201,169,97,0.2)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#C9A961' }}>Link expired</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(239,232,216,0.45)' }}>
                    Magic links expire after 1 hour. Sign in again below.
                  </p>
                </div>
              )}

              {/* Mode toggle */}
              <div className="flex rounded-xl p-1 mb-5" style={{ backgroundColor: 'rgba(239,232,216,0.04)', border: '1px solid rgba(239,232,216,0.08)' }}>
                {(['magic', 'password'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(null) }}
                    className="flex-1 rounded-lg py-2 text-xs font-semibold transition-colors"
                    style={{
                      backgroundColor: mode === m ? '#1A5C35' : 'transparent',
                      color: mode === m ? '#EFE8D8' : 'rgba(239,232,216,0.5)',
                    }}
                  >
                    {m === 'magic' ? 'Magic link' : 'Password'}
                  </button>
                ))}
              </div>

              <form onSubmit={mode === 'magic' ? handleMagic : handlePassword} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs mb-2" style={{ color: 'rgba(239,232,216,0.45)', letterSpacing: '0.06em' }}>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    style={{ backgroundColor: 'rgba(239,232,216,0.04)', border: '1px solid rgba(239,232,216,0.10)', color: '#EFE8D8' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(201,169,97,0.45)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(239,232,216,0.10)' }}
                  />
                </div>

                {mode === 'password' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs" style={{ color: 'rgba(239,232,216,0.45)', letterSpacing: '0.06em' }}>Password</label>
                      <button type="button" onClick={handleForgot} className="text-[11px]" style={{ color: 'rgba(201,169,97,0.7)' }}>
                        Forgot?
                      </button>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{ backgroundColor: 'rgba(239,232,216,0.04)', border: '1px solid rgba(239,232,216,0.10)', color: '#EFE8D8' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(201,169,97,0.45)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(239,232,216,0.10)' }}
                    />
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/30 rounded-xl px-4 py-2.5 leading-relaxed">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isPending || !email.trim() || (mode === 'password' && !password)}
                  className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all mt-1 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
                  style={{ backgroundColor: '#1A5C35', color: '#EFE8D8', letterSpacing: '0.04em' }}
                  onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => { if (!isPending) e.currentTarget.style.backgroundColor = '#256B41' }}
                  onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = '#1A5C35')}
                >
                  {isPending ? 'One moment…' : mode === 'magic' ? 'Send magic link' : 'Sign in'}
                </button>
              </form>

              {mode === 'magic' && (
                <p className="text-[11px] text-center mt-3 leading-relaxed" style={{ color: 'rgba(239,232,216,0.35)' }}>
                  First time? The magic link sets up your account — then you can add a password in Settings.
                </p>
              )}

              {/* OAuth */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(239,232,216,0.08)' }} />
                <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(239,232,216,0.3)' }}>or continue with</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(239,232,216,0.08)' }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['google', 'apple', 'github'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleOAuth(p)}
                    disabled={isPending}
                    className="flex items-center justify-center rounded-xl py-2.5 transition-all disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(239,232,216,0.05)', border: '1px solid rgba(239,232,216,0.1)' }}
                    onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = 'rgba(239,232,216,0.1)')}
                    onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = 'rgba(239,232,216,0.05)')}
                    aria-label={`Continue with ${providerName(p)}`}
                  >
                    <ProviderIcon provider={p} />
                  </button>
                ))}
              </div>

              {/* Wallet (EVM + Solana via Reown AppKit) */}
              <div className="mt-2">
                <WalletAuth next={next} />
              </div>
            </div>

            <p className="text-center text-[10px] mt-8 tracking-widest uppercase" style={{ color: 'rgba(239,232,216,0.18)', letterSpacing: '0.16em' }}>
              FlowBond · Regenerative Intelligence
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function providerName(p: Provider) {
  return p === 'google' ? 'Google' : p === 'apple' ? 'Apple' : 'GitHub'
}

function ProviderIcon({ provider }: { provider: Provider }) {
  if (provider === 'google') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.3 12 2.3 6.9 2.3 2.8 6.4 2.8 11.5S6.9 20.7 12 20.7c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z" />
      </svg>
    )
  }
  if (provider === 'apple') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#EFE8D8">
        <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8zM14.2 5.8c.6-.8 1.1-1.9 1-3-1 0-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.9 1.1.1 2.2-.5 2.8-1.3z" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#EFE8D8">
      <path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.8 9.6.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1 .8-.2 1.7-.3 2.5-.3.8 0 1.7.1 2.5.3 1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 3.9-1.3 6.8-5.1 6.8-9.6C22 6.6 17.5 2 12 2z" />
    </svg>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#050E07' }}>
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
