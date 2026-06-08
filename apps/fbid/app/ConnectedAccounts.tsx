'use client'

// Connected Accounts — the user-facing "what's linked to my FBID" panel.
// Lists the permanent connected-accounts ledger, lets you add a verified email
// (link sent to that address — you must control it) and unlink (lockout-protected).
// All security is enforced server-side: this component only calls the hardened RPCs.

import { useEffect, useState } from 'react'
import { getConnectedAccounts, unlinkAccount, type FbidConnectedAccount } from '@flowbond/auth/identity'
import { createClient } from '@/lib/supabase/client'

const TYPE_GLYPH: Record<string, string> = { email: '✉️', wallet: '👛', login: '🔑', external: '🔗', merged_account: '🧬' }

function statusNote(s: string): string {
  switch (s) {
    case 'sent': return 'Check that inbox — we sent a confirmation link (expires in 15 min).'
    case 'already_linked': return 'That email is already linked to your FBID.'
    case 'requires_merge': return 'That email is its own FlowBond account — linking it means merging the two, which isn’t available yet.'
    case 'linked_elsewhere': return 'That email is already linked to a different FBID.'
    case 'rate_limited': return 'Too many requests — try again in a little while.'
    case 'invalid_email': return 'That doesn’t look like a valid email.'
    case 'not_configured': return 'Account linking isn’t fully configured yet — let an admin know.'
    case 'email_unconfigured': return 'Email delivery isn’t configured yet — ask an admin to set RESEND_API_KEY.'
    case 'load_failed': return 'Couldn’t load your connected accounts — reopen this tab to retry.'
    case 'cannot_unlink_primary': return 'You can’t unlink your primary email.'
    case 'cannot_unlink_last_credential': return 'You can’t unlink your last sign-in credential.'
    default: return 'Something went wrong. Try again.'
  }
}

export default function ConnectedAccounts() {
  const [items, setItems] = useState<FbidConnectedAccount[]>([])
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function load() {
    try { setItems(await getConnectedAccounts(createClient())) }
    catch { setNote(statusNote('load_failed')) }
  }
  // Load on mount, and refetch when the tab regains focus — so a link confirmed
  // in another tab appears here without a hard refresh.
  useEffect(() => {
    void load()
    const refetch = () => void load()
    window.addEventListener('focus', refetch)
    return () => window.removeEventListener('focus', refetch)
  }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setNote('')
    try {
      const r = await fetch('/api/accounts/add-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const d = await r.json().catch(() => ({ status: 'error' }))
      setNote(statusNote(d.status))
      if (d.status === 'sent') setEmail('')
    } catch {
      setNote('Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setBusy(true); setNote('')
    try { await unlinkAccount(createClient(), id); await load() }
    catch (err) { setNote(statusNote((err as { message?: string })?.message ?? 'error')) }
    finally { setBusy(false) }
  }

  const active = items.filter((i) => i.status === 'active')
  const history = items.filter((i) => i.status !== 'active')

  return (
    <div className="space-y-3">
      <p className="text-[var(--fb-muted)] text-xs uppercase tracking-wider px-1">Connected accounts</p>
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl divide-y divide-white/[0.06]">
        {active.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-base">{TYPE_GLYPH[a.link_type] ?? '🔗'}</span>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{a.value_ref ?? a.link_type}</p>
                <p className="text-[var(--fb-muted)] text-[11px]">
                  {a.is_primary ? 'Primary · ' : ''}{a.link_type} · linked {new Date(a.linked_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            {a.is_primary ? (
              <span className="text-emerald-400 text-[11px]">Primary</span>
            ) : (
              <button
                onClick={() => remove(a.id)}
                disabled={busy}
                className="text-[var(--fb-muted)] hover:text-red-400 text-xs transition disabled:opacity-50"
              >
                Unlink
              </button>
            )}
          </div>
        ))}

        <form onSubmit={add} className="flex items-center gap-2 p-4">
          <input
            type="email"
            required
            placeholder="Add another email…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            className="flex-1 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {busy ? '…' : 'Add'}
          </button>
        </form>
      </div>

      {note && <p className="text-[var(--fb-muted)] text-[11px] px-1">{note}</p>}

      {history.length > 0 && (
        <details className="px-1">
          <summary className="text-[var(--fb-muted)] text-[11px] cursor-pointer">Unlinked history ({history.length})</summary>
          <div className="mt-2 space-y-1">
            {history.map((h) => (
              <p key={h.id} className="text-zinc-600 text-[11px]">
                {TYPE_GLYPH[h.link_type] ?? '🔗'} {h.value_ref} — unlinked{h.unlinked_at ? ` ${new Date(h.unlinked_at).toLocaleDateString()}` : ''}
              </p>
            ))}
          </div>
        </details>
      )}
      <p className="text-zinc-600 text-[11px] px-1">
        Every link is recorded permanently on your FBID — unlinking keeps the history.
      </p>
    </div>
  )
}
