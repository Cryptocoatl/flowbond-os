'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Orb } from './Orb';
import { ModeBadge } from './ModeBadge';
import { ChatPanel } from './ChatPanel';
import { CarePanel, card, type CareItem } from './CarePanel';
import { TaskPanel } from './TaskPanel';
import { NUDGE_COPY } from './NudgeBanner';
import { ClaudiaVault, type ChatMessage, type ReadyTask } from '../../lib/claudia/client';
import { parseReply } from '../../lib/claudia/contract';
import { OPENING_BY_APP } from '../../lib/claudia/system-prompt';
import { hubRedirect } from '@flowbond/auth';

type Phase = 'loading' | 'signin' | 'enroll' | 'unlock' | 'ready';

const CARE_META: { key: CareItem['key']; label: string; icon: string; log: string; pref: 'meal_hours' | 'water_hours' | 'rest_hours' }[] = [
  { key: 'meal', label: 'Comida', icon: '🍲', log: 'Comí', pref: 'meal_hours' },
  { key: 'water', label: 'Agua', icon: '💧', log: 'Tomé agua', pref: 'water_hours' },
  { key: 'rest', label: 'Descanso', icon: '🌙', log: 'Descansé', pref: 'rest_hours' },
];

function sinceLabel(ms: number): string {
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function ClaudiaApp() {
  const vaultRef = useRef<ClaudiaVault | null>(null);
  const getVault = () => (vaultRef.current ??= new ClaudiaVault());

  const [phase, setPhase] = useState<Phase>('loading');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tasks, setTasks] = useState<ReadyTask[]>([]);
  const [careState, setCareState] = useState<Record<string, string>>({});
  const [prefs, setPrefs] = useState<Record<string, number>>({ meal_hours: 4, water_hours: 1.5, rest_hours: 2.5 });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [nudge, setNudge] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [factors, setFactors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [now, setNow] = useState(0);

  // ── tick for "hace Xh" + client-side care evaluation ──────────────────────
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // ── boot: signed-in? enrolled? ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const enrolled = await getVault().isEnrolled();
        if (enrolled) {
          setFactors(await getVault().availableFactors());
          setPhase('unlock');
        } else {
          setPhase('enroll');
        }
      } catch (e) {
        setPhase((e as Error).message === 'not-signed-in' ? 'signin' : 'enroll');
      }
    })();
  }, []);

  const loadAll = useCallback(async () => {
    const v = getVault();
    const [msgs, tsk, care, p] = await Promise.all([
      v.loadMessages(), v.loadTasks(), v.careState(), v.getCarePrefs(),
    ]);
    setMessages(msgs.length ? msgs : [{ role: 'assistant', text: OPENING_BY_APP.flowme }]);
    setTasks(tsk);
    setCareState(care);
    setPrefs(p as unknown as Record<string, number>);
    const pending = await v.pendingNudges();
    if (pending.length) setNudge(NUDGE_COPY[pending[0].kind] ?? '');
  }, []);

  // ── care items (timing only) ──────────────────────────────────────────────
  const careItems: CareItem[] = useMemo(() => {
    return CARE_META.map((c) => {
      const last = careState[c.key] ? new Date(careState[c.key]).getTime() : 0;
      const threshMs = (prefs[c.pref] ?? 4) * 3.6e6;
      const elapsed = last ? now - last : Infinity;
      return {
        key: c.key, label: c.label, icon: c.icon, log: c.log,
        due: elapsed > threshMs,
        since: last ? sinceLabel(now - last) : '—',
      };
    });
  }, [careState, prefs, now]);

  // ── enroll / unlock ────────────────────────────────────────────────────────
  async function doEnroll() {
    setBusy(true); setErr('');
    try {
      const { recoveryPhrase } = await getVault().enroll({ wantPasskey: true, displayName: 'sovereign' });
      setRecoveryPhrase(recoveryPhrase); // show ONCE
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function finishEnroll() {
    setRecoveryPhrase('');
    setPhase('ready');
    await loadAll();
  }
  async function doUnlockPasskey() {
    setBusy(true); setErr('');
    try { await getVault().unlockWithPasskey(); setPhase('ready'); await loadAll(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }
  async function doUnlockRecovery() {
    setBusy(true); setErr('');
    try { await getVault().unlockWithRecovery(recoveryInput); setPhase('ready'); await loadAll(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  // ── send turn ───────────────────────────────────────────────────────────────
  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const next: ChatMessage[] = [...messages, { role: 'user', text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      await getVault().saveMessage('user', text);
      const res = await fetch('/api/claudia/relay', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.text })) }),
      });
      const data = await res.json();
      const reply = parseReply(data.raw || '');
      const say = reply.say || '…';
      setMessages((m) => [...m, { role: 'assistant', text: say }]);
      await getVault().saveMessage('assistant', say);
      for (const t of reply.tasks) await getVault().captureTask(t);
      if (reply.tasks.length) setTasks(await getVault().loadTasks());
      if (reply.care) setNudge(reply.care);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'El flujo se interrumpió un momento. Try again — estoy aquí. 🌊' }]);
    } finally {
      setSending(false);
    }
  }

  async function logCare(key: CareItem['key']) {
    await getVault().logCare(key);
    setCareState(await getVault().careState());
    setNudge('');
  }
  async function toggleTask(t: ReadyTask) {
    const status = t.status === 'done' ? 'open' : 'done';
    await getVault().setTaskStatus(t.id, status);
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, status } : x)));
  }

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', padding: '22px 16px', position: 'relative', overflow: 'hidden' }}>
      {/* drifting sparks */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="spark" style={{ position: 'absolute', top: `${12 + i * 14}%`, left: `${6 + i * 16}%`, width: 4, height: 4, borderRadius: '50%', background: i % 2 ? '#2FB6A8' : '#FFD27A', opacity: 0.4, filter: 'blur(1px)', animationDelay: `${i * 1.3}s` }} />
      ))}

      <header style={{ textAlign: 'center', marginBottom: 16, position: 'relative', zIndex: 2 }}>
        <Orb size={80} />
        <h1 style={{ fontSize: 26, letterSpacing: '0.18em', margin: '10px 0 0', fontWeight: 400, background: 'linear-gradient(90deg, #F4F1EA, #FFD27A, #2FB6A8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ClaudIA
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, fontStyle: 'italic', letterSpacing: '0.06em', color: 'rgba(244,241,234,.55)' }}>
          La Guardiana del Imperio · te tengo cubierta
        </p>
        {phase === 'ready' && <ModeBadge />}
      </header>

      <main style={{ maxWidth: 980, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {phase === 'loading' && <Centered>Despertando… 🌙</Centered>}

        {phase === 'signin' && (
          <Gate title="Entra al imperio">
            <p style={gateText}>ClaudIA te reconoce por tu FBID — una identidad, todos los mundos.</p>
            <button
              onClick={() => {
                window.location.href = hubRedirect('claudia', `${window.location.origin}/auth/callback`);
              }}
              style={primaryBtn}
            >
              Iniciar sesión con FlowBond
            </button>
          </Gate>
        )}

        {phase === 'enroll' && !recoveryPhrase && (
          <Gate title="Sella tu bóveda">
            <p style={gateText}>
              Lo que compartes con ClaudIA se guarda <strong>cifrado de extremo a extremo</strong>. Ni FlowBond
              ni nadie con acceso a la base de datos puede leerlo — solo tú, con tu llave. Vamos a crear esa llave.
            </p>
            <button onClick={doEnroll} disabled={busy} style={primaryBtn}>
              {busy ? 'Creando tu llave…' : 'Crear mi bóveda (passkey + frase)'}
            </button>
            {err && <ErrText>{friendly(err)}</ErrText>}
          </Gate>
        )}

        {phase === 'enroll' && recoveryPhrase && (
          <Gate title="Tu frase de recuperación">
            <p style={gateText}>
              Guárdala en un lugar seguro y privado. Es tu <strong>único respaldo</strong> si pierdes tu passkey —
              nadie puede regenerarla, ni siquiera ClaudIA. No la guardamos en ningún servidor.
            </p>
            <div style={{ ...card({ padding: 16 }), fontFamily: 'ui-monospace, monospace', fontSize: 14, lineHeight: 1.8, letterSpacing: '0.02em', wordSpacing: '0.3em', color: '#FFD27A' }}>
              {recoveryPhrase}
            </div>
            <button onClick={finishEnroll} style={primaryBtn}>
              La guardé — continuar
            </button>
          </Gate>
        )}

        {phase === 'unlock' && (
          <Gate title="Abre tu bóveda">
            {factors.includes('passkey') && (
              <button onClick={doUnlockPasskey} disabled={busy} style={primaryBtn}>
                {busy ? 'Verificando…' : 'Abrir con passkey'}
              </button>
            )}
            {factors.includes('recovery') && (
              <div style={{ marginTop: 14 }}>
                <p style={{ ...gateText, marginBottom: 8 }}>o usa tu frase de recuperación (24 palabras):</p>
                <textarea
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value)}
                  rows={3}
                  placeholder="palabra1 palabra2 …"
                  style={{ width: '100%', resize: 'none', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(244,241,234,.14)', borderRadius: 13, color: '#F4F1EA', padding: '11px 13px', fontSize: 14, fontFamily: 'ui-monospace, monospace' }}
                />
                <button onClick={doUnlockRecovery} disabled={busy || !recoveryInput.trim()} style={{ ...primaryBtn, marginTop: 8, opacity: busy || !recoveryInput.trim() ? 0.5 : 1 }}>
                  Abrir con frase
                </button>
              </div>
            )}
            {err && <ErrText>{friendly(err)}</ErrText>}
          </Gate>
        )}

        {phase === 'ready' && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <ChatPanel
              messages={messages}
              loading={sending}
              input={input}
              setInput={setInput}
              onSend={send}
              nudge={nudge}
              onCloseNudge={() => setNudge('')}
            />
            <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 260 }}>
              <CarePanel items={careItems} onLog={logCare} />
              <TaskPanel tasks={tasks} onToggle={toggleTask} />
            </div>
          </div>
        )}
      </main>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'rgba(244,241,234,.32)', letterSpacing: '0.05em', position: 'relative', zIndex: 2 }}>
        FlowMe · ClaudIA · Más Amor · zero-knowledge by design
      </p>
    </div>
  );
}

