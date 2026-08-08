// StatTile — one impact metric. null value renders as an honest em-dash (no fake data).
import { Icon, type IconName } from './Icon';

function fmt(v: number | null, unit?: string): string {
  if (v === null || v === undefined) return '—';
  const s = v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `${v}`;
  return unit ? `${s} ${unit}` : s;
}

export function StatTile({
  icon,
  label,
  value,
  unit,
  accent = '#6FCF97',
}: {
  icon: IconName;
  label: string;
  value: number | null;
  unit?: string;
  accent?: string;
}) {
  return (
    <div className="glass-hover flex items-center gap-3 rounded-xl2 border border-white/[0.05] bg-white/[0.02] p-3">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
        style={{ color: accent, background: `${accent}14`, boxShadow: `inset 0 0 0 1px ${accent}22` }}
      >
        <Icon name={icon} size={17} />
      </span>
      <div className="min-w-0">
        <div className="font-display text-base font-semibold leading-tight text-kai-text">{fmt(value, unit)}</div>
        <div className="truncate text-[11px] text-kai-muted">{label}</div>
      </div>
    </div>
  );
}
