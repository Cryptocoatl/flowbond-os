'use client';

// ════════════════════════════════════════════════════════════════════════
//  SafeFlow · embeddable surface  (/embed)  — runs inside the iframe widget
//
//  A lean ClaudIA chat for any FlowBond site. Same vault + blind relay as the
//  full app, gated by the SafeFlow tier (free unlocks chat). First-time vault
//  setup happens in the full app; here we sign in + unlock + chat. The host
//  page never sees keys or plaintext — everything stays in this origin.
// ════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { getVault, type ChatMessage } from '../../lib/claudia/client';
import { parseReply } from '../../lib/claudia/contract';
import { OPENING_BY_APP } from '../../lib/claudia/system-prompt';
import { TIER_LABEL, type Tier } from '../../lib/claudia/tiers';
import { hubRedirect } from '@flowbond/auth';

type Phase = 'loading' | 'signin' | 'needs-setup' | 'unlock' | 'ready';

export default function EmbedPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [app, setApp] = useState('flowme');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [factors, setFactors] = useState<string[]>([]);
  const [recovery, setRecovery] = useState('');
  const [tier, setTier] = useState<Tier>('free');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setApp(q.get('app') || 'flowme');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const enrolled = await getVault().isEnrolled();
        if (enrolled) { setFactors(await getVault().availableFactors()); setPhase('unlock'); }
        else setPhase('needs-setup');
      } catch (e) {
        setPhase((e as Error).message === 'not-signed-in' ? 'signin' : 'needs-setup');
      }
    })();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const enter = useCallback(async () => {
    const [msgs, ent] = await Promise.all([
      getVault().loadMessages(),
      getVault().myEntitlement(app).catch(() => null),
    ]);
    setMessages(msgs.length ? msgs : [{ role: 'assistant', text: OPENING_BY_APP[app] ?? OPENING_BY_APP.flowme }]);
    if (ent) setTier(ent.tier);
    setPhase('ready');
  }, [app]);

  async function unlockPasskey() {
    setBusy(true); setErr('');
    try { await getVault().unlockWithPasskey(); await enter(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  async function unlockRecovery() {
    setBusy(true); setErr('');
    try { await getVault().unlockWithRecovery(recovery); await enter(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const next: ChatMessage[] = [...messages, { role: 'user', text }];
    setMessages(next); setInput(''); setSending(true);
    try {
      await getVault().saveMessage('user', text);
      const res = await fetch('/api/claudia/relay', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.text })) }),
      });
      const data = await res.json();
      const say = parseReply(data.raw || '').say || '…';
      setMessages((m) => [...m, { role: 'assistant', text: say }]);
      await getVault().saveMessage('assistant', say);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'El flujo se interrumpió. Intenta de nuevo. 🌊' }]);
    } finally { setSending(false); }
  }

  const SHELL: React.CSSProperties = { minHeight: '100vh', background: '#0E1A2B', color: '#F4F1EA', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' };

  if (phase !== 'ready') {
    return (
      <div style={{ ...SHELL, alignItems: 'center', justifyContent: 'center', padding: 22, textAlign: 'center' }}>
        <div style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>✦</div>
          {phase === 'loading' && <p style={muted}>Despertando…</p>}
          {phase === 'signin' && (
            <>
              <p style={muted}>Entra con tu FBID para hablar con ClaudIA aquí.</p>
              <button style={cta} onClick={() => { window.location.href = hubRedirect('claudia', `${window.location.origin}/embed`); }}>Entrar ✦</button>
            </>
          )}
          {phase === 'needs-setup' && (
            <>
              <p style={muted}>Primero crea tu bóveda en ClaudIA (una vez), luego vuelve aquí.</p>
              <button style={cta} onClick={() => window.open('https://claudiaflow.life', '_blank')}>Abrir ClaudIA ↗</button>
            </>
          )}
          {phase === 'unlock' && (
            <>
              {factors.includes('passkey') && <button style={cta} onClick={unlockPasskey} disabled={busy}>{busy ? 'Verificando…' : 'Abrir con passkey'}</button>}
              {factors.includes('recovery') && (
                <div style={{ marginTop: 12 }}>
                  <textarea value={recovery} onChange={(e) => setRecovery(e.target.value)} rows={2} placeholder="frase de recuperación (24 palabras)" style={field} />
                  <button style={cta} onClick={unlockRecovery} disabled={busy || !recovery.trim()}>Abrir con frase</button>
                </div>
              )}
              {err && <p style={{ color: '#FF8A6B', fontSize: 12, marginTop: 10 }}>No se pudo abrir. Intenta de nuevo.</p>}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={SHELL}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid rgba(244,241,234,.1)' }}>
        <span style={{ fontSize: 14, letterSpacing: '0.1em' }}>ClaudIA</span>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(47,182,168,.16)', border: '1px solid rgba(47,182,168,.35)', color: '#2FB6A8' }}>{TIER_LABEL[tier]}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(244,241,234,.4)' }}>zero-knowledge</span>
      </div>

      <div ref={scrollRef} className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
            <div style={{ maxWidth: '84%', padding: '9px 13px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', background: m.role === 'user' ? 'rgba(47,182,168,.16)' : 'rgba(255,210,122,.1)', border: `1px solid ${m.role === 'user' ? 'rgba(47,182,168,.3)' : 'rgba(255,210,122,.18)'}` }}>
              {m.text}
            </div>
          </div>
        ))}
        {sending && <div style={{ fontSize: 12, color: 'rgba(244,241,234,.45)', padding: '2px 4px' }}>…</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid rgba(244,241,234,.1)' }}>
        <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Cuéntale a ClaudIA…" style={{ ...field, marginBottom: 0 }} />
        <button onClick={send} disabled={sending || !input.trim()} style={{ ...cta, padding: '0 18px', opacity: sending || !input.trim() ? 0.4 : 1 }}>✦</button>
      </div>
    </div>
  );
}

const muted: React.CSSProperties = { fontSize: 14, lineHeight: 1.6, color: 'rgba(244,241,234,.7)', marginBottom: 14 };
const cta: React.CSSProperties = { border: 'none', borderRadius: 12, padding: '10px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#0E1A2B', background: 'linear-gradient(135deg,#FFD27A,#2FB6A8)', fontFamily: 'system-ui, sans-serif' };
const field: React.CSSProperties = { width: '100%', resize: 'none', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(244,241,234,.14)', borderRadius: 12, color: '#F4F1EA', padding: '10px 12px', fontSize: 14, fontFamily: 'system-ui, sans-serif', marginBottom: 10 };
