'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

const SESSION_KEY = 'ff_intro_seen'

/**
 * Cinematic brand intro. Plays the gold logo-reveal film full-screen on first
 * load, then dissolves into the hero. Skippable, shown once per session, and
 * fully bypassed under prefers-reduced-motion (the hero shows immediately).
 *
 * Source film: public/brand/hero.webm + hero.mp4 (poster hero-poster.jpg).
 */
export function IntroReveal() {
  const reduce = useReducedMotion()
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Decide on mount (client only) whether to play — avoids SSR flash.
  useEffect(() => {
    setMounted(true)
    if (reduce) return
    let seen = false
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === '1'
    } catch {
      /* private mode — just play */
    }
    if (!seen) setShow(true)
  }, [reduce])

  // Lock scroll while the intro is on screen.
  useEffect(() => {
    if (!show) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [show])

  const dismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      /* ignore */
    }
    setShow(false)
  }

  if (!mounted) return null

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="intro"
          role="dialog"
          aria-label="Future Flight intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <video
            ref={videoRef}
            className="intro-video"
            autoPlay
            muted
            playsInline
            poster="/brand/hero-poster.jpg"
            onEnded={dismiss}
            onError={dismiss}
          >
            <source src="/brand/hero.webm" type="video/webm" />
            <source src="/brand/hero.mp4" type="video/mp4" />
          </video>

          <div className="intro-vignette" aria-hidden="true" />

          <motion.button
            type="button"
            className="intro-skip"
            onClick={dismiss}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            Skip intro →
          </motion.button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
