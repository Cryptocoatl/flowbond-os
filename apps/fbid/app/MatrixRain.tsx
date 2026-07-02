'use client'

import { useEffect, useRef } from 'react'

// FlowBond's own glyph-rain — violet/emerald duotone (not literal green) to stay
// on-brand while still reading as "digital code falling through a portal."
const GLYPHS = 'アイウエオカキクケコサシスセソタチツテト0123456789∆◇○□FLOWBOND'.split('')

export default function MatrixRain({ size, reduceMotion }: { size: number; reduceMotion: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (reduceMotion) return
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const fontSize = 14
    const columns = Math.floor(size / fontSize)
    const drops = new Array(columns).fill(0).map(() => Math.random() * -size)

    let raf = 0
    function draw() {
      ctx!.fillStyle = 'rgba(6, 6, 14, 0.15)'
      ctx!.fillRect(0, 0, size, size)
      ctx!.font = `${fontSize}px monospace`
      for (let i = 0; i < columns; i++) {
        const char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        const hue = i % 2 === 0 ? '167, 139, 250' : '52, 211, 153' // violet-400 / emerald-400
        ctx!.fillStyle = `rgba(${hue}, ${Math.random() * 0.5 + 0.5})`
        ctx!.fillText(char, i * fontSize, drops[i])
        drops[i] += fontSize
        if (drops[i] > size && Math.random() > 0.975) drops[i] = Math.random() * -size
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size, reduceMotion])

  if (reduceMotion) return null

  return (
    <canvas
      ref={ref}
      style={{
        width: size,
        height: size,
        maskImage: 'radial-gradient(circle, black 52%, transparent 76%)',
        WebkitMaskImage: 'radial-gradient(circle, black 52%, transparent 76%)',
      }}
      className="absolute inset-0 rounded-full pointer-events-none opacity-70"
      aria-hidden
    />
  )
}
