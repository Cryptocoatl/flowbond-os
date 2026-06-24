'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · Reuniones  (components/claudia/MeetingPanel.tsx)
//
//  She listens to a meeting — in the room (mic), an online call (tab audio), or
//  both — and takes the notes. The full chain honors her privacy model:
//    1. CAPTURE      audio → 16 kHz mono windows               (device)
//    2. TRANSCRIBE   Whisper WASM, on-device                    (device, no network)
//    3. STORE        each segment encrypted under a per-meeting DEK
//    4. SYNTHESIZE   decrypted transcript → digest via the blind ZDR relay
//    5. STORE        digest re-encrypted before it lands
//  The only cloud touch is step 4 — labeled honestly in the UI.
// ════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { card } from './CarePanel';
import { RoomChat } from './RoomChat';
import { getVault, type MeetingSource, type MeetingSummary } from '../../lib/claudia/client';
import { Transcriber, type LoadProgress } from '../../lib/claudia/transcribe';
import { startCapture, type CaptureHandle } from '../../lib/claudia/capture';
import { parseDigest, EMPTY_DIGEST, type MeetingDigest } from '../../lib/claudia/meeting-notes';

type Mode = 'idle' | 'recording' | 'review';

const SOURCES: { key: MeetingSource; label: string; icon: string; hint: string }[] = [
  { key: 'mic', label: 'En persona', icon: '🎙️', hint: 'micrófono de la sala' },
  { key: 'tab', label: 'En línea', icon: '🖥️', hint: 'audio de la pestaña/llamada' },
  { key: 'both', label: 'Ambos', icon: '🎧', hint: 'micrófono + llamada' },
];

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MeetingPanel() {
  const [mode, setMode] = useState<Mode>('idle');
  const [source, setSource] = useState<MeetingSource>('mic');
  const [loadMsg, setLoadMsg] = useState('');           // model load status
  const [segments, setSegments] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [synthesizing, setSynthesizing] = useState(false);
  const [digest, setDigest] = useState<MeetingDigest | null>(null);
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [err, setErr] = useState('');
  const [addedActions, setAddedActions] = useState<Set<number>>(new Set());
  const [sharedRooms, setSharedRooms] = useState<{ id: string; title: string; ownerId: string }[]>([]);
  const [viewingShared, setViewingShared] = useState(false);
  const [shareInput, setShareInput] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState<{ shared: number; failed: { fbid: string; reason: string }[] } | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  const transcriberRef = useRef<Transcriber | null>(null);
  const captureRef = useRef<CaptureHandle | null>(null);
  const meetingIdRef = useRef<string | null>(null);
  const idxRef = useRef(0);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t0Ref = useRef(0);

  const refreshMeetings = useCallback(async () => {
    try {
      const [mine, shared] = await Promise.all([
        getVault().listMeetings(),
        getVault().sharedMeetingRooms().catch(() => [] as { id: string; title: string; ownerId: string }[]),
      ]);
      setMeetings(mine);
      setSharedRooms(shared);
    } catch { /* noop */ }
  }, []);

  useEffect(() => { refreshMeetings(); }, [refreshMeetings]);

  // ── progress copy for the on-device model load ──────────────────────────
  const onProgress = useCallback((p: LoadProgress) => {
    if (p.status === 'ready') { setLoadMsg(''); return; }
    if (p.progress != null && p.file) {
      setLoadMsg(`Cargando modelo en tu dispositivo… ${Math.round(p.progress)}% (${p.file})`);
    } else if (p.status === 'initiate' || p.status === 'download') {
      setLoadMsg('Preparando el modelo en tu dispositivo…');
    }
  }, []);

  async function start() {
    setErr(''); setSegments([]); setDigest(null); setAddedActions(new Set());
    idxRef.current = 0;
    queueRef.current = Promise.resolve();
    try {
      setLoadMsg('Despertando el oído de ClaudIA…');
      const tr = transcriberRef.current ?? new Transcriber();
      transcriberRef.current = tr;
      await tr.init(onProgress);

      const meetingId = await getVault().createMeeting(source);
      meetingIdRef.current = meetingId;

      const handle = await startCapture(source, {
        onLevel: (rms) => setLevel(rms),
        onError: (e) => setErr(friendly(e.message)),
        onWindow: (audio, tOffset) => {
          const myIdx = idxRef.current++;
          // serialize transcription + persistence so segment order is stable
          queueRef.current = queueRef.current.then(async () => {
            try {
              const text = await tr.transcribe(audio);
              if (text) {
                setSegments((s) => [...s, text]);
                await getVault().saveMeetingSegment(meetingId, myIdx, tOffset, text);
              }
            } catch { /* drop a bad window, keep listening */ }
          });
        },
      });
      captureRef.current = handle;
      setLoadMsg('');
      setMode('recording');

      t0Ref.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((Date.now() - t0Ref.current) / 1000), 500);
    } catch (e) {
      setLoadMsg('');
      setErr(friendly((e as Error).message));
    }
  }

  async function stop() {
    captureRef.current?.stop();
    captureRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setLevel(0);
    // let any in-flight windows finish transcribing + saving
    await queueRef.current;
    if (meetingIdRef.current) await getVault().endMeeting(meetingIdRef.current);
    transcriberRef.current?.dispose();
    transcriberRef.current = null;
    setMode('review');
    refreshMeetings();
  }

  async function synthesize() {
    const transcript = segments.join(' ').trim();
    if (!transcript || synthesizing) return;
    setSynthesizing(true); setErr('');
    try {
      const res = await fetch('/api/claudia/notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'relay-failed');
      const d = parseDigest(data.raw || '');
      setDigest(d);
      const id = meetingIdRef.current;
      if (id) {
        await getVault().saveMeetingNotes(id, JSON.stringify(d));
        await getVault().endMeeting(id, d.title);
      }
      refreshMeetings();
    } catch (e) {
      setErr(friendly((e as Error).message));
    } finally {
      setSynthesizing(false);
    }
  }

  async function addAction(i: number, a: MeetingDigest['actions'][number]) {
    try {
      await getVault().captureTask({ title: a.title, venture: a.venture || 'FlowBond', ready: a.owner ? `Responsable: ${a.owner}` : '' });
      setAddedActions((s) => new Set(s).add(i));
    } catch { /* noop */ }
  }

  async function doShare() {
    const id = meetingIdRef.current;
    if (!id || sharing) return;
    const fbids = shareInput.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    if (!fbids.length) return;
    setSharing(true); setErr(''); setShareResult(null);
    try {
      const res = await getVault().shareMeetingRecap(id, fbids);
      setShareResult({ shared: res.shared.length, failed: res.failed });
      setRoomId(res.roomId);   // owner can now chat + mint invite links
      setShareInput('');
      refreshMeetings();
    } catch (e) {
      setErr(friendly((e as Error).message));
    } finally {
      setSharing(false);
    }
  }

  async function openSharedRoom(room: { id: string; title: string }) {
    setErr(''); meetingIdRef.current = null; setViewingShared(true); setShareResult(null);
    try {
      const json = await getVault().loadRoomRecap(room.id);
      setDigest(json ? parseDigest(json) : EMPTY_DIGEST);
      setSegments([]);
      setRoomId(room.id);
      setMode('review');
    } catch (e) {
      setViewingShared(false);
      setErr(friendly((e as Error).message));
    }
  }

  // Redeem an invite link parked by /invite/[token] (key was in the URL fragment).
  useEffect(() => {
    (async () => {
      let pending: { token?: string; linkKey?: string } | null = null;
      try { pending = JSON.parse(sessionStorage.getItem('claudia.pendingInvite') || 'null'); } catch { /* noop */ }
      if (!pending?.token || !pending?.linkKey) return;
      sessionStorage.removeItem('claudia.pendingInvite');
      try {
        const rid = await getVault().redeemInvite(pending.token, pending.linkKey);
        meetingIdRef.current = null; setViewingShared(true);
        const json = await getVault().loadRoomRecap(rid).catch(() => null);
        if (json) setDigest(parseDigest(json)); else setDigest(EMPTY_DIGEST);
        setRoomId(rid); setMode('review'); refreshMeetings();
      } catch (e) {
        setErr(friendly((e as Error).message));
      }
    })();
  }, [refreshMeetings]);

  async function openPast(m: MeetingSummary) {
    setErr(''); setViewingShared(false); setShareResult(null);
    meetingIdRef.current = m.id;
    try {
      if (m.hasNotes) {
        const json = await getVault().getMeetingNotes(m.id);
        setDigest(json ? parseDigest(json) : EMPTY_DIGEST);
        setSegments([]);
      } else {
        const segs = await getVault().loadMeetingSegments(m.id);
        setSegments(segs.map((s) => s.text));
        setDigest(null);
      }
      setMode('review');
    } catch (e) {
      setErr(friendly((e as Error).message));
    }
  }

  function reset() {
    setMode('idle'); setDigest(null); setSegments([]); meetingIdRef.current = null;
    setViewingShared(false); setShareResult(null); setShareInput(''); setRoomId(null);
    refreshMeetings();
  }

  useEffect(() => () => {
    captureRef.current?.stop();
    transcriberRef.current?.dispose();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div style={card({ flex: '1 1 380px', display: 'flex', flexDirection: 'column', minHeight: 460, padding: 18 })}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={heading}>Reuniones</h3>
        <span style={{ fontSize: 10.5, letterSpacing: '0.04em', color: 'rgba(244,241,234,.4)' }}>
          🔒 transcripción en tu dispositivo
        </span>
      </div>

      {err && <p style={{ color: '#FF8A6B', fontSize: 13, margin: '0 0 10px' }}>{err}</p>}

      {/* ── IDLE: choose source + start ─────────────────────────────────── */}
      {mode === 'idle' && (
        <>
          <p style={muted}>
            ClaudIA escucha y toma las notas. El audio se transcribe <strong>aquí, en tu dispositivo</strong> —
            nunca se sube. Solo la síntesis final pasa por su relé privado (Anthropic ZDR, sin registros).
          </p>
          <div style={{ display: 'flex', gap: 8, margin: '14px 0' }}>
            {SOURCES.map((s) => (
              <button
                key={s.key}
                onClick={() => setSource(s.key)}
                style={{
                  flex: 1, padding: '11px 8px', borderRadius: 13, cursor: 'pointer',
                  background: source === s.key ? 'rgba(47,182,168,.16)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${source === s.key ? 'rgba(47,182,168,.45)' : 'rgba(244,241,234,.12)'}`,
                  color: '#F4F1EA', fontFamily: 'inherit', textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontSize: 12.5, marginTop: 3 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: 'rgba(244,241,234,.45)', marginTop: 2 }}>{s.hint}</div>
              </button>
            ))}
          </div>
          {(source === 'tab' || source === 'both') && (
            <p style={{ ...muted, fontSize: 11.5 }}>
              Al compartir, elige la pestaña de la llamada y activa <strong>“Compartir audio de la pestaña”</strong>.
            </p>
          )}
          {loadMsg && <p style={{ ...muted, color: '#FFD27A' }}>{loadMsg}</p>}
          <button onClick={start} className="cine-cta" style={{ marginTop: 6 }}>
            Empezar a escuchar ✦
          </button>

          {meetings.length > 0 && <PastList meetings={meetings} onOpen={openPast} />}
          {sharedRooms.length > 0 && <SharedList rooms={sharedRooms} onOpen={openSharedRoom} />}
        </>
      )}

      {/* ── RECORDING: live transcript ──────────────────────────────────── */}
      {mode === 'recording' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span className="rec-dot" style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF8A6B', boxShadow: '0 0 10px #FF8A6B' }} />
            <span style={{ fontSize: 13.5 }}>Escuchando · {fmtClock(elapsed)}</span>
            <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.round(level * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#2FB6A8,#FFD27A)', transition: 'width .12s' }} />
            </div>
          </div>
          <TranscriptView segments={segments} live placeholder="Las palabras aparecerán aquí conforme se transcriben en tu dispositivo…" />
          <button onClick={stop} className="cine-cta" style={{ marginTop: 12, background: 'linear-gradient(135deg,#FF8A6B,#FFD27A)' }}>
            Terminar y guardar
          </button>
        </>
      )}

      {/* ── REVIEW: transcript + synthesize + digest ────────────────────── */}
      {mode === 'review' && (
        <>
          {!digest && (
            <>
              <TranscriptView segments={segments} placeholder="(Sin transcripción para esta reunión.)" />
              <button onClick={synthesize} disabled={synthesizing || !segments.length} className="cine-cta" style={{ marginTop: 12 }}>
                {synthesizing ? 'ClaudIA está redactando las notas…' : 'Sintetizar notas con ClaudIA ✦'}
              </button>
              <p style={{ ...muted, fontSize: 11, marginTop: 8 }}>
                La síntesis envía la transcripción a su relé privado (ZDR, sin registros) solo para este paso.
              </p>
            </>
          )}
          {digest && <Digest d={digest} addedActions={addedActions} onAddAction={addAction} />}
          {digest && !viewingShared && meetingIdRef.current && (
            <ShareBox value={shareInput} setValue={setShareInput} onShare={doShare} sharing={sharing} result={shareResult} />
          )}
          {viewingShared && (
            <p style={{ ...muted, fontSize: 11.5, marginTop: 10 }}>
              🔒 Compartida contigo · descifrada con tu llave. Puedes guardar las acciones en tus tareas.
            </p>
          )}
          {roomId && <RoomChat roomId={roomId} canInvite={!viewingShared} />}
          <button onClick={reset} style={ghostBtn}>← Volver</button>
        </>
      )}
    </div>
  );
}

// ── transcript scroll view ──────────────────────────────────────────────────
function TranscriptView({ segments, live, placeholder }: { segments: string[]; live?: boolean; placeholder: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (live && ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [segments, live]);
  return (
    <div ref={ref} className="scroll" style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,.18)', border: '1px solid rgba(244,241,234,.08)', borderRadius: 13, padding: 14, minHeight: 200, fontSize: 14, lineHeight: 1.6 }}>
      {segments.length ? segments.join(' ') : <span style={{ color: 'rgba(244,241,234,.4)' }}>{placeholder}</span>}
    </div>
  );
}

// ── the structured digest ────────────────────────────────────────────────────
function Digest({ d, addedActions, onAddAction }: {
  d: MeetingDigest;
  addedActions: Set<number>;
  onAddAction: (i: number, a: MeetingDigest['actions'][number]) => void;
}) {
  return (
    <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
      <h4 style={{ fontSize: 17, fontWeight: 400, margin: '0 0 8px', color: '#FFD27A' }}>{d.title}</h4>
      {d.summary && <p style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 14px', color: 'rgba(244,241,234,.85)' }}>{d.summary}</p>}

      {d.actions.length > 0 && (
        <Section title="Acciones">
          {d.actions.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
              <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.5 }}>
                ▸ {a.title}
                {(a.owner || a.venture) && (
                  <span style={{ color: 'rgba(244,241,234,.45)', fontSize: 11.5 }}>
                    {a.owner ? `  ·  ${a.owner}` : ''}{a.venture ? `  ·  ${a.venture}` : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => onAddAction(i, a)}
                disabled={addedActions.has(i)}
                style={{ ...miniBtn, opacity: addedActions.has(i) ? 0.5 : 1 }}
              >
                {addedActions.has(i) ? '✓ tarea' : '+ tarea'}
              </button>
            </div>
          ))}
        </Section>
      )}

      {d.decisions.length > 0 && <BulletSection title="Decisiones" items={d.decisions} />}
      {d.questions.length > 0 && <BulletSection title="Preguntas abiertas" items={d.questions} />}
      {d.topics.length > 0 && <BulletSection title="Temas" items={d.topics} />}
      {d.highlights.length > 0 && <BulletSection title="Destacados" items={d.highlights} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={sectionHead}>{title}</div>
      {children}
    </div>
  );
}
function BulletSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title}>
      {items.map((it, i) => (
        <div key={i} style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 5, color: 'rgba(244,241,234,.85)' }}>• {it}</div>
      ))}
    </Section>
  );
}

