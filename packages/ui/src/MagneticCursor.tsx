'use client'

import { useEffect, useRef } from 'react'

/**
 * MagneticCursor — the custom gold cursor dot + trailing violet ring, plus the
 * magnetic pull on `[data-mag]` elements. Ported 1:1 from the prototype.
 *
 * Gated behind `(pointer:fine)`: touch/coarse-pointer devices keep their native
 * cursor and get none of this (the CSS already hides `.cursor`/`.cursor-ring`
 * under `pointer:coarse`, and the magnetic transforms are skipped here). Magnetic
 * translation is also skipped under `prefers-reduced-motion`.
 */
export function MagneticCursor() {
  const curRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!matchMedia('(pointer:fine)').matches) return
    const cur = curRef.current
    const ring = ringRef.current
    if (!cur || !ring) return

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let cx = innerWidth / 2,
      cy = innerHeight / 2,
      rx = cx,
      ry = cy
    let raf = 0

    const onMove = (e: MouseEvent) => {
      cx = e.clientX
      cy = e.clientY
      cur.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`
    }
    addEventListener('mousemove', onMove)

    const loop = () => {
      rx += (cx - rx) * 0.16
      ry += (cy - ry) * 0.16
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`
      raf = requestAnimationFrame(loop)
    }
    loop()

    const interactive = Array.from(document.querySelectorAll<HTMLElement>('a,button,[data-mag],input'))
    const enter = () => {
      ring.style.transform += ' scale(1.7)'
      cur.classList.add('warm')
    }
    const leave = () => cur.classList.remove('warm')
    interactive.forEach((el) => {
      el.addEventListener('mouseenter', enter)
      el.addEventListener('mouseleave', leave)
    })

    const mags = Array.from(document.querySelectorAll<HTMLElement>('[data-mag]'))
    const magMove = (el: HTMLElement) => (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`
    }
    const magLeave = (el: HTMLElement) => () => (el.style.transform = '')
    const magHandlers = new Map<HTMLElement, { move: (e: MouseEvent) => void; leave: () => void }>()
    if (!reduce) {
      mags.forEach((el) => {
        const move = magMove(el)
        const lv = magLeave(el)
        magHandlers.set(el, { move, leave: lv })
        el.addEventListener('mousemove', move)
        el.addEventListener('mouseleave', lv)
      })
    }

    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('mousemove', onMove)
      interactive.forEach((el) => {
        el.removeEventListener('mouseenter', enter)
        el.removeEventListener('mouseleave', leave)
      })
      magHandlers.forEach(({ move, leave: lv }, el) => {
        el.removeEventListener('mousemove', move)
        el.removeEventListener('mouseleave', lv)
      })
    }
  }, [])

  return (
    <>
      <div className="cursor" ref={curRef} aria-hidden="true" />
      <div className="cursor-ring" ref={ringRef} aria-hidden="true" />
    </>
  )
}
