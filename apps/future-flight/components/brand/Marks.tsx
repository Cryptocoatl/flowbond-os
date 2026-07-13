/* eslint-disable @next/next/no-img-element */
/**
 * Brand marks — the real gold FF monogram, extracted from the brand reveal film
 * (public/brand/monogram.png, transparent). The wordmark "FUTURE FLIGHT" is set
 * in Orbitron throughout, so the monogram is the only raster brand mark needed.
 */

export function Monogram({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/monogram.png"
      alt="Future Flight"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: 'auto', display: 'block' }}
    />
  )
}

/** Large hero crest — the monogram with the portal glow behind it. */
export function HeroCrest() {
  return (
    <img
      src="/brand/monogram.png"
      alt="Future Flight"
      className="hero-crest"
      width={220}
      height={204}
    />
  )
}
