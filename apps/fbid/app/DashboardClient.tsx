'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { claimHandle, handleAvailable, type FbidIdentity } from '@flowbond/auth/identity'
import { useT } from '@flowbond/i18n'
import { createClient } from '@/lib/supabase/client'
import ConnectedAccounts from './ConnectedAccounts'

// FBID-integrated apps → seamless SSO via the hub handoff (one-time token, no re-login).
const APPS: { slug: string; label: string; desc: string; callback: string; glyph: string }[] = [
  { slug: 'astroflow', label: 'AstroFlow', desc: 'Your cosmic map', callback: 'https://astro.flowbond.life/auth/callback', glyph: '🪐' },
  { slug: 'flowgarden', label: 'FlowGarden', desc: 'Garden intelligence', callback: 'https://flowgarden.life/auth/callback', glyph: '🌱' },
  { slug: 'danz', label: 'DANZ.NOW', desc: 'Dance & connection', callback: 'https://danz-now.vercel.app/auth/callback', glyph: '💃' },
  { slug: 'flowbond', label: 'FlowBond', desc: 'Your identity home', callback: 'https://flowbond.life/api/auth/callback', glyph: '🔮' },
  { slug: 'flowme', label: 'FlowMe', desc: 'Your living profile', callback: 'https://flowme.one/auth/callback', glyph: '🎭' },
]
// Apps not yet on FBID → plain links (open their own login).
const EXTERNAL: { label: string; desc: string; href: string; glyph: string }[] = [
  { label: 'Xelva', desc: 'Gorillae OG', href: 'https://xelva.live', glyph: '🦍' },
  { label: 'Deck', desc: 'The pitch', href: 'https://deck.flowbond.life', glyph: '📊' },
]

function handoffHref(slug: string, callback: string) {
  return `/api/handoff?app=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(callback)}`
}

// Deterministic gradient avatar seeded by the FBID id — a unique "identity avatar".
function avatarGradient(seed: string) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360
  const h2 = (h + 140) % 360
  return `conic-gradient(from 210deg, hsl(${h} 80% 60%), hsl(${h2} 75% 55%), hsl(${(h + 280) % 360} 80% 60%), hsl(${h} 80% 60%))`
}

