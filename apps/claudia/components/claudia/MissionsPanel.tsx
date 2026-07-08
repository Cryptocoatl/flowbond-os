'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · MISSIONS  (components/claudia/MissionsPanel.tsx)
//
//  The empire's living to-do, as ClaudIA sees it. She runs a server-side
//  heartbeat over every live world (/api/claudia/uptime) and turns the result
//  — plus what you have and haven't connected — into a short list of missions
//  you can act on: a world that's down, a live world not yet under your grant
//  spine. Quiet and honest: if all is well, she says so.
// ════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EMPIRE, EMPIRE_BY_SLUG } from '../../lib/claudia/empire';
import { fetchUptime, type UptimeReport } from '../../lib/claudia/uptime';

type Mission = {
  id: string;
  tone: 'alert' | 'grow' | 'calm';
  icon: string;
  text: string;
  slug?: string;
  action?: 'connect' | 'open';
};

export function MissionsPanel({
  connectedBySlug,
  isRoot,
  onConnect,
  connecting,
}: {
  connectedBySlug: Record<string, string>;
  isRoot: boolean;
  onConnect: (slug: string) => void;
  connecting: string | null;
}) {
  const [report, setReport] = useState<UptimeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setErr(false);
    try { setReport(await fetchUptime()); }
    catch { setErr(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const missions: Mission[] = useMemo(() => {
    const out: Mission[] = [];
    const st = report?.status ?? {};
    // 1) worlds that are down — highest priority
    for (const a of EMPIRE) {
      if (a.status === 'live' && a.url && st[a.slug] === 'down') {
        out.push({ id: `down-${a.slug}`, tone: 'alert', icon: '🔴', text: `${a.name} no responde — ábrela para revisar`, slug: a.slug, action: 'open' });
      }
    }
    // 2) live worlds you haven't connected to your spine (root only)
    if (isRoot) {
      for (const a of EMPIRE) {
        if (a.status === 'live' && !connectedBySlug[a.slug] && st[a.slug] !== 'down') {
          out.push({ id: `connect-${a.slug}`, tone: 'grow', icon: a.emoji, text: `Conecta ${a.name} al imperio`, slug: a.slug, action: 'connect' });
        }
      }
    }
    return out.slice(0, 8);
  }, [report, connectedBySlug, isRoot]);

  const upCount = report?.up ?? 0;
  const total = report?.total ?? EMPIRE.filter((a) => a.status === 'live' && a.url).length;

  return (
    <section style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(244,241,234,.1)', borderRadius: 16, padding: 16, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500, letterSpacing: '0.05em', color: '#F4F1EA', flex: 1 }}>
          🎯 Misiones de ClaudIA
        </h3>
        {/* health pill */}
        <span style={{ fontSize: 11.5, color: err ? '#FF8A6B' : 'rgba(244,241,234,.6)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: err ? '#FF8A6B' : upCount === total ? '#2FB6A8' : '#FFD27A' }} />
          {loading ? 'latiendo…' : err ? 'sin señal' : `${upCount}/${total} en línea`}
        </span>
        <button onClick={refresh} disabled={loading} title="Volver a latir" aria-label="refrescar"
          style={{ width: 28, height: 28, borderRadius: '50%', cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'rgba(244,241,234,.7)', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(244,241,234,.14)', opacity: loading ? 0.5 : 1 }}>
          ↻
        </button>
      </div>

      {missions.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'rgba(244,241,234,.55)', fontStyle: 'italic' }}>
          {loading ? 'Reviso cada mundo…' : 'Todo en orden — el imperio respira. Te aviso si algo pide atención. 🌊'}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {missions.map((m) => {
            const app = m.slug ? EMPIRE_BY_SLUG[m.slug] : undefined;
            const busy = m.slug != null && connecting === m.slug;
            return (
              <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 12, background: m.tone === 'alert' ? 'rgba(255,138,107,.09)' : 'rgba(255,255,255,.035)', border: `1px solid ${m.tone === 'alert' ? 'rgba(255,138,107,.28)' : 'rgba(244,241,234,.1)'}` }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>{m.icon}</span>
                <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.4, color: 'rgba(244,241,234,.82)' }}>{m.text}</span>
                {m.action === 'connect' && (
                  <button onClick={() => m.slug && onConnect(m.slug)} disabled={busy}
                    style={{ fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, cursor: busy ? 'default' : 'pointer', color: '#0E1A2B', background: 'linear-gradient(135deg,#FFD27A,#2FB6A8)', border: 'none', borderRadius: 999, padding: '5px 12px', opacity: busy ? 0.6 : 1 }}>
                    {busy ? '…' : 'Conectar'}
                  </button>
                )}
                {m.action === 'open' && app?.url && (
                  <a href={app.url} target="_blank" rel="noreferrer"
                    style={{ fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, textDecoration: 'none', color: '#FF8A6B', border: '1px solid rgba(255,138,107,.4)', borderRadius: 999, padding: '5px 12px' }}>
                    Abrir
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
