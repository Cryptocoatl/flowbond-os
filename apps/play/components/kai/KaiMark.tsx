// KaiMark — sacred-geometry glyph (interlocking octagram + core). Currentcolor-
// friendly gold. Scales cleanly from favicon to hero.
export function KaiMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label="Kai World">
      <defs>
        <linearGradient id="kai-mark-g" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0" stopColor="#F4C25A" />
          <stop offset="1" stopColor="#6FCF97" />
        </linearGradient>
      </defs>
      <g stroke="url(#kai-mark-g)" strokeWidth="1.5" strokeLinejoin="round" opacity="0.95">
        <rect x="10" y="10" width="28" height="28" rx="3" transform="rotate(0 24 24)" />
        <rect x="10" y="10" width="28" height="28" rx="3" transform="rotate(45 24 24)" />
        <circle cx="24" cy="24" r="14" opacity="0.5" />
      </g>
      <circle cx="24" cy="24" r="4.2" fill="url(#kai-mark-g)" />
    </svg>
  );
}