// ── small presentational helpers ────────────────────────────────────────────
function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...card({ padding: 28 }), maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ fontSize: 20, fontWeight: 400, margin: '0 0 14px', letterSpacing: '0.04em' }}>{title}</h2>
      {children}
    </div>
  );
}
function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{ textAlign: 'center', padding: 60, color: 'rgba(244,241,234,.55)', fontStyle: 'italic' }}>{children}</div>;
}
function ErrText({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#FF8A6B', fontSize: 13, marginTop: 12 }}>{children}</p>;
}
const gateText: React.CSSProperties = { fontSize: 14, lineHeight: 1.6, color: 'rgba(244,241,234,.7)', marginBottom: 18 };
const primaryBtn: React.CSSProperties = {
  display: 'inline-block',
  border: 'none',
  borderRadius: 13,
  padding: '12px 22px',
  cursor: 'pointer',
  fontSize: 15,
  fontWeight: 600,
  color: '#0E1A2B',
  background: 'linear-gradient(135deg, #FFD27A, #FF8A6B)',
  fontFamily: 'system-ui, sans-serif',
  textDecoration: 'none',
};
function friendly(code: string): string {
  const map: Record<string, string> = {
    'no-passkey-factor': 'No hay passkey en este dispositivo — usa tu frase de recuperación.',
    'no-recovery-factor': 'No se encontró una frase de recuperación sellada.',
    'invalid-recovery-phrase': 'Esa frase no es válida (revisa las 24 palabras).',
    'prf-unsupported': 'Este navegador/dispositivo no soporta passkeys PRF — usa la frase.',
    'passkeys-unavailable': 'Passkeys no disponibles aquí — usa la frase de recuperación.',
    'passkey-assert-cancelled': 'Se canceló la verificación de passkey.',
  };
  return map[code] ?? 'Algo se interrumpió. Intenta de nuevo — estoy aquí. 🌊';
}
