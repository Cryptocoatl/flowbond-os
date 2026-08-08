import { useState } from 'react'
import { useEffect } from 'react'
import { ROLE_LABELS, type Role } from './session'

type Grant = Exclude<Role, 'owner'>

/**
 * Minting keys for her crew.
 *
 * She picks a permission, gets one link, and pastes it wherever her people
 * already are. No email collection, no waiting on anyone to accept anything —
 * the link *is* the invitation, and the vault greets them with her name when
 * they open it.
 */
export default function InviteKeys({ from, ownerKey }: { from: string; ownerKey?: string }) {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<Grant>('commenter')
  const [copied, setCopied] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [minting, setMinting] = useState(false)

  // Keys are signed by the Worker so they cannot be hand-rolled. Minting on
  // role change keeps the visible link honest about what it grants.
  useEffect(() => {
    let live = true
    setMinting(true)
    setToken(null)
    fetch('/api/key', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: from, key: ownerKey, role }),
    })
      .then((r) => r.json() as Promise<{ ok: boolean; token?: string }>)
      .then((d) => live && setToken(d.ok && d.token ? d.token : null))
      .catch(() => live && setToken(null))
      .finally(() => live && setMinting(false))
    return () => {
      live = false
    }
  }, [role, from, ownerKey])

  const link = token ? `${window.location.origin}${window.location.pathname}?k=${token}` : ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const el = document.createElement('textarea')
      el.value = link
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      el.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2600)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="t-tag fixed bottom-16 right-4 z-50 px-4 py-2.5 transition-opacity hover:opacity-90 md:bottom-5 md:right-5"
        style={{ background: 'var(--gold)', color: 'var(--ink)' }}
      >
        ⚷ Share the key
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-16 right-4 z-50 p-5 md:bottom-5 md:right-5"
      style={{
        width: 'min(23rem, calc(100vw - 2rem))',
        background: 'var(--ink)',
        border: '1px solid var(--hair)',
        boxShadow: '0 24px 70px rgb(0 0 0 / 0.6)',
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="t-tag" style={{ color: 'var(--gold)' }}>
          Give someone the key
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="t-mono text-white/60 transition-colors hover:text-white"
        >
          Close
        </button>
      </div>

      <p className="t-body mb-4" style={{ fontSize: '0.9rem' }}>
        Choose what they can do, then send them the link. The vault will tell them you sent it.
      </p>

      <div className="mb-4 space-y-1.5">
        {(Object.keys(ROLE_LABELS) as Grant[]).map((r) => {
          const active = role === r
          return (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRole(r)
                setCopied(false)
              }}
              className="block w-full px-3.5 py-2.5 text-left transition-colors"
              style={{
                background: active ? 'var(--gold)' : 'transparent',
                color: active ? 'var(--ink)' : 'var(--paper)',
                border: `1px solid ${active ? 'var(--gold)' : 'var(--hair)'}`,
              }}
            >
              <span className="t-tag block">{ROLE_LABELS[r].label}</span>
              <span
                className="block text-[0.8rem] leading-snug"
                style={{ color: active ? 'rgb(0 0 0 / 0.72)' : 'rgb(255 255 255 / 0.6)' }}
              >
                {ROLE_LABELS[r].detail}
              </span>
            </button>
          )
        })}
      </div>

      <p
        className="mb-3 select-all break-all p-2.5 font-mono text-[0.68rem] leading-relaxed text-white/65"
        style={{ background: 'rgb(0 0 0 / 0.4)', border: '1px solid var(--hair)' }}
      >
        {link || (minting ? 'cutting a signed key…' : 'key service unavailable — try again')}
      </p>

      <button
        type="button"
        onClick={copy}
        disabled={!link}
        className="t-tag w-full px-4 py-3 transition-opacity hover:opacity-90 disabled:opacity-45"
        style={{ background: copied ? 'var(--aqua)' : 'var(--gold)', color: 'var(--ink)' }}
      >
        {minting
          ? 'Cutting the key…'
          : copied
            ? '✓ Copied — paste it to your crew'
            : 'Copy the link'}
      </button>

      <p className="t-mono mt-3 leading-relaxed text-white/45">
        Anyone with the link can open it at this permission.
      </p>
    </div>
  )
}
