'use client'

import React, { useState } from 'react'

/**
 * AccountClosure — the one place a person can leave FlowBond cleanly, from any app.
 *
 * Two always-visible actions: a clear **Log out**, and a quiet **Close my account**
 * that opens an irreversible erase flow with THREE deliberate gates (plus a typed
 * confirmation) so nobody nukes their identity by accident:
 *
 *   Gate 1 — the friendly off-ramp: "got another account? merge them instead."
 *   Gate 2 — the honest warning: shows exactly how much is about to vanish, forever.
 *   Gate 3 — type your handle (or FB id) to confirm → "Delete my FBID".
 *
 * Presentational + self-contained: pass any Supabase client (its session decides whose
 * account this is — the RPC resolves the caller server-side and can never touch anyone
 * else). On erase it deletes everything the FBID owns across every world, leaves only a
 * no-PII tombstone, kills every login, then signs out.
 *
 * Drop it into any app's account/settings screen:
 *   <AccountClosure supabase={supabase} mergeHref="#connected-accounts"
 *     onLoggedOut={() => router.refresh()} onErased={() => router.replace('/goodbye')} />
 */

// Minimal shape we need — avoids a hard dep on @supabase/supabase-js in the UI package.
type ClosureClient = {
  // PromiseLike (not Promise) so a Supabase PostgrestFilterBuilder is assignable —
  // it's a thenable, which is all we need since we only ever await it.
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>
  auth: { signOut: () => PromiseLike<unknown> }
}

type Preview = {
  fbid: string
  handle: string | null
  confirm_phrase: string
  login_count: number
  total_rows: number
  by_column: Record<string, number>
}

type Gate = 'idle' | 'merge' | 'sure' | 'confirm' | 'erasing' | 'done'

