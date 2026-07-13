'use client'

import type { CSSProperties, ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface RevealProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  id?: string
  /** stagger delay in seconds */
  delay?: number
}

/**
 * Scroll-reveal wrapper — the Framer Motion equivalent of the reference's
 * `.rev` IntersectionObserver fade-up. Fully disabled under
 * prefers-reduced-motion (content renders in place, no transform).
 */
export function Reveal({ children, className, style, id, delay = 0 }: RevealProps) {
  const reduce = useReducedMotion()

  if (reduce) {
    return (
      <div className={className} style={style} id={id}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={className}
      style={style}
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}