export default function DashboardClient({ identity }: { identity: FbidIdentity }) {
  const router = useRouter()
  const t = useT()
  const initial = (identity.display_name || identity.handle || 'F').trim().charAt(0).toUpperCase()
  const shortId = (identity.id || '').slice(0, 8)

  return (
    <div className="w-full max-w-2xl flex flex-col gap-8">
      {/* Identity Avatar header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-1 ring-white/10"
          style={{ background: avatarGradient(identity.id || identity.handle || 'fbid') }}
          aria-hidden
        >
          {initial}
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            {identity.display_name || (identity.handle ? `@${identity.handle}` : 'Your FBID')}
            {identity.is_verified && <span title="Verified" className="text-violet-400 text-base">✦</span>}
          </h1>
          {identity.handle && !identity.handle_is_draft && (
            <p className="text-[var(--fb-muted)] text-sm">@{identity.handle}</p>
          )}
          <p className="text-zinc-600 text-[11px] font-mono">FB-{shortId.toUpperCase()}</p>
        </div>
      </div>

      {identity.handle_is_draft && <ClaimHandle />}

      {/* Narrative — what this is */}
      <div className="text-center space-y-1 px-2">
        <p className="text-white text-sm font-semibold">{t('dash.welcome.title')}</p>
        <p className="text-[var(--fb-muted)] text-[13px] leading-relaxed">{t('dash.welcome.body')}</p>
      </div>

      {/* Create your living profile — the front door to FlowMe */}
      <a
        href="https://flowme.one/new"
        className="group flex items-center gap-4 bg-gradient-to-br from-violet-600/15 to-emerald-500/10 border border-violet-500/30 rounded-2xl p-5 hover:border-violet-400/60 transition"
      >
        <span className="text-3xl">🎭</span>
        <div className="flex-1">
          <p className="text-white text-sm font-semibold">{t('dash.create.title')}</p>
          <p className="text-[var(--fb-muted)] text-[12px] leading-tight">{t('dash.create.desc')}</p>
        </div>
        <span className="text-violet-300 text-sm font-semibold whitespace-nowrap">{t('dash.create.cta')}</span>
      </a>

      {/* App launcher — your brain OS */}
      <div className="space-y-3">
        <p className="text-[var(--fb-muted)] text-xs uppercase tracking-wider px-1">Enter your worlds</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {APPS.map((a) => (
            <a
              key={a.slug}
              href={handoffHref(a.slug, a.callback)}
              className="group bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col gap-1 hover:bg-white/[0.06] hover:border-violet-500/40 transition"
            >
              <span className="text-2xl">{a.glyph}</span>
              <span className="text-white text-sm font-semibold mt-1">{a.label}</span>
              <span className="text-[var(--fb-muted)] text-[11px] leading-tight">{a.desc}</span>
              <span className="text-violet-400 text-[11px] mt-1 opacity-0 group-hover:opacity-100 transition">Enter →</span>
            </a>
          ))}
          {EXTERNAL.map((a) => (
            <a
              key={a.label}
              href={a.href}
              className="group bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-1 hover:bg-white/[0.05] transition"
            >
              <span className="text-2xl">{a.glyph}</span>
              <span className="text-white text-sm font-semibold mt-1">{a.label}</span>
              <span className="text-[var(--fb-muted)] text-[11px] leading-tight">{a.desc}</span>
              <span className="text-zinc-500 text-[11px] mt-1 opacity-0 group-hover:opacity-100 transition">Open ↗</span>
            </a>
          ))}
        </div>
      </div>

      {/* Connected accounts — user-driven linking, permanently recorded on the FBID */}
      <ConnectedAccounts />

      {/* Security — grows little by little (password today, 2FA/passkeys next) */}
      <div className="space-y-3">
        <p className="text-[var(--fb-muted)] text-xs uppercase tracking-wider px-1">Security</p>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl divide-y divide-white/[0.06]">
          <a
            href="/auth/set-password"
            className="flex items-center justify-between p-4 hover:bg-white/[0.04] transition rounded-t-2xl"
          >
            <div>
              <p className="text-white text-sm font-semibold">Password</p>
              <p className="text-[var(--fb-muted)] text-[11px]">
                Set or change the password that works across every FlowBond app.
              </p>
            </div>
            <span className="text-violet-400 text-xs">Manage →</span>
          </a>
          <div className="flex items-center justify-between p-4 rounded-b-2xl">
            <div>
              <p className="text-white text-sm font-semibold">This device</p>
              <p className="text-[var(--fb-muted)] text-[11px]">
                You stay signed in here — sign out below if this device is shared.
              </p>
            </div>
            <span className="text-emerald-400 text-xs">Remembered ✓</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-zinc-600 text-[11px]">One identity, every world. Sovereign by design.</p>
        <button
          onClick={async () => {
            await createClient().auth.signOut()
            router.refresh()
          }}
          className="text-[var(--fb-muted)] hover:text-white text-xs transition"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

function ClaimHandle() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'saving' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const seq = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Debounced + sequence-guarded: one RPC per ~280ms pause, and only the latest
  // keystroke's response is applied (no out-of-order stale "available/taken").
  function check(v: string) {
    setValue(v)
    setMessage('')
    if (timer.current) clearTimeout(timer.current)
    if (!/^[a-z0-9_]{3,30}$/.test(v)) { setStatus('idle'); return }
    setStatus('checking')
    const my = ++seq.current
    timer.current = setTimeout(async () => {
      try {
        const free = await handleAvailable(createClient(), v)
        if (my === seq.current) setStatus(free ? 'ok' : 'taken')
      } catch { if (my === seq.current) setStatus('idle') }
    }, 280)
  }

  async function save() {
    if (status !== 'ok') return
    setStatus('saving')
    try {
      await claimHandle(createClient(), value)
      router.refresh()
    } catch (e) {
      setStatus('error')
      setMessage((e as Error)?.message ?? 'Could not claim that handle.')
    }
  }

  return (
    <div className="bg-violet-500/[0.06] border border-violet-500/20 rounded-2xl p-5 space-y-3">
      <div>
        <p className="text-white text-sm font-semibold">Claim your handle</p>
        <p className="text-[var(--fb-muted)] text-xs">This is your name across every FlowBond world — pick it once.</p>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center bg-white/[0.05] border border-white/10 rounded-xl px-3 focus-within:border-violet-500/60 transition">
          <span className="text-zinc-500 text-sm">@</span>
          <input
            value={value}
            onChange={(e) => check(e.target.value.toLowerCase().trim())}
            placeholder="yourhandle"
            maxLength={30}
            className="flex-1 bg-transparent px-1 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none"
          />
          {status === 'ok' && <span className="text-emerald-400 text-xs">available</span>}
          {status === 'taken' && <span className="text-red-400 text-xs">taken</span>}
          {status === 'checking' && <span className="text-zinc-500 text-xs">…</span>}
        </div>
        <button
          onClick={save}
          disabled={status !== 'ok'}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition disabled:opacity-40"
        >
          {status === 'saving' ? 'Saving…' : 'Claim'}
        </button>
      </div>
      {message && <p className="text-red-400 text-xs">{message}</p>}
      <p className="text-zinc-600 text-[11px]">3–30 chars · lowercase letters, numbers, underscore.</p>
    </div>
  )
}
