import { useId } from 'react'

/**
 * OctagonSeal — the generative FlowBond seal, ported 1:1 from the prototype's
 * `seal()` builder. Single source of truth for the mark used in the hero, the
 * final CTA, the founder portrait, and the deck cover.
 *
 * Four concentric octagons counter-rotate around a glowing gold core. Rotation
 * is pure CSS (`fb-spinA`/`fb-spinB` keyframes live in tokens.css), so the
 * global `prefers-reduced-motion` rule freezes it with no JS branch needed.
 *
 * Renderable on the server — `useId` namespaces the gradient ids so multiple
 * seals on one page never collide.
 */

const C = 200

function octagonPath(radius: number): string {
  let d = ''
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4
    d += (i ? 'L' : 'M') + (C + Math.cos(a) * radius).toFixed(1) + ' ' + (C + Math.sin(a) * radius).toFixed(1) + ' '
  }
  return d + 'Z'
}

type Ring = { r: number; stroke: string; width: number; opacity: number; dir: 'A' | 'B'; dur: number }

const RINGS: Ring[] = [
  { r: 185, stroke: 'url(#SEAL_S1)', width: 1.5, opacity: 0.9, dir: 'A', dur: 120 },
  { r: 150, stroke: 'rgba(192,132,252,.5)', width: 1, opacity: 0.7, dir: 'B', dur: 90 },
  { r: 110, stroke: 'rgba(240,198,107,.6)', width: 1.5, opacity: 0.8, dir: 'A', dur: 70 },
  { r: 70, stroke: 'rgba(110,240,184,.6)', width: 1, opacity: 0.7, dir: 'B', dur: 55 },
]

export function OctagonSeal({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const uid = useId().replace(/[:]/g, '')
  const s1 = `s1-${uid}`
  const s2 = `s2-${uid}`
  return (
    <svg viewBox="0 0 400 400" className={className} style={{ width: '100%', height: '100%', overflow: 'visible', ...style }} aria-hidden="true">
      <defs>
        <linearGradient id={s1} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c084fc" />
          <stop offset=".5" stopColor="#f0c66b" />
          <stop offset="1" stopColor="#6ef0b8" />
        </linearGradient>
        <radialGradient id={s2}>
          <stop offset="0" stopColor="#f0c66b" stopOpacity=".5" />
          <stop offset="1" stopColor="#f0c66b" stopOpacity="0" />
        </radialGradient>
      </defs>
      {RINGS.map((ring, i) => (
        <path
          key={i}
          d={octagonPath(ring.r)}
          fill="none"
          stroke={ring.stroke === 'url(#SEAL_S1)' ? `url(#${s1})` : ring.stroke}
          strokeWidth={ring.width}
          opacity={ring.opacity}
          style={{ transformOrigin: '200px 200px', animation: `fb-spin${ring.dir} ${ring.dur}s linear infinite` }}
        />
      ))}
      <circle cx={C} cy={C} r={28} fill={`url(#${s2})`} />
      <circle cx={C} cy={C} r={5} fill="#ffd98a" />
    </svg>
  )
}
