'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { avatarGradient, handoffHref } from '@/lib/identity-visuals'
import MatrixRain from './MatrixRain'
import ScrambleText from './ScrambleText'

type Tier = 'sso' | 'external' | 'soon'

interface World {
  slug: string
  label: string
  desc: string
  logo: string
  tier: Tier
  /** sso tier: the app's own /auth/callback, resolved via the hub handoff. */
  callback?: string
  /** external tier: a plain outbound link (app isn't FBID-federated yet). */
  href?: string
}

// The 11 requested products + DANZ (disabled). sso = real one-click SSO handoff
// (already allowlisted server-side, see packages/auth/redirect-allowlist.ts and
// app/auth/callback/route.ts APP_CALLBACKS). external = the app's own login,
// not yet wired into the hub — a real follow-up per app, not a placeholder.
const WORLDS: World[] = [
  { slug: 'astroflow', label: 'AstroFlow', desc: 'Your cosmic map', logo: '/logos/astroflow.svg', tier: 'sso', callback: 'https://astro.flowbond.life/auth/callback' },
  { slug: 'flowgarden', label: 'FlowGarden', desc: 'Garden intelligence', logo: '/logos/flowgarden.svg', tier: 'sso', callback: 'https://flowgarden.life/auth/callback' },
  { slug: 'flowme', label: 'FlowMe', desc: 'Your living profile', logo: '/logos/flowme.svg', tier: 'sso', callback: 'https://flowme.one/auth/callback' },
  { slug: 'origo', label: 'Origo', desc: 'Proof-of-human registry', logo: '/logos/origo.svg', tier: 'external', href: 'https://origo.flowme.one' },
  { slug: 'claudia', label: 'ClaudIA', desc: 'Your zero-knowledge guardian', logo: '/logos/claudia.png', tier: 'sso', callback: 'https://claudiaflow.life/auth/callback' },
  { slug: 'flowdesk', label: 'FlowDesk', desc: 'Command center for every world', logo: '/logos/flowdesk.svg', tier: 'external', href: 'https://flowdesk.flowbond.life' },
  { slug: 'flowchords', label: 'FlowChords', desc: 'Chord detection, in your browser', logo: '/logos/flowchords.svg', tier: 'external', href: 'https://chords.flowme.one' },
  { slug: 'flow3', label: 'FlowStudio', desc: 'The creation engine', logo: '/logos/flowstudio.svg', tier: 'sso', callback: 'https://studio.flowme.one/auth/callback' },
  { slug: 'raiz', label: 'Raiz', desc: 'Language, translated', logo: '/logos/raiz.svg', tier: 'external', href: 'https://translate.flowme.one' },
  { slug: 'mountaindogs', label: 'MountainDogs', desc: 'Paseadores, on call', logo: '/logos/mountaindogs.svg', tier: 'external', href: 'https://mountaindogs.app' },
  { slug: 'reciprociudad', label: 'ReciproCiudad', desc: 'The reciprocity network', logo: '/logos/reciprociudad.png', tier: 'sso', callback: 'https://reciprociudad.lat/auth/callback' },
  { slug: 'danz', label: 'DANZ.NOW', desc: 'Coming back soon', logo: '/logos/danz.png', tier: 'soon' },
]

const RING_SIZE = 420
const RING_DURATION = 140 // seconds for one full ambient rotation

interface Origin {
  rect: DOMRect
  world: World
}

