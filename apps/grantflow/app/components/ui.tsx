import { LAYER_LABEL } from '@/lib/types';

export function LayerPill({ layer }: { layer: string }) {
  return <span className={`pill pill-${layer}`}>{LAYER_LABEL[layer] ?? layer}</span>;
}

const STATUS_CLASS: Record<string, string> = {
  open: 'pill-open',
  rolling: 'pill-rolling',
  upcoming: 'pill-upcoming',
  'round-based': 'pill-round',
  closed: 'pill-closed',
};

export function StatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  const cls = STATUS_CLASS[status] ?? '';
  const dot =
    status === 'open' ? '🟢' : status === 'rolling' ? '🔵' : status === 'upcoming' ? '🟡' : '⚪️';
  return (
    <span className={`pill ${cls}`}>
      {dot} {status}
    </span>
  );
}

export function FitMeter({ score }: { score: number | null }) {
  const s = score ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="fit">
        {s}
        <small>/10</small>
      </span>
      <div className="gf-bar" style={{ width: 64 }}>
        <span style={{ width: `${(s / 10) * 100}%` }} />
      </div>
    </div>
  );
}

export function Effort({ level }: { level: string | null }) {
  if (!level) return null;
  const n = level === 'low' ? 1 : level === 'medium' ? 2 : 3;
  return (
    <span className="gf-tag" title={`${level} effort`}>
      {'●'.repeat(n)}
      {'○'.repeat(3 - n)} effort
    </span>
  );
}
