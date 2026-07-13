/**
 * Brand marks. These are the inline-SVG placeholders from the reference. When
 * finals land per BRAND-ASSETS.md, swap the monogram body for
 * <Image src="/brand/monogram.svg" ... /> and the plane for
 * <Image src="/brand/hero-poster.jpg" ... /> — no other code changes needed.
 */

export function Monogram({ size = 38 }: { size?: number }) {
  return (
    <span className="mark" aria-hidden="true" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48">
        <g fill="#D4AF37">
          <path d="M6 30 L30 14 L44 14 L20 30 Z" />
          <path d="M6 40 L26 27 L38 27 L18 40 Z" opacity=".85" />
        </g>
      </svg>
    </span>
  )
}

export function PlaneMark() {
  return (
    <svg className="plane" viewBox="0 0 200 120" fill="none" aria-label="aircraft">
      <path
        d="M100 6c8 0 14 22 15 44l55 30c4 2 4 8-1 8l-58-8c-2 14-5 24-11 24s-9-10-11-24l-58 8c-5 0-5-6-1-8l55-30C86 28 92 6 100 6Z"
        fill="#F2F2F2"
        stroke="#D4AF37"
        strokeWidth="1.5"
      />
    </svg>
  )
}
