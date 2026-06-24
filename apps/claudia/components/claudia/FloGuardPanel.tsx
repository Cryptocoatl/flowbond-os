'use client';

import { card } from './CarePanel';
import status from '../../lib/claudia/floguard-status.json';

// "Seguridad del Imperio" — ClaudIA's FloGuard operator surface. She audits the
// whole ecosystem (secrets · RLS · headers · advisors) on a standing cadence and
// shows the live posture here. The data is a snapshot regenerated each round from
// apps/claudia/operator/floguard/BACKLOG.md — operational metadata only, NEVER a
// secret value (same ethos as the care log: status without content).

const SEV_COLOR: Record<string, string> = {
  p1: '#FF8A6B',
  p2: '#FFD27A',
  p3: '#FFD27A',
  hardening: '#2FB6A8',
  headers: '#2FB6A8',
  hygiene: 'rgba(244,241,234,.6)',
};
const STATUS_LABEL: Record<string, string> = {
  'in-progress': 'en curso',
  open: 'abierto',
};

export function FloGuardPanel() {
  const c = status.counts;
  const postureOk = status.critical === 0;
  const accent = postureOk ? '#2FB6A8' : '#FF8A6B';

  const stats = [
    { label: 'Hallazgos abiertos', value: String(c.open + c.inProgress), accent: '#FFD27A', emoji: '🔎' },
    { label: 'ClaudIA resolviendo', value: String(c.inProgress), accent: '#2FB6A8', emoji: '🛠️' },
    { label: 'En tu cancha', value: String(c.blocked), accent: '#FF8A6B', emoji: '🔑' },
    { label: 'Advisors', value: `${status.advisors.warn} / ${status.advisors.errors}❗`, accent: '#F4F1EA', emoji: '📡' },
  ];

  return (
    <div style={card({ padding: '18px 18px 16px', marginTop: 16 })}>
      {/* header + posture badge */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 style={heading}>🛡️ Seguridad del Imperio · FloGuard</h3>
        <span
          style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', borderRadius: 999, padding: '3px 11px',
            color: accent, background: `${accent}1f`, border: `1px solid ${accent}59`,
          }}
        >
          {postureOk ? `postura alta · ${status.critical} críticos` : `${status.critical} críticos ⚠`}
        </span>
      </div>
      <p style={{ margin: '0 0 14px', fontSize: 11.5, color: 'rgba(244,241,234,.45)', letterSpacing: '0.03em' }}>
        Última auditoría {status.lastAudit} · próxima {status.cadence}
      </p>

      {/* counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(244,241,234,.08)', borderRadius: 14, padding: '10px 12px', position: 'relative', overflow: 'hidden' }}>
            <span style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: s.accent, opacity: 0.7 }} />
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(244,241,234,.45)', marginBottom: 4 }}>
              {s.emoji} {s.label}
            </div>
            <div style={{ fontSize: 17, fontWeight: 500, color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* active work */}
      <p style={subLabel}>En curso</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
        {status.active.map((item) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', borderRadius: 11, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(244,241,234,.07)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: SEV_COLOR[item.sev] ?? '#2FB6A8', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: 'rgba(244,241,234,.5)', flexShrink: 0 }}>{item.id}</span>
            <span style={{ flex: 1, fontSize: 12.5, color: 'rgba(244,241,234,.82)', lineHeight: 1.35 }}>{item.title}</span>
            <span style={{ fontSize: 10, color: SEV_COLOR[item.sev] ?? '#2FB6A8', flexShrink: 0, letterSpacing: '0.03em' }}>
              {STATUS_LABEL[item.status] ?? item.status}
            </span>
          </div>
        ))}
      </div>

      {/* rotation queue — your hand on the dashboard */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 12, background: 'rgba(255,210,122,.08)', border: '1px solid rgba(255,210,122,.26)' }}>
        <span style={{ fontSize: 16 }}>🔑</span>
        <span style={{ flex: 1, fontSize: 12.5, color: '#FFD27A', lineHeight: 1.4 }}>
          <strong>{status.rotationsQueued} rotaciones de llaves en cola</strong> — requieren tu mano en el panel. ClaudIA las deja redactadas, nunca las ejecuta.
        </span>
      </div>

      <p style={{ margin: '13px 0 0', fontSize: 10.5, textAlign: 'center', color: 'rgba(244,241,234,.34)', letterSpacing: '0.04em' }}>
        ClaudIA audita todo el ecosistema cada semana · nunca registra secretos
      </p>
    </div>
  );
}

const heading: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'rgba(244,241,234,.5)',
  fontWeight: 400,
};
const subLabel: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: 10.5,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(244,241,234,.4)',
};
