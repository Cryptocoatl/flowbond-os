'use client';

import { card } from './CarePanel';
import { EMPIRE, ACCENT_HEX, REALM_LABEL, type EmpireApp } from '../../lib/claudia/empire';

// "El Imperio" — every FlowBond world, one tap to connect ClaudIA to it.
// connectedById maps app_slug → grant id (present = connected). Connect/disconnect
// flow through the grant spine (migration 0002) in the parent.
export function EmpireGrid({
  connectedBySlug,
  isRoot,
  connecting,
  onConnect,
  onDisconnect,
}: {
  connectedBySlug: Record<string, string>;
  isRoot: boolean;
  connecting: string | null;
  onConnect: (slug: string) => void;
  onDisconnect: (grantId: string, slug: string) => void;
}) {
  const realms = Array.from(new Set(EMPIRE.map((a) => a.realm)));
  const connectedCount = EMPIRE.filter((a) => connectedBySlug[a.slug]).length;

  return (
    <div style={card({ padding: '18px 18px 8px' })}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={heading}>El Imperio</h3>
        <span style={{ fontSize: 11.5, color: 'rgba(244,241,234,.5)', letterSpacing: '0.04em' }}>
          {connectedCount}/{EMPIRE.length} conectados
        </span>
      </div>

      {realms.map((realm) => (
        <div key={realm} style={{ marginBottom: 16 }}>
          <p style={realmLabel}>{REALM_LABEL[realm]}</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 11,
            }}
          >
            {EMPIRE.filter((a) => a.realm === realm).map((app) => (
              <AppCard
                key={app.slug}
                app={app}
                grantId={connectedBySlug[app.slug]}
                isRoot={isRoot}
                connecting={connecting === app.slug}
                onConnect={onConnect}
                onDisconnect={onDisconnect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AppCard({
  app, grantId, isRoot, connecting, onConnect, onDisconnect,
}: {
  app: EmpireApp;
  grantId?: string;
  isRoot: boolean;
  connecting: boolean;
  onConnect: (slug: string) => void;
  onDisconnect: (grantId: string, slug: string) => void;
}) {
  const accent = ACCENT_HEX[app.accent];
  const connected = !!grantId;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 16,
        padding: '13px 13px 12px',
        background: connected
          ? `linear-gradient(160deg, ${hexA(accent, 0.16)}, rgba(255,255,255,.03))`
          : 'rgba(255,255,255,.03)',
        border: `1px solid ${connected ? hexA(accent, 0.45) : 'rgba(244,241,234,.09)'}`,
        boxShadow: connected ? `0 8px 26px ${hexA(accent, 0.16)}` : 'none',
        transition: 'border-color .25s ease, box-shadow .25s ease, transform .25s ease',
        overflow: 'hidden',
      }}
    >
      {/* connected glow seam */}
      {connected && (
        <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
        <span style={{ fontSize: 22, lineHeight: 1, filter: `drop-shadow(0 0 10px ${hexA(accent, 0.5)})` }}>{app.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14.5, fontWeight: 500, color: accent, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {app.name}
            </span>
            <span
              title={app.status === 'live' ? 'en vivo' : 'en construcción'}
              style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: app.status === 'live' ? '#2FB6A8' : 'rgba(244,241,234,.35)', boxShadow: app.status === 'live' ? '0 0 7px #2FB6A8' : 'none' }}
            />
          </div>
        </div>
      </div>

      <p style={{ margin: '0 0 12px', fontSize: 11.5, lineHeight: 1.45, color: 'rgba(244,241,234,.55)', minHeight: 32 }}>
        {app.tagline}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {connected ? (
          <>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: accent, letterSpacing: '0.03em' }}>✓ Conectado</span>
            <button onClick={() => onDisconnect(grantId!, app.slug)} title="Desconectar" style={ghostBtn}>✕</button>
          </>
        ) : isRoot ? (
          <button onClick={() => onConnect(app.slug)} disabled={connecting} style={connectBtn(accent, connecting)}>
            {connecting ? 'Conectando…' : 'Conectar'}
          </button>
        ) : (
          <span style={{ flex: 1, fontSize: 10.5, color: 'rgba(244,241,234,.35)', fontStyle: 'italic' }}>reclama /admin init</span>
        )}

        {app.url && (
          <a href={app.url} target="_blank" rel="noopener noreferrer" title={`Abrir ${app.name}`} style={openBtn}>
            ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ── style helpers ───────────────────────────────────────────────────────────
const heading: React.CSSProperties = {
  margin: 0, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase',
  color: 'rgba(244,241,234,.6)', fontWeight: 400,
};
const realmLabel: React.CSSProperties = {
  margin: '0 0 8px', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
  color: 'rgba(244,241,234,.32)', fontWeight: 400,
};
const ghostBtn: React.CSSProperties = {
  border: '1px solid rgba(244,241,234,.16)', background: 'transparent', color: 'rgba(244,241,234,.6)',
  borderRadius: 8, width: 26, height: 26, cursor: 'pointer', fontSize: 12, lineHeight: 1,
  display: 'grid', placeItems: 'center', fontFamily: 'system-ui, sans-serif',
};
const openBtn: React.CSSProperties = {
  ...ghostBtn, textDecoration: 'none', flexShrink: 0,
};
function connectBtn(accent: string, busy: boolean): React.CSSProperties {
  return {
    flex: 1, border: `1px solid ${hexA(accent, 0.5)}`, background: hexA(accent, 0.12),
    color: accent, borderRadius: 9, padding: '6px 10px', cursor: busy ? 'default' : 'pointer',
    fontSize: 12, fontWeight: 600, letterSpacing: '0.02em', opacity: busy ? 0.6 : 1,
    fontFamily: 'system-ui, sans-serif',
  };
}
// #RRGGBB + alpha → rgba()
function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