function PastList({ meetings, onOpen }: { meetings: MeetingSummary[]; onOpen: (m: MeetingSummary) => void }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={sectionHead}>Reuniones pasadas</div>
      {meetings.map((m) => (
        <button key={m.id} onClick={() => onOpen(m)} style={pastRow}>
          <span style={{ fontSize: 16 }}>{m.source === 'tab' ? '🖥️' : m.source === 'both' ? '🎧' : '🎙️'}</span>
          <span style={{ flex: 1, textAlign: 'left', fontSize: 13.5 }}>
            {m.title || 'Reunión sin título'}
            <span style={{ display: 'block', fontSize: 11, color: 'rgba(244,241,234,.4)' }}>
              {new Date(m.startedAt).toLocaleString()}{m.hasNotes ? '  ·  notas listas' : ''}
            </span>
          </span>
          <span style={{ fontSize: 16, color: 'rgba(244,241,234,.4)' }}>›</span>
        </button>
      ))}
    </div>
  );
}

function ShareBox({ value, setValue, onShare, sharing, result }: {
  value: string;
  setValue: (v: string) => void;
  onShare: () => void;
  sharing: boolean;
  result: { shared: number; failed: { fbid: string; reason: string }[] } | null;
}) {
  return (
    <div style={{ marginTop: 14, borderTop: '1px solid rgba(244,241,234,.1)', paddingTop: 14 }}>
      <div style={sectionHead}>Compartir recap</div>
      <p style={{ ...muted, fontSize: 11.5, marginBottom: 8 }}>
        Pega los FBID con quienes compartir. Se cifra <strong>para cada persona</strong> — el servidor nunca lo lee.
        (Cada persona debe haber abierto ClaudIA al menos una vez.)
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        placeholder="fbid-1  fbid-2  …"
        style={{ width: '100%', resize: 'none', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(244,241,234,.14)', borderRadius: 12, color: '#F4F1EA', padding: '10px 12px', fontSize: 13, fontFamily: 'ui-monospace, monospace' }}
      />
      <button onClick={onShare} disabled={sharing || !value.trim()} className="cine-cta" style={{ marginTop: 8 }}>
        {sharing ? 'Compartiendo…' : 'Compartir ✦'}
      </button>
      {result && (
        <div style={{ marginTop: 8, fontSize: 12.5 }}>
          {result.shared > 0 && <div style={{ color: '#2FB6A8' }}>✓ Compartido con {result.shared} persona(s).</div>}
          {result.failed.map((f, i) => (
            <div key={i} style={{ color: '#FF8A6B' }}>
              ⚠ {f.fbid.slice(0, 8)}…: {f.reason === 'peer-has-no-identity-key' ? 'aún no ha abierto ClaudIA' : f.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SharedList({ rooms, onOpen }: {
  rooms: { id: string; title: string; ownerId: string }[];
  onOpen: (r: { id: string; title: string }) => void;
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={sectionHead}>Compartidas contigo</div>
      {rooms.map((r) => (
        <button key={r.id} onClick={() => onOpen(r)} style={pastRow}>
          <span style={{ fontSize: 16 }}>🤝</span>
          <span style={{ flex: 1, textAlign: 'left', fontSize: 13.5 }}>
            {r.title}
            <span style={{ display: 'block', fontSize: 11, color: 'rgba(244,241,234,.4)' }}>recap compartido contigo</span>
          </span>
          <span style={{ fontSize: 16, color: 'rgba(244,241,234,.4)' }}>›</span>
        </button>
      ))}
    </div>
  );
}

function friendly(code: string): string {
  const map: Record<string, string> = {
    'no-notes-to-share': 'Primero sintetiza las notas de esta reunión, luego puedes compartir el recap.',
    'peer-has-no-identity-key': 'Esa persona aún no ha abierto ClaudIA — pídele que entre una vez y vuelve a compartir.',
    'not-a-room-member': 'No tienes acceso a este recap compartido.',
    'invite-invalid': 'Este enlace de invitación expiró, fue revocado o ya no es válido.',
    'identity-not-ready': 'Tu llave de identidad aún no está lista — recarga e intenta de nuevo.',
    'no-tab-audio': 'No se compartió el audio de la pestaña — vuelve a intentar y activa “Compartir audio de la pestaña”.',
    'transcribe-worker-error': 'No se pudo cargar el modelo de transcripción (revisa tu conexión la primera vez).',
    'transcriber-not-ready': 'El oído de ClaudIA aún no está listo — intenta de nuevo.',
    'relay-unconfigured': 'La síntesis no está configurada en este entorno todavía.',
    'relay-failed': 'La síntesis se interrumpió — intenta de nuevo.',
    'NotAllowedError': 'Necesito permiso para escuchar el audio. Concede el acceso y vuelve a intentar.',
    'NotFoundError': 'No encontré un micrófono disponible.',
  };
  return map[code] ?? 'Algo se interrumpió. Intenta de nuevo — estoy aquí. 🌊';
}

// ── styles ────────────────────────────────────────────────────────────────────
const heading: React.CSSProperties = {
  margin: 0, fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase',
  color: 'rgba(244,241,234,.5)', fontWeight: 400,
};
const muted: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, color: 'rgba(244,241,234,.65)', margin: '0 0 4px' };
const sectionHead: React.CSSProperties = {
  fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: '#2FB6A8', marginBottom: 7, fontWeight: 500,
};
const miniBtn: React.CSSProperties = {
  border: '1px solid #2FB6A8', background: 'rgba(47,182,168,.12)', color: '#2FB6A8',
  borderRadius: 8, padding: '3px 9px', fontSize: 11, cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap',
};
const ghostBtn: React.CSSProperties = {
  marginTop: 12, alignSelf: 'flex-start', border: '1px solid rgba(244,241,234,.18)',
  background: 'transparent', color: 'rgba(244,241,234,.7)', borderRadius: 11,
  padding: '7px 14px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
};
const pastRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 11px',
  marginBottom: 7, borderRadius: 12, background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(244,241,234,.08)', color: '#F4F1EA', cursor: 'pointer', fontFamily: 'inherit',
};
