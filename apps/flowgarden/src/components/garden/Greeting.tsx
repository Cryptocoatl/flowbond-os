'use client'

import { useEffect, useState } from 'react'

// Time-of-day greeting based on the visitor's local time (server time would be UTC).
export function Greeting({ name }: { name?: string | null }) {
  const [greeting, setGreeting] = useState<{ text: string; emoji: string } | null>(null)

  useEffect(() => {
    const h = new Date().getHours()
    const g =
      h < 5 ? { text: 'Still up', emoji: '🌙' }
      : h < 12 ? { text: 'Good morning', emoji: '🌅' }
      : h < 17 ? { text: 'Good afternoon', emoji: '☀️' }
      : h < 21 ? { text: 'Good evening', emoji: '🌇' }
      : { text: 'Good night', emoji: '🌙' }
    setGreeting(g)
  }, [])

  const first = name?.trim().split(/\s+/)[0] ?? null

  // Reserve height to avoid layout shift before hydration.
  if (!greeting) return <p className="text-sm text-fg-muted h-5" aria-hidden />

  return (
    <p className="text-sm font-medium text-fg-secondary">
      {greeting.text}{first ? `, ${first}` : ''} <span className="not-italic">{greeting.emoji}</span>
    </p>
  )
}
