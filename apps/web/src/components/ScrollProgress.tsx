'use client'

import { useEffect, useRef } from 'react'

/** A thin scroll-progress meridian pinned to the top of the page — a gold→jade
 *  filament that fills as you descend the scroll. Pure transform on rAF, so it
 *  never thrashes layout. Hidden under prefers-reduced-motion (see globals.css). */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = ref.current
        if (!el) return
        const h = document.documentElement
        const max = h.scrollHeight - h.clientHeight
        const p = max > 0 ? h.scrollTop / max : 0
        el.style.transform = `scaleX(${p})`
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return <div className="scroll-meridian" aria-hidden="true" ref={ref} />
}
