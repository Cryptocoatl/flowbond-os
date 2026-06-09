'use client';

import { card } from './CarePanel';
import type { ReadyTask } from '../../lib/claudia/client';

// "El imperio · listas" — the tasks she's readied, decrypted client-side.
export function TaskPanel({ tasks, onToggle }: { tasks: ReadyTask[]; onToggle: (t: ReadyTask) => void }) {
  const openCount = tasks.filter((t) => t.status === 'open').length;
  return (
    <div style={card({ padding: 16, flex: 1 })}>
      <h3 style={heading}>
        El imperio · listas {tasks.length > 0 && <span style={{ color: '#FFD27A' }}>({openCount})</span>}
      </h3>
      {tasks.length === 0 && (
        <p style={{ fontSize: 13, color: 'rgba(244,241,234,.4)', fontStyle: 'italic', lineHeight: 1.5 }}>
          Dime qué necesitas y lo dejo listo. Whatever you name, I prepare.
        </p>
      )}
      {tasks.map((t) => {
        const done = t.status === 'done';
        return (
          <div
            key={t.id}
            style={{
              padding: '10px 12px',
              marginBottom: 8,
              borderRadius: 12,
              background: 'rgba(255,255,255,.03)',
              border: '1px solid rgba(244,241,234,.08)',
              opacity: done ? 0.5 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <button
                onClick={() => onToggle(t)}
                style={{
                  marginTop: 2,
                  width: 16,
                  height: 16,
                  borderRadius: 5,
                  border: '1.5px solid #2FB6A8',
                  background: done ? '#2FB6A8' : 'transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, textDecoration: done ? 'line-through' : 'none', lineHeight: 1.4 }}>
                  {t.title || '—'}
                </div>
                <div style={{ fontSize: 10.5, color: '#2FB6A8', letterSpacing: '0.05em', marginTop: 3, textTransform: 'uppercase' }}>
                  {t.venture}
                </div>
                {t.ready && (
                  <div style={{ fontSize: 12, color: 'rgba(244,241,234,.55)', marginTop: 5, fontStyle: 'italic', lineHeight: 1.45 }}>
                    ↳ {t.ready}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
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
