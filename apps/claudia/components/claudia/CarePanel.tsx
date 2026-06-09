'use client';

export interface CareItem {
  key: 'meal' | 'water' | 'rest';
  label: string;
  icon: string;
  log: string;
  due: boolean;
  since: string; // "3h 12m" or "—"
}

// "Tu cuidado" — she watches the human behind the work. Timing only; never content.
export function CarePanel({ items, onLog }: { items: CareItem[]; onLog: (k: CareItem['key']) => void }) {
  return (
    <div style={card({ padding: 16 })}>
      <h3 style={heading}>Tu cuidado</h3>
      {items.map((c) => (
        <div
          key={c.key}
          className={c.due ? 'due' : ''}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 11px',
            marginBottom: 8,
            borderRadius: 12,
            background: c.due ? 'rgba(255,138,107,.1)' : 'rgba(255,255,255,.03)',
            border: `1px solid ${c.due ? 'rgba(255,138,107,.3)' : 'rgba(244,241,234,.08)'}`,
          }}
        >
          <span style={{ fontSize: 18 }}>{c.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: c.due ? '#FF8A6B' : 'rgba(244,241,234,.45)' }}>
              {c.since === '—' ? 'sin registro' : `hace ${c.since}`}
            </div>
          </div>
          <button onClick={() => onLog(c.key)} style={logBtn}>
            {c.log}
          </button>
        </div>
      ))}
    </div>
  );
}

const heading: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 13,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'rgba(244,241,234,.5)',
  fontWeight: 400,
};
const logBtn: React.CSSProperties = {
  border: '1px solid #2FB6A8',
  background: 'rgba(47,182,168,.12)',
  color: '#2FB6A8',
  borderRadius: 9,
  padding: '5px 10px',
  fontSize: 11.5,
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
};
export function card(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(244,241,234,.1)',
    borderRadius: 20,
    backdropFilter: 'blur(10px)',
    boxShadow: '0 24px 60px rgba(0,0,0,.4)',
    ...extra,
  };
}
