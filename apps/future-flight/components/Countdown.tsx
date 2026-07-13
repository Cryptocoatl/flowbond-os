'use client'

import { useEffect, useState } from 'react'

interface Parts {
  d: number
  h: number
  m: number
  s: number
}

function partsUntil(targetMs: number): Parts {
  const diff = Math.max(0, targetMs - Date.now())
  return {
    d: Math.floor(diff / 864e5),
    h: Math.floor((diff % 864e5) / 36e5),
    m: Math.floor((diff % 36e5) / 6e4),
    s: Math.floor((diff % 6e4) / 1e3),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Live countdown to the edition departure. Renders "—" until mounted to avoid
 *  hydration mismatch (server has no clock tick). */
export function Countdown({ departISO }: { departISO: string }) {
  const target = new Date(departISO).getTime()
  const [parts, setParts] = useState<Parts | null>(null)

  useEffect(() => {
    setParts(partsUntil(target))
    const id = setInterval(() => setParts(partsUntil(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  const cells: { value: string; label: string }[] = [
    { value: parts ? String(parts.d) : '—', label: 'Days' },
    { value: parts ? pad(parts.h) : '—', label: 'Hours' },
    { value: parts ? pad(parts.m) : '—', label: 'Minutes' },
    { value: parts ? pad(parts.s) : '—', label: 'Seconds' },
  ]

  return (
    <div className="countdown" aria-label="Countdown to departure">
      {cells.map((c) => (
        <div className="cd" key={c.label}>
          <b>{c.value}</b>
          <span>{c.label}</span>
        </div>
      ))}
    </div>
  )
}
