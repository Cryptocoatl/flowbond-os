'use client'

import { useEffect } from 'react'

/** Mounts the single IntersectionObserver that reveals `.reveal` elements on
 *  scroll — ported from the prototype. Reduced-motion already shows them via CSS. */
export function ScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.15 },
    )
    document.querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return null
}