export default function AppLauncher({ identitySeed }: { identitySeed: string }) {
  const [origin, setOrigin] = useState<Origin | null>(null)
  const reduceMotion = !!useReducedMotion()

  useEffect(() => {
    if (!origin) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOrigin(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [origin])

  function open(world: World, el: HTMLElement) {
    setOrigin({ world, rect: el.getBoundingClientRect() })
  }

  return (
    <div className="space-y-3">
      <p className="text-[var(--fb-muted)] text-xs uppercase tracking-wider px-1">Enter your worlds</p>

      {/* Desktop/tablet: the circular game-engine launcher. */}
      <div className="hidden sm:flex justify-center py-4">
        <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <MatrixRain size={RING_SIZE} reduceMotion={reduceMotion} />

          {/* Concentric time-portal rings around the FBID mark. */}
          <PortalRings reduceMotion={reduceMotion} />

          {/* Center: the FBID mark, the sun the worlds orbit. */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-2xl ring-1 ring-white/10 shadow-[0_0_40px_rgba(139,92,246,0.35)]"
            style={{ background: avatarGradient(identitySeed) }}
            aria-hidden
          />

          <motion.div
            className="absolute inset-0"
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={reduceMotion ? undefined : { duration: RING_DURATION, repeat: Infinity, ease: 'linear' }}
          >
            {WORLDS.map((w, i) => {
              const angle = (360 / WORLDS.length) * i
              return (
                <div
                  key={w.slug}
                  className="absolute top-1/2 left-1/2 w-16 h-16"
                  style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translate(178px) rotate(${-angle}deg)` }}
                >
                  <motion.div
                    animate={reduceMotion ? undefined : { rotate: -360 }}
                    transition={reduceMotion ? undefined : { duration: RING_DURATION, repeat: Infinity, ease: 'linear' }}
                  >
                    <WorldNode world={w} index={i} onOpen={open} reduceMotion={reduceMotion} />
                  </motion.div>
                </div>
              )
            })}
          </motion.div>
        </div>
      </div>

      {/* Mobile: the same nodes as a grid — a ring of 12 doesn't read on a small screen. */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {WORLDS.map((w, i) => (
          <WorldNode key={w.slug} world={w} index={i} onOpen={open} reduceMotion={reduceMotion} asCard />
        ))}
      </div>

      <AnimatePresence>
        {origin && <Portal origin={origin} onClose={() => setOrigin(null)} reduceMotion={reduceMotion} />}
      </AnimatePresence>
    </div>
  )
}

function PortalRings({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <>
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-dashed border-violet-400/25"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={reduceMotion ? undefined : { duration: 46, repeat: Infinity, ease: 'linear' }}
        aria-hidden
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full border border-dashed border-emerald-400/15"
        animate={reduceMotion ? undefined : { rotate: -360 }}
        transition={reduceMotion ? undefined : { duration: 72, repeat: Infinity, ease: 'linear' }}
        aria-hidden
      />
      {!reduceMotion && (
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-2xl"
          style={{ boxShadow: '0 0 0 0 rgba(139,92,246,0.5)' }}
          animate={{ boxShadow: ['0 0 0 0 rgba(139,92,246,0.35)', '0 0 0 22px rgba(139,92,246,0)'] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
          aria-hidden
        />
      )}
    </>
  )
}

function WorldNode({
  world,
  index,
  onOpen,
  reduceMotion,
  asCard = false,
}: {
  world: World
  index: number
  onOpen: (world: World, el: HTMLElement) => void
  reduceMotion: boolean
  asCard?: boolean
}) {
  const disabled = world.tier === 'soon'
  const [hovered, setHovered] = useState(false)

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (disabled) return
    onOpen(world, e.currentTarget)
  }

  const logo = (
    <img
      src={world.logo}
      alt=""
      className={`object-contain ${asCard ? 'w-10 h-10' : 'w-9 h-9'} ${disabled ? 'grayscale opacity-40' : ''}`}
      draggable={false}
    />
  )

  if (asCard) {
    return (
      <button
        type="button"
        aria-disabled={disabled}
        onClick={handleClick}
        aria-label={disabled ? `${world.label} — coming back soon` : `Open ${world.label}`}
        className={`group flex items-center gap-3 text-left bg-white/[0.03] border border-white/10 rounded-2xl p-3 transition ${
          disabled ? 'opacity-50 cursor-default' : 'hover:bg-white/[0.06] hover:border-violet-500/40'
        }`}
      >
        {logo}
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">{world.label}</p>
          <p className="text-[var(--fb-muted)] text-[11px] truncate">{disabled ? 'Coming back soon' : world.desc}</p>
        </div>
      </button>
    )
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg bg-black/90 border border-violet-500/30 shadow-lg pointer-events-none z-10"
          >
            <ScrambleText
              text={disabled ? `${world.label} · soon` : world.label}
              active={hovered}
              className={`text-[11px] font-mono tracking-wide ${disabled ? 'text-zinc-500' : 'text-violet-200'}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        aria-disabled={disabled}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={disabled ? `${world.label} — coming back soon` : `Open ${world.label}`}
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduceMotion ? { duration: 0.2 } : { delay: index * 0.06, type: 'spring', stiffness: 220, damping: 18 }}
        whileHover={disabled ? undefined : { scale: 1.14 }}
        className={`w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center backdrop-blur-sm transition-colors ${
          disabled ? 'opacity-40 cursor-default' : 'hover:bg-white/[0.09] hover:border-violet-500/50 shadow-lg'
        }`}
      >
        {logo}
      </motion.button>
    </div>
  )
}

function Portal({
  origin,
  onClose,
  reduceMotion,
}: {
  origin: Origin
  onClose: () => void
  reduceMotion: boolean
}) {
  const { world, rect } = origin
  const confirmRef = useRef<HTMLAnchorElement>(null)

  // Computed once, client-side only (window is available — this only ever
  // mounts in response to a click) — makes the modal erupt from the exact
  // node the person touched instead of just fading in centered.
  const [fly] = useState(() => {
    if (reduceMotion || typeof window === 'undefined') return null
    const modalWidth = 384
    const originCx = rect.left + rect.width / 2
    const originCy = rect.top + rect.height / 2
    const dx = originCx - window.innerWidth / 2
    const dy = originCy - window.innerHeight / 2
    const scale = Math.max(rect.width / modalWidth, 0.1)
    return { dx, dy, scale, originCx, originCy }
  })

  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  const href = world.tier === 'sso' ? handoffHref(world.slug, world.callback!) : world.href!
  const cta = world.tier === 'sso' ? `Enter ${world.label} →` : `Open ${world.label} ↗`

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Enter ${world.label}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Shockwave — a ring of light expanding from the touched node. */}
      {fly && (
        <motion.div
          className="fixed rounded-full border-2 border-violet-400/60 pointer-events-none"
          style={{ left: fly.originCx, top: fly.originCy, width: 8, height: 8 }}
          initial={{ x: '-50%', y: '-50%', scale: 1, opacity: 0.7 }}
          animate={{ scale: 60, opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          aria-hidden
        />
      )}

      <motion.div
        className="relative w-full max-w-sm bg-[#0c0c14] border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-4 text-center shadow-2xl overflow-hidden"
        initial={fly ? { opacity: 0, x: fly.dx, y: fly.dy, scale: fly.scale } : { opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        exit={fly ? { opacity: 0, x: fly.dx, y: fly.dy, scale: fly.scale } : { opacity: 0, scale: 0.9, y: 8 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 opacity-40">
          <MatrixRain size={384} reduceMotion={reduceMotion} />
        </div>
        <div
          className="absolute -top-px left-1/2 -translate-x-1/2 w-40 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"
          aria-hidden
        />
        <div className="relative w-28 h-28 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-[0_0_60px_rgba(139,92,246,0.25)]">
          <img src={world.logo} alt="" className="w-20 h-20 object-contain" />
        </div>
        <div className="relative space-y-1">
          <h2 className="text-white text-lg font-bold font-mono">
            <ScrambleText text={world.label} active className="inline-block min-h-[1.4em]" />
          </h2>
          <p className="text-[var(--fb-muted)] text-sm">{world.desc}</p>
        </div>
        <a
          ref={confirmRef}
          href={href}
          className="relative w-full px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-semibold transition-all"
        >
          {cta}
        </a>
        <button
          type="button"
          onClick={onClose}
          className="relative text-[var(--fb-muted)] hover:text-white text-xs transition"
        >
          Not now
        </button>
      </motion.div>
    </motion.div>
  )
}
