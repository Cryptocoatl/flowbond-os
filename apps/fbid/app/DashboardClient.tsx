'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { claimHandle, handleAvailable, type FbidIdentity } from '@flowbond/auth/identity'
import { useT } from '@flowbond/i18n'
import { createClient } from '@/lib/supabase/client'
import { avatarGradient, handoffHref } from '@/lib/identity-visuals'
import ConnectedAccounts from './ConnectedAccounts'
import AppLauncher from './AppLauncher'

// Not part of the circular launcher (not requested as a "world" tile) but still
// live and working — kept reachable so nothing regresses.
const MORE_LINKS = [
  { label: 'FlowBond', href: handoffHref('flowbond', 'https://flowbond.life/api/auth/callback') },
  { label: 'Xelva', href: 'https://xelva.live' },
  { label: 'Deck', href: 'https://deck.flowbond.life' },
]

export default function DashboardClient({
  identity,
  hasPassword,
}: {
  identity: FbidIdentity
  hasPassword: boolean
}) {
  const router = useRouter()
  const t = useT()
  const initial = (identity.display_name || identity.handle || 'F').trim().charAt(0).toUpperCase()
  const shortId = (identity.id || '').slice(0, 8)
  const seed = identity.id || identity.handle || 'fbid'

  return (
    <div className="w-full max-w-2xl flex flex-col gap-8">
      {/* Identity Avatar header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-1 ring-white/10"
          style={{ background: avatarGradient(seed) }}
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

      {/* Password nudge — the fallback that makes every FBID-wired app a one-click
          login next time, no email round-trip. Disappears once hasPassword flips true. */}
      {!hasPassword && (
        <a
          href="/auth/set-password"
          className="group flex items-center gap-4 bg-gradient-to-br from-emerald-500/15 to-violet-600/10 border border-emerald-500/30 rounded-2xl p-5 hover:border-emerald-400/60 transition"
        >
          <span className="text-3xl">🔑</span>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">Set a password</p>
            <p className="text-[var(--fb-muted)] text-[12px] leading-tight">
              So next time you&apos;re in instantly on any FlowBond app — no email needed.
            </p>
          </div>
          <span className="text-emerald-300 text-sm font-semibold whitespace-nowrap">Set it →</span>
        </a>
      )}

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

      {/* App launcher — the circular game-engine home for every world */}
      <AppLauncher identitySeed={seed} />
      <p className="text-center text-zinc-600 text-[11px] -mt-4">
        Also: <a href={MORE_LINKS[0].href} className="hover:text-zinc-400 transition">FlowBond</a>
        {' · '}
        <a href={MORE_LINKS[1].href} className="hover:text-zinc-400 transition">Xelva</a>
        {' · '}
        <a href={MORE_LINKS[2].href} className="hover:text-zinc-400 transition">Deck</a>
      </p>

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
                {hasPassword
                  ? 'Change the password that works across every FlowBond app.'
                  : 'Set a password that works across every FlowBond app.'}
              </p>
            </div>
            <span className="text-violet-400 text-xs">{hasPassword ? 'Manage →' : 'Set →'}</span>
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
