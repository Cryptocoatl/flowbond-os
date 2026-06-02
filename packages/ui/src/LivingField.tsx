'use client'

import { useEffect, useRef } from 'react'

/**
 * LivingField — the vanilla-canvas flow-field background, ported 1:1 from the
 * prototype script. Particles ride a layered sine flow-field, react to the
 * pointer, and additively blend into living violet/gold/jade filaments.
 *
 * Production hardening over the prototype:
 *  - honors `prefers-reduced-motion` → paints the static speckle fallback, no rAF loop
 *  - particle count capped by viewport area (≤220), DPR capped at 2
 *  - pauses the rAF loop when the tab is hidden or the canvas scrolls off-screen
 *  - full listener + observer cleanup on unmount
 */

const PAL: [number, number, number][] = [
  [192, 132, 252],
  [168, 85, 247],
  [240, 198, 107],
  [110, 240, 184],
]

export function LivingField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d', { alpha: false })
    if (!ctx) return

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0,
      H = 0,
      DPR = 1
    type Part = { x: number; y: number; vx: number; vy: number; c: [number, number, number]; life: number; w: number }
    let parts: Part[] = []
    const mouse = { x: -9999, y: -9999, active: false }

    const mkPart = (): Part => {
      const c = PAL[(Math.random() * PAL.length) | 0]
      return { x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, c, life: Math.random() * 200, w: Math.random() * 1.4 + 0.4 }
    }

    function size() {
      DPR = Math.min(devicePixelRatio || 1, 2)
      W = innerWidth
      H = innerHeight
      cv!.width = W * DPR
      cv!.height = H * DPR
      cv!.style.width = W + 'px'
      cv!.style.height = H + 'px'
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0)
      const target = Math.round(Math.min(220, (W * H) / 9000))
      parts = Array.from({ length: target }, mkPart)
      ctx!.fillStyle = '#070410'
      ctx!.fillRect(0, 0, W, H)
    }

    const flow = (x: number, y: number, t: number) => {
      const a =
        Math.sin(x * 0.0016 + t * 0.00022) +
        Math.sin(y * 0.0019 - t * 0.00026) +
        Math.sin((x + y) * 0.0011 + t * 0.00031) +
        Math.sin(Math.hypot(x - W / 2, y - H / 2) * 0.004 - t * 0.0004)
      return a * Math.PI * 0.55
    }

    let raf = 0
    let running = true

    function frame(t: number) {
      if (!running) return
      ctx!.fillStyle = 'rgba(7,4,16,0.075)'
      ctx!.fillRect(0, 0, W, H)
      ctx!.globalCompositeOperation = 'lighter'
      for (const p of parts) {
        const ang = flow(p.x, p.y, t)
        p.vx += Math.cos(ang) * 0.18
        p.vy += Math.sin(ang) * 0.18
        if (mouse.active) {
          const dx = mouse.x - p.x,
            dy = mouse.y - p.y,
            d2 = dx * dx + dy * dy
          if (d2 < 42000) {
            const d = Math.sqrt(d2) + 0.001,
              f = (1 - d / 205) * 1.4
            p.vx += (-dy / d) * f + (dx / d) * f * 0.25
            p.vy += (dx / d) * f + (dy / d) * f * 0.25
          }
        }
        p.vx *= 0.92
        p.vy *= 0.92
        const px = p.x,
          py = p.y
        p.x += p.vx
        p.y += p.vy
        p.life--
        const sp = Math.min(Math.hypot(p.vx, p.vy), 3) / 3
        const [r, g, b] = p.c
        ctx!.strokeStyle = `rgba(${r},${g},${b},${0.05 + sp * 0.28})`
        ctx!.lineWidth = p.w
        ctx!.beginPath()
        ctx!.moveTo(px, py)
        ctx!.lineTo(p.x, p.y)
        ctx!.stroke()
        if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20 || p.life < 0) {
          Object.assign(p, mkPart())
          p.life = Math.random() * 200
        }
      }
      ctx!.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(frame)
    }

    function staticFallback() {
      ctx!.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 1400; i++) {
        const c = PAL[(Math.random() * 4) | 0]
        ctx!.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.18)`
        ctx!.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4)
      }
    }

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.active = true
    }
    const onOut = () => {
      mouse.active = false
    }

    size()
    addEventListener('resize', size)
    if (reduce) {
      staticFallback()
    } else {
      raf = requestAnimationFrame(frame)
      addEventListener('mousemove', onMove)
      addEventListener('mouseout', onOut)
    }

    // Pause when tab hidden or canvas scrolls off-screen.
    let onScreen = true
    const resume = () => {
      if (reduce || running || !onScreen || document.hidden) return
      running = true
      raf = requestAnimationFrame(frame)
    }
    const pause = () => {
      running = false
      cancelAnimationFrame(raf)
    }
    const onVisibility = () => (document.hidden ? pause() : resume())
    document.addEventListener('visibilitychange', onVisibility)
    const io = new IntersectionObserver(
      (es) => {
        onScreen = es[0]?.isIntersecting ?? true
        onScreen ? resume() : pause()
      },
      { threshold: 0 },
    )
    io.observe(cv)

    return () => {
      pause()
      removeEventListener('resize', size)
      removeEventListener('mousemove', onMove)
      removeEventListener('mouseout', onOut)
      document.removeEventListener('visibilitychange', onVisibility)
      io.disconnect()
    }
  }, [])

  return <canvas ref={ref} className={className} style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'block' }} aria-hidden="true" />
}
