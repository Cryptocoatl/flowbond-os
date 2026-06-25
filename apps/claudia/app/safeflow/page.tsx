'use client';

// ════════════════════════════════════════════════════════════════════════
//  SafeFlow · plug-and-play landing  (/safeflow)
//
//  The drop-in story for any FlowBond site: the 2-line embed snippet, a LIVE
//  widget running it, the tier ladder, and upgrade buttons that start Stripe
//  checkout. This is the page a partner reads to integrate ClaudIA in minutes.
// ════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { TIER_FEATURES, TIER_LABEL, type Tier } from '../../lib/claudia/tiers';

const SNIPPET = `<script src="https://claudiaflow.life/safeflow.js" defer></script>
<safeflow-chat app="your-app" height="560"></safeflow-chat>`;

const FEATURE_LABEL: Record<string, string> = {
  chat: 'Chat con ClaudIA (la guía)', care: 'Cuidado / bienestar', tasks: 'Tareas listas',
  meetings: 'Reuniones (transcripción on-device + notas)', sharing: 'Compartir recaps',
  rooms: 'Salas privadas + chat', invites: 'Enlaces de invitación',
  dashboards: 'Dashboards multi-app', ai_actions: 'Acciones con IA (talk-to-act)',
};

export default function SafeFlowLanding() {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<Tier | null>(null);
  const [note, setNote] = useState('');

  // load the web component so the live demo below mounts
  useEffect(() => {
    if (document.querySelector('script[data-safeflow]')) return;
    const s = document.createElement('script');
    s.src = '/safeflow.js'; s.defer = true; s.setAttribute('data-safeflow', '1');
    document.body.appendChild(s);
  }, []);

  async function upgrade(tier: 'plus' | 'pro') {
    setBusy(tier); setNote('');
    try {
      const res = await fetch('/api/safeflow/checkout', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tier, returnPath: '/safeflow' }),
      });
      const data = await res.json();
      if (data?.url) { window.location.href = data.url; return; }
      setNote(
        data?.error === 'auth-required' ? 'Inicia sesión con tu FBID primero.'
        : data?.error === 'billing-unconfigured' || data?.error === 'price-unconfigured'
          ? 'Billing aún no está configurado en este entorno.'
          : 'No se pudo iniciar el checkout.',
      );
    } catch { setNote('No se pudo iniciar el checkout.'); }
    finally { setBusy(null); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0E1A2B', color: '#F4F1EA', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 20px' }}>
        <header style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ fontSize: 30 }}>🛡️✦</div>
          <h1 style={{ fontSize: 30, fontWeight: 400, letterSpacing: '0.06em', margin: '8px 0 6px', background: 'linear-gradient(90deg,#FFD27A,#2FB6A8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SafeFlow
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(244,241,234,.72)', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
            Chat cifrado de extremo a extremo + asistencia IA de ClaudIA, integrable en cualquier sitio FlowBond como una función de tu FBID. Zero-knowledge, por niveles.
          </p>
        </header>

        {/* embed snippet */}
        <section style={cardStyle}>
          <h2 style={h2}>Intégralo en 2 líneas</h2>
          <pre style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(244,241,234,.1)', borderRadius: 12, padding: 14, overflowX: 'auto', fontSize: 12.5, lineHeight: 1.6, color: '#FFD27A', margin: 0 }}>
            {SNIPPET}
          </pre>
          <button
            onClick={() => { navigator.clipboard?.writeText(SNIPPET).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}
            style={{ ...btn, marginTop: 12 }}
          >
            {copied ? '✓ copiado' : 'Copiar snippet'}
          </button>
          <p style={{ ...muted, marginTop: 10 }}>
            El widget es un iframe a <code>claudiaflow.life/embed</code> — las llaves, el cifrado y la sesión FBID viven en el origen de ClaudIA, aislados de tu página.
          </p>
        </section>

        {/* live demo */}
        <section style={cardStyle}>
          <h2 style={h2}>Demo en vivo</h2>
          <div dangerouslySetInnerHTML={{ __html: '<safeflow-chat app="flowme" height="480"></safeflow-chat>' }} />
        </section>

        {/* tiers */}
        <section style={cardStyle}>
          <h2 style={h2}>Niveles</h2>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {(['free', 'plus', 'pro'] as Tier[]).map((t) => (
              <div key={t} style={{ flex: '1 1 200px', border: '1px solid rgba(244,241,234,.12)', borderRadius: 14, padding: 16, background: 'rgba(255,255,255,.03)' }}>
                <div style={{ fontSize: 16, marginBottom: 10, color: t === 'pro' ? '#FFD27A' : t === 'plus' ? '#2FB6A8' : 'inherit' }}>{TIER_LABEL[t]}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12.5, lineHeight: 1.9, color: 'rgba(244,241,234,.8)' }}>
                  {TIER_FEATURES[t].map((f) => <li key={f}>✓ {FEATURE_LABEL[f] ?? f}</li>)}
                </ul>
                {t !== 'free' && (
                  <button onClick={() => upgrade(t)} disabled={busy === t} style={{ ...btn, marginTop: 14, width: '100%' }}>
                    {busy === t ? 'Abriendo checkout…' : `Mejorar a ${TIER_LABEL[t]}`}
                  </button>
                )}
              </div>
            ))}
          </div>
          {note && <p style={{ ...muted, color: '#FFD27A', marginTop: 12 }}>{note}</p>}
        </section>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(244,241,234,.4)', marginTop: 20 }}>
          zero-knowledge by design · la transcripción de reuniones ocurre en tu dispositivo
        </p>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,.04)', border: '1px solid rgba(244,241,234,.1)', borderRadius: 18, padding: 22, marginBottom: 18 };
const h2: React.CSSProperties = { fontSize: 17, fontWeight: 400, margin: '0 0 12px', letterSpacing: '0.03em' };
const muted: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.6, color: 'rgba(244,241,234,.6)', margin: 0 };
const btn: React.CSSProperties = { border: 'none', borderRadius: 11, padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#0E1A2B', background: 'linear-gradient(135deg,#FFD27A,#2FB6A8)', fontFamily: 'system-ui, sans-serif' };
