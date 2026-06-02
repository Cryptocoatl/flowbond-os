// Circular progress ring showing the share of healthy plants. Pure SVG, server-renderable.
export function HealthRing({
  healthy,
  total,
  size = 88,
}: {
  healthy: number
  total: number
  size?: number
}) {
  const pct = total > 0 ? Math.round((healthy / total) * 100) : 0
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  // Color shifts with health: green when thriving, amber mid, soft red when struggling.
  const color = pct >= 70 ? 'var(--fg-green)' : pct >= 40 ? '#C9A961' : '#d9763f'

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fg-border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-display text-fg leading-none">{pct}%</span>
        <span className="text-[9px] uppercase tracking-widest text-fg-muted mt-0.5">healthy</span>
      </div>
    </div>
  )
}
