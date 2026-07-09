// Power-ring: transmutación suelo -> oro. The fill % rendered as an arc.
export function PowerRing({ pct, size = 46, color }: { pct: number; size?: number; color: string }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <svg className="powerring" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bs-void2)" strokeWidth="3.5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="55%" textAnchor="middle">
        {Math.round(pct)}
      </text>
    </svg>
  );
}
