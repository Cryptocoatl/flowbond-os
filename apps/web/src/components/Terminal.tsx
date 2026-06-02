'use client'

import { useEffect, useRef } from 'react'
import { FLOWME } from '@/content/site'

const LINES = FLOWME.terminal

/** The animated FlowMe OS terminal — typewriter playback ported from the
 *  prototype. Reduced-motion shows the full transcript at once. Starts when the
 *  terminal scrolls into view, then loops. */
export function Terminal() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const term = ref.current
    if (!term) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const timers: ReturnType<typeof setTimeout>[] = []

    function typeTerm() {
      if (reduce) {
        term!.innerHTML = LINES.map((l) => `<div class="${l.c}">${l.t}</div>`).join('')
        return
      }
      let li = 0
      function next() {
        if (li >= LINES.length) {
          timers.push(
            setTimeout(() => {
              term!.innerHTML = ''
              li = 0
              next()
            }, 3600),
          )
          return
        }
        const d = document.createElement('div')
        d.className = LINES[li].c
        term!.appendChild(d)
        const full = LINES[li].t
        let ci = 0
        ;(function ch() {
          if (ci <= full.length) {
            d.innerHTML = full.slice(0, ci) + '<span class="cur-blink"></span>'
            ci++
            timers.push(setTimeout(ch, LINES[li].c === 'm' ? 10 : 18))
          } else {
            d.textContent = full
            li++
            timers.push(setTimeout(next, 260))
          }
        })()
      }
      next()
    }

    const tio = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            typeTerm()
            tio.disconnect()
          }
        }),
      { threshold: 0.3 },
    )
    tio.observe(term)

    return () => {
      tio.disconnect()
      timers.forEach(clearTimeout)
    }
  }, [])

  return <div className="term-body" id="term" ref={ref} aria-hidden="true" />
}
