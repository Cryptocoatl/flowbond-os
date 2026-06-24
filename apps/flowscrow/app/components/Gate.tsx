import type { Deal, Task } from '@/lib/types';
import { allPhaseBConfirmed } from '@/lib/deal';

export function Gate({ deal, tasks }: { deal: Deal; tasks: Task[] }) {
  const bDone = allPhaseBConfirmed(tasks);
  const bCount = tasks.filter((t) => t.phase === 'B').length;
  const bConfirmed = tasks.filter((t) => t.phase === 'B' && t.status === 'confirmed').length;
  const open = bDone && deal.counsel_approved;

  return (
    <div
      className="card"
      style={{
        padding: 16,
        borderColor: open ? 'rgba(143,169,143,0.5)' : 'rgba(201,169,97,0.18)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Release gate</h3>
        <span className="pill" style={{ color: open ? '#8FA98F' : '#C9A961' }}>
          {open ? 'open' : 'closed'}
        </span>
      </div>
      <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
        <Check ok={bDone} label={`All Phase-B transfers confirmed (${bConfirmed}/${bCount})`} />
        <Check ok={deal.counsel_approved} label="Counsel approval recorded" />
      </ul>
      <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#9fb0a4', lineHeight: 1.5 }}>
        The courtesy letter stays sealed from the counterparty until the gate opens and counsel
        releases. Both conditions are required — green checkpoints alone do not release.
      </p>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          background: ok ? '#8FA98F' : 'transparent',
          border: ok ? 'none' : '1px solid #7c8a82',
          color: '#14241a',
        }}
      >
        {ok ? '✓' : ''}
      </span>
      <span style={{ color: ok ? '#cfe0d2' : '#9fb0a4' }}>{label}</span>
    </li>
  );
}
