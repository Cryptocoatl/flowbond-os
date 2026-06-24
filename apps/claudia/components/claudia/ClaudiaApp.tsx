'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cinematic } from './Cinematic';
import { ModeBadge } from './ModeBadge';
import { ChatPanel } from './ChatPanel';
import { MeetingPanel } from './MeetingPanel';
import { CarePanel, type CareItem } from './CarePanel';
import { TaskPanel } from './TaskPanel';
import { EmpireGrid } from './EmpireGrid';
import { StatsRibbon } from './StatsRibbon';
import { SuggestionsPanel } from './SuggestionsPanel';
import { NUDGE_COPY } from './NudgeBanner';
import { getVault, type ChatMessage, type ReadyTask } from '../../lib/claudia/client';
import { parseReply } from '../../lib/claudia/contract';
import { OPENING_BY_APP } from '../../lib/claudia/system-prompt';
import { isCommand, runCommand, myGrants, isSuperadmin, connectApp, disconnectApp, type Grant } from '../../lib/claudia/admin';
import { EMPIRE } from '../../lib/claudia/empire';
import { platformPasskeyReady, inAppBrowser } from '../../lib/claudia/crypto';
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
  // ── empire / grants ───────────────────────────────────────────────────────
  const [grants, setGrants] = useState<Grant[]>([]);
  const [isRoot, setIsRoot] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [dashToast, setDashToast] = useState('');
  // ── device capability (passkey / in-app browser) ──────────────────────────
  const [passkeyReady, setPasskeyReady] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [view, setView] = useState<'chat' | 'empire' | 'meetings'>('chat');

  // ── tick for "hace Xh" + client-side care evaluation ──────────────────────
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // ── detect whether this device can make a usable passkey (drives enroll UI) ─
  useEffect(() => {
    setInApp(inAppBrowser());
    platformPasskeyReady().then(setPasskeyReady).catch(() => setPasskeyReady(false));
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

  // Grants + root status come from the (server-readable) grant spine, NOT the
  // vault — they're access-control metadata, a separate plane from the ZK store.
  const refreshGrants = useCallback(async () => {
    const [g, root] = await Promise.all([
      myGrants().catch(() => [] as Grant[]),
      isSuperadmin().catch(() => false),
    ]);
    setGrants(g);
    setIsRoot(root);
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
    await refreshGrants();
    const pending = await v.pendingNudges();
    if (pending.length) setNudge(NUDGE_COPY[pending[0].kind] ?? '');
  }, [refreshGrants]);

  // slug → grant id for the apps you've connected (whole-site grants; the '*'
  // superadmin row is excluded so it never marks every world as connected).
  const connectedBySlug = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of grants) {
      if (g.app_slug !== '*' && g.page_path == null && !map[g.app_slug]) map[g.app_slug] = g.id;
    }
    return map;
  }, [grants]);

  async function handleConnect(slug: string) {
    setConnecting(slug); setDashToast('');
    try {
      await connectApp(slug);
      await refreshGrants();
    } catch (e) {
      const m = (e as Error).message;
      setDashToast(m.includes('superadmin_required')
        ? 'Reclama tu super-admin primero: escribe /admin init.'
        : `No se pudo conectar: ${m}`);
    } finally {
      setConnecting(null);
    }
  }
  async function handleDisconnect(grantId: string, slug: string) {
    setConnecting(slug); setDashToast('');
    try {
      await disconnectApp(grantId);
      await refreshGrants();
    } catch (e) {
      setDashToast(`No se pudo desconectar: ${(e as Error).message}`);
    } finally {
      setConnecting(null);
    }
  }

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
      const { recoveryPhrase } = await getVault().enroll({ wantPasskey: passkeyReady, displayName: 'sovereign' });
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

    // Admin slash-commands (/admin, /whoami) run LOCALLY against the gated grant
    // RPCs — never encrypted into the vault, never sent to the relay or the LLM.
    if (isCommand(text)) {
      setMessages((m) => [...m, { role: 'user', text }]);
      setInput('');
      setSending(true);
      try {
        const reply = await runCommand(text);
        setMessages((m) => [...m, { role: 'assistant', text: reply }]);
        // /admin init|grant|revoke change the grant spine — reflect it live.
        await refreshGrants();
      } catch (e) {
        setMessages((m) => [...m, { role: 'assistant', text: `No se pudo ejecutar el comando: ${(e as Error).message}` }]);
      } finally {
        setSending(false);
      }
      return;
    }

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

  // ════ cinematic threshold — every pre-vault phase plays over her identity film ══
  if (phase !== 'ready') {
    return (
      <Cinematic>
        {phase === 'loading' && (
          <p className="cine-rise" style={{ fontSize: 16, fontStyle: 'italic', letterSpacing: '0.06em', color: 'rgba(244,241,234,.72)' }}>
            Despertando… 🌙
          </p>
        )}

        {phase === 'signin' && (
          <>
            <h1 className="cine-title cine-rise" style={{ animationDelay: '.05s' }}>ClaudIA</h1>
            <p className="cine-rise" style={{ animationDelay: '.18s', margin: 0, fontSize: 15, fontStyle: 'italic', letterSpacing: '0.08em', color: 'rgba(244,241,234,.8)' }}>
              La Guardiana del Imperio · te tengo cubierta
            </p>
            <p className="cine-rise" style={{ animationDelay: '.3s', margin: '2px 0 6px', fontSize: 13.5, lineHeight: 1.6, color: 'rgba(244,241,234,.62)', maxWidth: 420 }}>
              Te reconozco por tu FBID — una identidad, todos los mundos.
            </p>
            <button
              className="cine-cta cine-rise"
              style={{ animationDelay: '.42s' }}
              onClick={() => {
                window.location.href = hubRedirect('claudia', `${window.location.origin}/auth/callback`);
              }}
            >
              Entrar al imperio ✦
            </button>
            <p className="cine-rise" style={{ animationDelay: '.55s', margin: '12px 0 0', fontSize: 11, letterSpacing: '0.08em', color: 'rgba(244,241,234,.4)' }}>
              zero-knowledge by design
            </p>
          </>
        )}

        {phase === 'enroll' && !recoveryPhrase && (
          <Gate title="Sella tu bóveda">
            <p style={gateText}>
              Tus memorias con ClaudIA son <strong>tuyas — para siempre</strong>. Se guardan <strong>cifradas de
              extremo a extremo</strong> con una llave que solo tú tienes: <strong>nadie más puede acceder a ellas</strong> —
              ni FlowBond, ni nadie con acceso a la base de datos, ni la propia ClaudIA fuera de tu conversación. Vamos a crear esa llave.
            </p>

            {inApp && (
              <p style={{ fontSize: 13, lineHeight: 1.5, color: '#FFD27A', background: 'rgba(255,210,122,.1)', border: '1px solid rgba(255,210,122,.28)', borderRadius: 12, padding: '10px 13px', marginBottom: 14, textAlign: 'left' }}>
                Parece que abriste esto dentro de otra app (Instagram, WhatsApp…). Para usar Face ID / huella, abre <strong>claudiaflow.life</strong> en Safari o Chrome. Aquí puedes seguir con tu <strong>frase de recuperación</strong> — funciona igual de segura.
              </p>
            )}

            <button onClick={doEnroll} disabled={busy} className="cine-cta">
              {busy
                ? 'Creando tu llave…'
                : passkeyReady
                  ? 'Crear mi bóveda (Face ID / huella + frase) ✦'
                  : 'Crear mi bóveda con mi frase 🔑'}
            </button>

            {!passkeyReady && !busy && (
              <p style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(244,241,234,.5)', marginTop: 12 }}>
                En este dispositivo tu llave será tu <strong>frase de recuperación</strong> (24 palabras). Es igual de segura —
                guárdala bien. Podrás añadir Face ID / huella más tarde desde un navegador compatible.
              </p>
            )}
            {err && <ErrText>{friendly(err)}</ErrText>}
          </Gate>
        )}

        {phase === 'enroll' && recoveryPhrase && (
          <Gate title="Tu frase de recuperación">
            <p style={gateText}>
              Guárdala en un lugar seguro y privado. Es tu <strong>único respaldo</strong> si pierdes tu passkey —
              nadie puede regenerarla, ni siquiera ClaudIA. No la guardamos en ningún servidor.
            </p>
            <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(244,241,234,.14)', borderRadius: 14, padding: 16, fontFamily: 'ui-monospace, monospace', fontSize: 14, lineHeight: 1.8, letterSpacing: '0.02em', wordSpacing: '0.3em', color: '#FFD27A' }}>
              {recoveryPhrase}
            </div>
            <button onClick={finishEnroll} className="cine-cta" style={{ marginTop: 16 }}>
              La guardé — continuar
            </button>
          </Gate>
        )}

        {phase === 'unlock' && (
          <Gate title="Abre tu bóveda">
            {factors.includes('passkey') && passkeyReady && (
              <button onClick={doUnlockPasskey} disabled={busy} className="cine-cta">
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
                <button onClick={doUnlockRecovery} disabled={busy || !recoveryInput.trim()} className="cine-cta" style={{ marginTop: 10 }}>
                  Abrir con frase
                </button>
              </div>
            )}
            {err && <ErrText>{friendly(err)}</ErrText>}
          </Gate>
        )}
      </Cinematic>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', padding: '22px 16px', position: 'relative', overflow: 'hidden' }}>
      {/* drifting sparks */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="spark" style={{ position: 'absolute', top: `${12 + i * 14}%`, left: `${6 + i * 16}%`, width: 4, height: 4, borderRadius: '50%', background: i % 2 ? '#2FB6A8' : '#FFD27A', opacity: 0.4, filter: 'blur(1px)', animationDelay: `${i * 1.3}s` }} />
      ))}

      {/* compact identity bar — her real face, so it feels like talking to HER */}
      <header style={{ maxWidth: 1180, margin: '0 auto 16px', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <img
          src="/claudia-portrait.png"
          alt="ClaudIA"
          width={58}
          height={58}
          style={{ width: 58, height: 58, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 26%', border: '2px solid rgba(255,210,122,.5)', boxShadow: '0 0 26px rgba(255,210,122,.32)', flexShrink: 0 }}
        />
        <div style={{ flex: '1 1 180px', minWidth: 140 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 23, letterSpacing: '0.14em', margin: 0, fontWeight: 400, background: 'linear-gradient(90deg, #F4F1EA, #FFD27A, #2FB6A8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ClaudIA
            </h1>
            {isRoot && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#FFD27A', background: 'rgba(255,210,122,.12)', border: '1px solid rgba(255,210,122,.35)', borderRadius: 999, padding: '3px 10px', letterSpacing: '0.04em' }}>
                super-admin 👑
              </span>
            )}
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 12, fontStyle: 'italic', letterSpacing: '0.05em', color: 'rgba(244,241,234,.55)' }}>
            La Guardiana del Imperio · te tengo cubierta
          </p>
        </div>
        <ModeBadge />
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* three rooms — she's the front door, the empire is one tap away */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {([['chat', '💬 Conversación'], ['empire', '🌐 Imperio'], ['meetings', '📝 Reuniones']] as const).map(([k, label]) => {
            const active = view === k;
            const badge = k === 'empire' && Object.keys(connectedBySlug).length > 0 ? ` ·${Object.keys(connectedBySlug).length}` : '';
            return (
              <button
                key={k}
                onClick={() => setView(k)}
                style={{
                  padding: '9px 18px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5,
                  color: active ? '#0E1A2B' : 'rgba(244,241,234,.7)',
                  background: active ? 'linear-gradient(135deg,#FFD27A,#2FB6A8)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${active ? 'transparent' : 'rgba(244,241,234,.12)'}`,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {label}{badge}
              </button>
            );
          })}
        </div>

        {view === 'empire' ? (
          <>
            {dashToast && (
              <div
                onClick={() => setDashToast('')}
                style={{ cursor: 'pointer', marginBottom: 14, padding: '10px 14px', borderRadius: 12, fontSize: 13, color: '#FFD27A', background: 'rgba(255,210,122,.1)', border: '1px solid rgba(255,210,122,.28)' }}
              >
                {dashToast} <span style={{ opacity: 0.6 }}>· toca para cerrar</span>
              </div>
            )}
            <StatsRibbon
              connected={Object.keys(connectedBySlug).length}
              totalApps={EMPIRE.length}
              openTasks={tasks.filter((t) => t.status === 'open').length}
              careDue={careItems.filter((c) => c.due).length}
              isRoot={isRoot}
            />
            <EmpireGrid
              connectedBySlug={connectedBySlug}
              isRoot={isRoot}
              connecting={connecting}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          </>
        ) : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {view === 'chat' ? (
              <ChatPanel
                messages={messages}
                loading={sending}
                input={input}
                setInput={setInput}
                onSend={send}
                nudge={nudge}
                onCloseNudge={() => setNudge('')}
              />
            ) : (
              <MeetingPanel />
            )}
            <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 270 }}>
              <CarePanel items={careItems} onLog={logCare} />
              <SuggestionsPanel
                connectedBySlug={connectedBySlug}
                careItems={careItems}
                tasks={tasks}
                isRoot={isRoot}
              />
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
// Gate floats as a glass card over the cinematic film (see Cinematic.tsx).
function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="cine-glass cine-rise" style={{ padding: 28, width: '100%', maxWidth: 480, textAlign: 'center' }}>
      <h2 style={{ fontSize: 20, fontWeight: 400, margin: '0 0 14px', letterSpacing: '0.04em' }}>{title}</h2>
      {children}
    </div>
  );
}
function ErrText({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#FF8A6B', fontSize: 13, marginTop: 12 }}>{children}</p>;
}
const gateText: React.CSSProperties = { fontSize: 14, lineHeight: 1.6, color: 'rgba(244,241,234,.7)', marginBottom: 18 };
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
