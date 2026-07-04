import type { FlowDocument, PartyRole } from '@/lib/types';

const KIND_LABEL: Record<string, string> = {
  agreement: 'Separation Agreement',
  courtesy_letter: 'Courtesy Letter (Exhibit 5)',
};

export function Vault({
  documents,
  myRoles,
}: {
  documents: FlowDocument[];
  myRoles: PartyRole[];
}) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700 }}>Escrow vault</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {documents.map((d) => {
          const isLetter = d.kind === 'courtesy_letter';
          const canSee = !isLetter || d.released || myRoles.includes('initiator') || myRoles.includes('counsel');
          return (
            <div
              key={d.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '9px 0',
                borderTop: '1px solid rgba(201,169,97,0.10)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{KIND_LABEL[d.kind] ?? d.kind}</div>
                <div style={{ fontSize: 11.5, color: '#8a978c', fontFamily: 'var(--font-mono)' }}>
                  {d.sha256 ? `sha256 ${d.sha256.slice(0, 16)}…` : 'no hash yet'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className="pill" style={{ color: d.status === 'completed' ? '#8FA98F' : '#C9A961' }}>
                  {d.status}
                </span>
                {isLetter && !canSee ? (
                  <span className="pill" style={{ color: '#7c8a82' }}>
                    held · sealed
                  </span>
                ) : (
                  <span className="pill" style={{ color: d.released ? '#8FA98F' : '#7c8a82' }}>
                    {d.released ? 'released' : 'in escrow'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
