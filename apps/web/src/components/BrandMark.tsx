import { useId } from 'react'

/** The small FlowBond octagon mark used in the nav brand lockup (ported 1:1). */
export function BrandMark() {
  const gid = `gg-${useId().replace(/[:]/g, '')}`
  return (
    <svg className="mark" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <polygon points="50,4 79,17 96,46 92,77 67,95 35,96 9,79 4,48 17,18" stroke={`url(#${gid})`} strokeWidth="3" />
      <polygon points="50,26 68,35 73,55 62,72 42,72 30,56 33,37" stroke={`url(#${gid})`} strokeWidth="2" opacity=".6" />
      <circle cx="50" cy="50" r="6" fill="#f0c66b" />
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c084fc" />
          <stop offset="1" stopColor="#f0c66b" />
        </linearGradient>
      </defs>
    </svg>
  )
}