export function AccountClosure({
  supabase,
  mergeHref = 'https://fbid.flowbond.life',
  onLinkAccounts,
  onLoggedOut,
  onErased,
  className = '',
}: {
  supabase: ClosureClient
  /** Where "Link my accounts" sends the user (the merge/connected-accounts surface). */
  mergeHref?: string
  /** Optional override for the merge button — if set, runs instead of following mergeHref. */
  onLinkAccounts?: () => void
  /** Called after a successful sign out (e.g. router.refresh()). */
  onLoggedOut?: () => void
  /** Called after the account is erased + signed out (e.g. redirect to a goodbye page). */
  onErased?: (result: { rows_erased: number; logins_closed: number }) => void
  className?: string
}) {
  const [gate, setGate] = useState<Gate>('idle')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')

  const worlds = preview ? new Set(Object.keys(preview.by_column).map((k) => k.split('.')[0].split('_')[0])).size : 0
  const phrase = preview?.confirm_phrase ?? ''
  const typedOk = typed.trim().toLowerCase().replace(/^@/, '') === phrase

  async function logout() {
    setBusy(true)
    try {
      await supabase.auth.signOut()
      onLoggedOut?.()
    } finally {
      setBusy(false)
    }
  }

  async function openErase() {
    setError('')
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('erase_my_fbid', { p_confirm: null, p_execute: false })
      if (error) throw new Error(error.message)
      setPreview(data as Preview)
      setGate('merge')
    } catch (e) {
      setError(friendly((e as Error)?.message))
    } finally {
      setBusy(false)
    }
  }

  function linkAccounts() {
    if (onLinkAccounts) return onLinkAccounts()
    if (typeof window !== 'undefined') window.location.href = mergeHref
  }

  async function eraseForever() {
    setError('')
    setBusy(true)
    setGate('erasing')
    try {
      const { data, error } = await supabase.rpc('erase_my_fbid', { p_confirm: typed.trim(), p_execute: true })
      if (error) throw new Error(error.message)
      const res = data as { rows_erased: number; logins_closed: number }
      try { await supabase.auth.signOut() } catch { /* account is already gone; session dies on its own */ }
      setGate('done')
      onErased?.(res)
    } catch (e) {
      setError(friendly((e as Error)?.message))
      setGate('confirm')
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setGate('idle')
    setPreview(null)
    setTyped('')
    setError('')
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <p className="text-zinc-500 text-xs uppercase tracking-wider px-1">Your account</p>

      {/* Always-visible, unmistakable controls */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl divide-y divide-white/[0.06]">
        <button
          onClick={logout}
          disabled={busy}
          className="w-full flex items-center justify-between p-4 hover:bg-white/[0.05] transition rounded-t-2xl text-left disabled:opacity-50"
        >
          <div>
            <p className="text-white text-sm font-semibold">Log out</p>
            <p className="text-zinc-500 text-[11px]">Sign out of this device. Your account stays exactly as it is.</p>
          </div>
          <span className="text-zinc-300 text-lg" aria-hidden>↪</span>
        </button>

        <button
          onClick={openErase}
          disabled={busy}
          className="w-full flex items-center justify-between p-4 hover:bg-red-500/[0.06] transition rounded-b-2xl text-left disabled:opacity-50"
        >
          <div>
            <p className="text-red-300 text-sm font-semibold">Close my account &amp; erase everything</p>
            <p className="text-zinc-500 text-[11px]">Leave the flow for good. This can never be undone.</p>
          </div>
          <span className="text-red-400/70 text-lg" aria-hidden>⌫</span>
        </button>
      </div>

      {error && gate === 'idle' && <p className="text-red-400 text-xs px-1">{error}</p>}

      {/* ── Gate 1: the friendly off-ramp ─────────────────────────────── */}
      {gate === 'merge' && (
        <GateCard tone="violet">
          <p className="text-2xl">🤝</p>
          <h3 className="text-white text-base font-semibold">Wait — got another account?</h3>
          <p className="text-zinc-300 text-[13px] leading-relaxed">
            A lot of people who reach this point just have <em>two</em> accounts and want them to be one.
            If that&apos;s you, don&apos;t delete anything — pull your other account into this one and keep
            all of it.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <button onClick={linkAccounts} className="btn-primary">
              ✨ Link my accounts instead
            </button>
            <button onClick={() => setGate('sure')} className="text-zinc-400 hover:text-red-300 text-[13px] py-1 transition">
              No — I really want to delete my account
            </button>
            <button onClick={reset} className="text-zinc-500 hover:text-white text-xs py-1 transition">
              Never mind, take me back
            </button>
          </div>
        </GateCard>
      )}

      {/* ── Gate 2: the honest warning ────────────────────────────────── */}
      {gate === 'sure' && preview && (
        <GateCard tone="red">
          <p className="text-2xl">🌊</p>
          <h3 className="text-white text-base font-semibold">Are you sure you want to be out of the flow — forever?</h3>
          <p className="text-zinc-300 text-[13px] leading-relaxed">
            Erasing this account wipes <b>everything</b> in it and you will <b>never be able to get it back</b>.
            FlowBond will only remember that an account once existed here — nothing else. It&apos;s gone.
          </p>
          {preview.total_rows > 0 && (
            <p className="text-red-200/90 text-[12px] bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              This erases <b>{preview.total_rows.toLocaleString()}</b> piece{preview.total_rows === 1 ? '' : 's'} of your
              data{worlds > 0 ? <> across <b>{worlds}</b> world{worlds === 1 ? '' : 's'}</> : null}
              {preview.login_count > 0 ? <>, and closes <b>{preview.login_count}</b> login{preview.login_count === 1 ? '' : 's'}</> : null}.
            </p>
          )}
          <div className="flex flex-col gap-2 pt-1">
            <button onClick={() => setGate('confirm')} className="btn-danger">
              Yes — I&apos;m sure, continue
            </button>
            <button onClick={reset} className="text-zinc-400 hover:text-white text-[13px] py-1 transition">
              Take me back — keep my account
            </button>
          </div>
        </GateCard>
      )}

      {/* ── Gate 3: type to confirm ───────────────────────────────────── */}
      {(gate === 'confirm' || gate === 'erasing') && preview && (
        <GateCard tone="red">
          <p className="text-2xl">⌫</p>
          <h3 className="text-white text-base font-semibold">Last step. Type to confirm.</h3>
          <p className="text-zinc-300 text-[13px] leading-relaxed">
            To delete your FBID, type{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[12px]">{phrase}</code>{' '}
            below. There is no undo after this.
          </p>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={gate === 'erasing'}
            placeholder={phrase}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-white/[0.05] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-red-500/60 transition font-mono"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={eraseForever}
              disabled={!typedOk || gate === 'erasing'}
              className="btn-danger disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {gate === 'erasing' ? 'Erasing everything…' : '⌫ Delete my FBID forever'}
            </button>
            <button onClick={reset} disabled={gate === 'erasing'} className="text-zinc-400 hover:text-white text-[13px] py-1 transition disabled:opacity-50">
              Stop — keep my account
            </button>
          </div>
        </GateCard>
      )}

      {/* ── Done ──────────────────────────────────────────────────────── */}
      {gate === 'done' && (
        <GateCard tone="violet">
          <p className="text-2xl">🕊️</p>
          <h3 className="text-white text-base font-semibold">Your account is gone.</h3>
          <p className="text-zinc-300 text-[13px] leading-relaxed">
            Everything has been erased across FlowBond. All that remains is a quiet mark that someone was
            once here. Thank you for the time you spent in the flow. You&apos;re always welcome to begin again.
          </p>
        </GateCard>
      )}

      {/* Scoped helper styles so the component looks right with zero host CSS. */}
      <style>{`
        .btn-primary{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-weight:600;font-size:14px;padding:11px 16px;border-radius:12px;transition:filter .15s}
        .btn-primary:hover{filter:brightness(1.1)}
        .btn-danger{background:#dc2626;color:#fff;font-weight:600;font-size:14px;padding:11px 16px;border-radius:12px;transition:background .15s}
        .btn-danger:hover{background:#ef4444}
      `}</style>
    </div>
  )
}

function GateCard({ tone, children }: { tone: 'violet' | 'red'; children: React.ReactNode }) {
  const ring = tone === 'red' ? 'border-red-500/30 bg-red-500/[0.04]' : 'border-violet-500/30 bg-violet-500/[0.05]'
  return <div className={`rounded-2xl border ${ring} p-5 flex flex-col gap-3 text-center items-center`}>{children}</div>
}

// Turn raw RPC error codes into something a human should read.
function friendly(msg?: string): string {
  const m = (msg || '').toLowerCase()
  if (m.includes('confirm_mismatch')) return "That doesn't match — check the spelling and try again."
  if (m.includes('not_authenticated')) return 'Your session expired. Please sign in again.'
  if (m.includes('has_dependent_identities'))
    return 'This account has linked sub-accounts. Contact support to close it safely.'
  return 'Something went wrong. Nothing was deleted — please try again.'
}
