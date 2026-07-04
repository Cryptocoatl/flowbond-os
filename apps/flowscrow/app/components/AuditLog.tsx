import type { FlowEvent } from '@/lib/types';

const TYPE_LABEL: Record<string, string> = {
  deal_seeded: 'Deal created from Exhibit 3',
  transfers_opened: 'Transfer phase opened',
  task_submitted: 'Task marked delivered',
  task_confirmed: 'Task confirmed by verifier',
  counsel_approved: 'Counsel approval recorded',
  deal_cleared: 'All tasks cleared — gate opened',
  released: 'Documents released',
  anchored: 'Anchored on Base',
  wallet_bound: 'Personal wallet bound',
};

export function AuditLog({ events }: { events: FlowEvent[] }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700 }}>
        Audit log <span style={{ fontSize: 11, color: '#8a978c', fontWeight: 400 }}>· append-only</span>
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {events.length === 0 && (
          <p style={{ fontSize: 13, color: '#8a978c', margin: 0 }}>No activity yet.</p>
        )}
        {events.map((e) => {
          const code = (e.payload?.code as string) ?? '';
          return (
            <div
              key={e.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '7px 0',
                borderTop: '1px solid rgba(201,169,97,0.08)',
                fontSize: 13,
              }}
            >
              <span>
                {code && (
                  <span className="gold" style={{ fontFamily: 'var(--font-mono)', marginRight: 6 }}>
                    {code}
                  </span>
                )}
                {TYPE_LABEL[e.type] ?? e.type}
              </span>
              <span style={{ color: '#8a978c', whiteSpace: 'nowrap', fontSize: 12 }}>
                {new Date(e.created_at).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
