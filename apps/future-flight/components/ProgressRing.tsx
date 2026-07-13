'use client'

import { motion, useReducedMotion } from 'framer-motion'

const R = 28
const C = 2 * Math.PI * R

/** Circular funding progress ring. Animates the stroke on scroll into view,
 *  matching the reference's `.progress-ring`. Static when reduced-motion. */
export function ProgressRing({ pct }: { pct: number }) {
  const reduce = useReducedMotion()
  const clamped = Math.max(0, Math.min(100, pct))
  const targetOffset = C * (1 - clamped / 100)

  return (
    <svg className="progress-ring" viewBox="0 0 64 64" role="img" aria-label={`${clamped}% funded`}>
      <circle className="bg" cx="32" cy="32" r={R} />
      <motion.circle
        className="fg"
        cx="32"
        cy="32"
        r={R}
        strokeDasharray={C}
        initial={{ strokeDashoffset: reduce ? targetOffset : C }}
        whileInView={{ strokeDashoffset: targetOffset }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: reduce ? 0 : 1.4, ease: [0.22, 1, 0.36, 1] }}
      />
      <text x="32" y="37" textAnchor="middle">
        {clamped}%
      </text>
    </svg>
  )
}
