'use client'

import { useEffect, useState } from 'react'
import { Monogram } from './brand/Marks'

const LINKS = [
  { href: '#experience', label: 'Experience' },
  { href: '#artists', label: 'Artists' },
  { href: '#tickets', label: 'Tickets' },
  { href: '#sponsors', label: 'Sponsors' },
  { href: '#passport', label: 'Passport' },
]

export function Nav({ brandName = 'FUTURE FLIGHT' }: { brandName?: string }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
      <div className="wrap nav-in">
        <div className="brand">
          <Monogram />
          <span className="name">{brandName}</span>
        </div>
        <div className="nav-links">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
          <a className="btn btn-solid" href="#apply">
            Secure your seat
          </a>
        </div>
      </div>
    </nav>
  )
}
