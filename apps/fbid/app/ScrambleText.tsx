'use client'

import { useEffect, useState } from 'react'

const CHARS = '01#$%&*+=<>/\\ΞΔΣΦΨΩ¦'.split('')

/** Hacker-decode reveal: cycles random glyphs into place, left to right. */
export default function ScrambleText({
  text,
  active,
  className,
}: {
  text: string
  active: boolean
  className?: string
}) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    if (!active) {
      setDisplay('')
      return
    }
    let frame = 0
    const totalFrames = Math.max(text.length * 2, 6)
    const id = setInterval(() => {
      frame++
      const revealCount = Math.floor((frame / totalFrames) * text.length)
      let out = ''
      for (let i = 0; i < text.length; i++) {
        out += text[i] === ' ' || i < revealCount ? text[i] : CHARS[Math.floor(Math.random() * CHARS.length)]
      }
      setDisplay(out)
      if (revealCount >= text.length) {
        setDisplay(text)
        clearInterval(id)
      }
    }, 28)
    return () => clearInterval(id)
  }, [active, text])

  return <span className={className}>{display}</span>
}
