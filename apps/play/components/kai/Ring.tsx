// Ring — SVG progress ring for 0..1 values (world status, reputation, progress).
export function Ring({
  value,
  size = 92,
  stroke = 7,
  color = '#6FCF97',
  track = 'rgba(255,255,255,0.08)',
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
  sublabel?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      {(label || sublabel) && (
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            {label && <div className="font-display text-lg font-semibold leading-none text-kai-text">{label}</div>}
            {sublabel && <div className="mt-0.5 text-[9px] uppercase tracking-widest text-kai-faint">{sublabel}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
