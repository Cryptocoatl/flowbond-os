'use client'

import { useEffect, useRef, useState } from 'react'
import { BrandMark } from './BrandMark'
import { NAV } from '@/content/site'

/** Sticky nav with scroll-state + mobile burger menu (ported from the prototype).
 *  Links are real routes now, so it works identically on every page. */
export function Nav() {
  const navRef = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => navRef.current?.classList.toggle('scrolled', scrollY > 40)
    addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav id="nav" ref={navRef}>
      <a href="/" className="brand" data-mag>
        <BrandMark />
        <span>
          <b>FLOW</b>BOND
        </span>
      </a>
      <button
        className={`burger${open ? ' open' : ''}`}
        aria-label="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div className={`navlinks${open ? ' open' : ''}`} id="navlinks">
        {NAV.links.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        <a href={NAV.cta.href} className="nav-cta" data-mag onClick={() => setOpen(false)}>
          {NAV.cta.label}
        </a>
      </div>
    </nav>
  )
}
