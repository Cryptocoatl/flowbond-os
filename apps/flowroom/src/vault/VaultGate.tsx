import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { OWNER_KEY, OWNER_NAME, readKey, type Role, type Session } from './session'

/** Local check — the vault must not depend on the scroll stack. */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/**
 * The vault.
 *
 * Three rings turning at different speeds around a keyhole. Enter the right
 * name and key and they slow, align, flare gold and swing open into the room.
 * Someone arriving on a minted link is greeted by the person who sent it
 * before being asked for anything.
 *
 * The rings are SVG and the whole thing is one GSAP timeline — no assets.
 */
export default function VaultGate({ onOpen }: { onOpen: (s: Session) => void }) {
  const invite = readKey(new URLSearchParams(window.location.search).get('k'))

  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)

  const ringsRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)

  /* ---- idle rotation ------------------------------------------------ */
  useEffect(() => {
    const host = ringsRef.current
    if (!host || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.to('[data-ring="0"]', {
        rotate: 360,
        duration: 44,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%',
      })
      gsap.to('[data-ring="1"]', {
        rotate: -360,
        duration: 31,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%',
      })
      gsap.to('[data-ring="2"]', {
        rotate: 360,
        duration: 19,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%',
      })
      gsap.to('[data-core]', {
        scale: 1.06,
        opacity: 0.9,
        duration: 2.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%',
      })
    }, host)
    return () => ctx.revert()
  }, [])

  /* ---- unlock -------------------------------------------------------- */
  function unlock(session: Session) {
    setOpening(true)
    if (prefersReducedMotion()) {
      onOpen(session)
      return
    }
    const tl = gsap.timeline({ onComplete: () => onOpen(session) })
    // The rings stop turning, snap into alignment, and the light comes up
    // through the middle. Mechanical, then luminous.
    tl.to(
      '[data-ring]',
      { rotate: 0, duration: 1.05, ease: 'power3.inOut', transformOrigin: '50% 50%' },
      0,
    )
      .to('[data-tick]', { stroke: 'var(--gold-hi)', duration: 0.4 }, 0.55)
      .to(
        '[data-core]',
        { scale: 2.1, opacity: 1, duration: 0.7, ease: 'power2.in', transformOrigin: '50% 50%' },
        0.75,
      )
      .to('[data-flare]', { opacity: 1, scale: 2.6, duration: 0.8, ease: 'power2.out' }, 0.8)
      .to('[data-form]', { opacity: 0, y: 16, duration: 0.4 }, 0.6)
      .to(shellRef.current, { opacity: 0, duration: 0.5, ease: 'power2.in' }, 1.15)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const who = name.trim()
    if (!who) return

    const token = new URLSearchParams(window.location.search).get('k') ?? undefined

    // The Worker verifies the signature on a minted key — the client cannot
    // decide that for itself. If the API is unreachable the vault still opens
    // locally, because a proposal that will not open is worse than one whose
    // notes are held until the network returns.
    try {
      const res = await fetch('/api/open', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: who, key: key.trim(), token }),
      })
      const data = (await res.json()) as {
        ok: boolean
        offline?: boolean
        name?: string
        role?: Role
        from?: string
        reason?: string
      }
      if (data.ok && data.role) {
        unlock({ name: data.name ?? who, role: data.role, from: data.from, token, key: key.trim() })
        return
      }
      if (!data.offline) {
        setError('That key doesn’t turn. Check the name and the four digits.')
        if (!prefersReducedMotion()) {
          gsap.fromTo(
            shellRef.current,
            { x: -9 },
            { x: 0, duration: 0.5, ease: 'elastic.out(1,0.32)' },
          )
        }
        return
      }
    } catch {
      /* fall through to the local check */
    }

    if (invite) {
      unlock({ name: who, role: invite.r as Role, from: invite.f, token })
      return
    }
    if (who.toLowerCase() !== OWNER_NAME || key.trim() !== OWNER_KEY) {
      setError('That key doesn’t turn. Check the name and the four digits.')
      // A short, physical refusal — the vault resisting rather than a red box.
      if (!prefersReducedMotion()) {
        gsap.fromTo(
          shellRef.current,
          { x: -9 },
          { x: 0, duration: 0.5, ease: 'elastic.out(1,0.32)' },
        )
      }
      return
    }
    unlock({ name: 'Vandana', role: 'owner', key: key.trim() })
  }

  const field =
    'w-full border-2 bg-black/40 px-4 py-3.5 text-white placeholder:text-white/30 ' +
    'transition-colors focus:outline-none'

  return (
    <main
      className="fixed inset-0 grid place-items-center overflow-hidden px-5"
      style={{
        background:
          'radial-gradient(110% 90% at 50% 42%, #241243 0%, #140A26 48%, var(--ink) 100%)',
      }}
    >
      <div ref={shellRef} className="relative flex w-full max-w-[26rem] flex-col items-center">
        {/* ---- the vault ---- */}
        <div ref={ringsRef} className="relative mb-9 aspect-square w-[min(62vw,17rem)]">
          <div
            data-flare
            className="pointer-events-none absolute inset-0 scale-100 opacity-0"
            style={{
              background: 'radial-gradient(closest-side, rgb(255 231 166 / 0.5), transparent 70%)',
            }}
          />
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <defs>
              <linearGradient id="vg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--gold-hi)" />
                <stop offset="100%" stopColor="var(--gold)" />
              </linearGradient>
            </defs>

            {[
              { r: 92, n: 48, w: 0.9, o: 0.5 },
              { r: 74, n: 32, w: 1.1, o: 0.7 },
              { r: 56, n: 20, w: 1.4, o: 0.9 },
            ].map((ring, ri) => (
              <g key={ri} data-ring={ri}>
                <circle
                  cx="100"
                  cy="100"
                  r={ring.r}
                  fill="none"
                  stroke="url(#vg)"
                  strokeWidth={ring.w}
                  opacity={ring.o * 0.5}
                />
                {Array.from({ length: ring.n }, (_, i) => {
                  const a = (i / ring.n) * Math.PI * 2
                  const len = i % 4 === 0 ? 7 : 3.4
                  return (
                    <line
                      key={i}
                      data-tick
                      x1={100 + Math.cos(a) * ring.r}
                      y1={100 + Math.sin(a) * ring.r}
                      x2={100 + Math.cos(a) * (ring.r - len)}
                      y2={100 + Math.sin(a) * (ring.r - len)}
                      stroke="var(--gold)"
                      strokeWidth={ring.w}
                      opacity={ring.o}
                    />
                  )
                })}
              </g>
            ))}

            {/* the keyhole */}
            <g data-core>
              <circle cx="100" cy="100" r="17" fill="none" stroke="url(#vg)" strokeWidth="1.6" />
              <circle cx="100" cy="94" r="5.4" fill="var(--gold-hi)" />
              <path d="M96.4 98 L100 116 L103.6 98 Z" fill="var(--gold-hi)" />
            </g>
          </svg>
        </div>

        {/* ---- the ask ---- */}
        <div data-form className={`w-full ${opening ? 'pointer-events-none' : ''}`}>
          {invite ? (
            <>
              <p className="t-tag mb-3 text-center" style={{ color: 'var(--gold)' }}>
                {invite.f} gave you the key
              </p>
              <h1 className="t-display mb-3 text-center text-[clamp(1.9rem,6vw,2.8rem)] text-white">
                Welcome.
              </h1>
              <p className="t-body mb-8 text-center">
                Tell us your name and the vault will open on the 1 Million Women Dance flow.
              </p>
            </>
          ) : (
            <>
              <p className="t-tag mb-3 text-center" style={{ color: 'var(--gold)' }}>
                1 Million Women Dance × FlowBond
              </p>
              <h1 className="t-display mb-3 text-center text-[clamp(1.9rem,6vw,2.8rem)] text-white">
                This vault opens
                <br />
                <span style={{ color: 'var(--gold)' }}>for you.</span>
              </h1>
              <p className="t-body mb-8 text-center">
                Your name, and the four digits you were sent.
              </p>
            </>
          )}

          <form onSubmit={(e) => void submit(e)} className="space-y-3">
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={`${field} text-center`}
              style={{ borderColor: 'var(--hair)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--gold)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--hair)')}
            />

            {!invite && (
              <input
                required
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={key}
                onChange={(e) => setKey(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className={`${field} text-center font-mono text-2xl tracking-[0.55em]`}
                style={{ borderColor: 'var(--hair)' }}
              />
            )}

            {error && (
              <p
                role="alert"
                className="text-center text-[0.88rem]"
                style={{ color: 'var(--rose)' }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="t-tag w-full px-6 py-4 transition-opacity hover:opacity-90"
              style={{ background: 'var(--gold)', color: 'var(--ink)' }}
            >
              {opening ? 'Opening…' : invite ? 'Open the flow' : 'Turn the key'}
            </button>
          </form>

          <p className="t-mono mt-9 text-center text-white/40">
            Private · not indexed · not shared
          </p>
        </div>
      </div>
    </main>
  )
}
