'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · floating VOICE DOCK  (components/claudia/ClaudiaDock.tsx)
//
//  Her always-present bubble. Tap it and talk — hands-free. She listens with
//  the on-device Web Speech API, auto-sends when you pause, replies aloud in
//  her coral voice (/api/claudia/voice), then re-opens the mic so it's a real
//  back-and-forth conversation — no typing, no send button.
//
//  Privacy boundary is identical to typing: the recognized text is encrypted
//  into the vault the moment it's sent (the send pipeline lives in ClaudiaApp;
//  this dock only calls the onSend it was handed). Audio is never stored.
//
//  Hands-free loop: mic listens → on a final phrase + short pause it auto-sends
//  → mic pauses while she thinks/speaks → mic re-opens when she goes quiet.
//  A manual mic tap always overrides. Everything degrades gracefully if the
//  browser lacks SpeechRecognition (falls back to the typed ChatPanel).
// ════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../lib/claudia/client';
import { dictationSupported } from '../../lib/claudia/listen';

// Minimal Web Speech typings (not in the standard TS lib).
interface SpeechAlt { transcript: string }
interface SpeechResult { 0: SpeechAlt; isFinal: boolean }
interface SpeechResultList { length: number; [i: number]: SpeechResult }
interface SpeechEvent { resultIndex: number; results: SpeechResultList }
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
}
type RecognitionCtor = new () => Recognition;
function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

type Props = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  sending: boolean;
  voiceOn: boolean;
  onToggleVoice: () => void;
  speakLevel: number; // 0..1, >0 while she's talking
};

export function ClaudiaDock({ messages, onSend, sending, voiceOn, onToggleVoice, speakLevel }: Props) {
  const [open, setOpen] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [supported] = useState(dictationSupported);

  const recRef = useRef<Recognition | null>(null);
  const handsFreeRef = useRef(false);
  const sendingRef = useRef(sending);
  const speakingRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  handsFreeRef.current = handsFree;
  sendingRef.current = sending;
  speakingRef.current = speakLevel > 0.02;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const last = messages[messages.length - 1];

  const stopRec = useCallback(() => {
    const r = recRef.current;
    if (r) { try { r.stop(); } catch { /* already stopped */ } }
  }, []);

  const startRec = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || recRef.current) return;
    const r = new Ctor();
    r.lang = 'es-MX';
    r.continuous = false;      // one utterance at a time — cleaner auto-send
    r.interimResults = true;
    let finalText = '';

    r.onresult = (e) => {
      let fin = '';
      let itr = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const t = res[0]?.transcript ?? '';
        if (res.isFinal) fin += t; else itr += t;
      }
      if (fin) finalText = (finalText + ' ' + fin).trim();
      setInterim((finalText + ' ' + itr).trim());
    };
    r.onerror = () => { /* end handler cleans up + decides on resume */ };
    r.onend = () => {
      recRef.current = null;
      setListening(false);
      const said = finalText.trim();
      setInterim('');
      if (said) {
        onSend(said);        // auto-send — she'll reply (and speak if voiceOn)
      } else if (handsFreeRef.current && !sendingRef.current && !speakingRef.current) {
        // heard nothing — keep the mic warm so she stays listening
        scheduleResume();
      }
    };

    recRef.current = r;
    try { r.start(); setListening(true); } catch { recRef.current = null; setListening(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSend]);

  const scheduleResume = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      if (handsFreeRef.current && !sendingRef.current && !speakingRef.current && !recRef.current) {
        startRec();
      }
    }, 500);
  }, [startRec]);

  // Turn hands-free on/off. On → make sure voice is on (so it's a real convo).
  const toggleHandsFree = useCallback(() => {
    setHandsFree((on) => {
      const next = !on;
      if (next) {
        if (!voiceOn) onToggleVoice();
        startRec();
      } else {
        stopRec();
        if (resumeTimer.current) clearTimeout(resumeTimer.current);
      }
      return next;
    });
  }, [voiceOn, onToggleVoice, startRec, stopRec]);

  // After she finishes replying (sending false) and goes quiet, re-open the mic.
  useEffect(() => {
    if (handsFree && !sending && speakLevel <= 0.02 && !listening && !recRef.current) {
      scheduleResume();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handsFree, sending, speakLevel, listening]);

  // Cleanup on unmount.
  useEffect(() => () => {
    const r = recRef.current;
    if (r) { try { r.abort(); } catch { /* noop */ } }
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  // Autoscroll the mini-transcript.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, interim, sending]);

  const glow = 0.3 + speakLevel * 0.6;
  const scale = 1 + speakLevel * 0.16;

  return (
    <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, pointerEvents: 'none' }}>
      {/* ── conversation panel ─────────────────────────────────────────────── */}
      {open && (
        <div
          className="cine-rise"
          style={{
            pointerEvents: 'auto',
            width: 'min(360px, calc(100vw - 32px))',
            background: 'rgba(14,26,43,.86)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(255,210,122,.22)',
            borderRadius: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,.5)',
            overflow: 'hidden',
          }}
        >
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid rgba(244,241,234,.1)' }}>
            <img src="/claudia-portrait.png" alt="ClaudIA" width={30} height={30} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 26%', border: '1.5px solid rgba(255,210,122,.5)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, letterSpacing: '0.06em', color: '#F4F1EA' }}>ClaudIA</div>
              <div style={{ fontSize: 10.5, color: 'rgba(244,241,234,.5)', fontStyle: 'italic' }}>
                {listening ? 'Te escucho…' : sending ? 'Pensando…' : speakLevel > 0.02 ? 'Hablando…' : handsFree ? 'Manos libres · lista' : 'Aquí estoy'}
              </div>
            </div>
            <button onClick={onToggleVoice} title={voiceOn ? 'Silenciar voz' : 'Darle voz'} aria-label="voz"
              style={dockIconBtn(voiceOn)}>{voiceOn ? '🔊' : '🔇'}</button>
            <button onClick={() => setOpen(false)} title="Cerrar" aria-label="cerrar" style={dockIconBtn(false)}>✕</button>
          </div>

          {/* mini transcript — last few turns */}
          <div ref={scrollRef} style={{ maxHeight: 260, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {messages.slice(-8).map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
                <div style={{
                  fontSize: 13, lineHeight: 1.5, padding: '8px 11px', borderRadius: 13, whiteSpace: 'pre-wrap',
                  color: m.role === 'user' ? '#0E1A2B' : '#F4F1EA',
                  background: m.role === 'user' ? 'linear-gradient(135deg,#FFD27A,#2FB6A8)' : 'rgba(255,255,255,.05)',
                  border: m.role === 'user' ? 'none' : '1px solid rgba(244,241,234,.1)',
                }}>{m.text}</div>
              </div>
            ))}
            {interim && (
              <div style={{ alignSelf: 'flex-end', maxWidth: '86%' }}>
                <div style={{ fontSize: 13, lineHeight: 1.5, padding: '8px 11px', borderRadius: 13, color: 'rgba(14,26,43,.75)', background: 'rgba(255,210,122,.55)', fontStyle: 'italic' }}>{interim}…</div>
              </div>
            )}
            {sending && !interim && (
              <div style={{ alignSelf: 'flex-start', color: 'rgba(244,241,234,.4)', fontSize: 18, letterSpacing: 2 }}>···</div>
            )}
          </div>

          {/* mic bar */}
          <div style={{ padding: '11px 14px', borderTop: '1px solid rgba(244,241,234,.1)', display: 'flex', alignItems: 'center', gap: 11 }}>
            {supported ? (
              <>
                <button
                  onClick={toggleHandsFree}
                  aria-label="manos libres"
                  style={{
                    width: 46, height: 46, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, fontSize: 20,
                    display: 'grid', placeItems: 'center', fontFamily: 'inherit', transition: 'box-shadow .1s',
                    color: handsFree ? '#0E1A2B' : 'rgba(244,241,234,.8)',
                    background: handsFree ? 'linear-gradient(135deg,#FFD27A,#2FB6A8)' : 'rgba(255,255,255,.06)',
                    border: `1px solid ${handsFree ? 'transparent' : 'rgba(244,241,234,.16)'}`,
                    boxShadow: listening ? '0 0 0 4px rgba(47,182,168,.28)' : 'none',
                  }}
                >🎙️</button>
                <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.4, color: 'rgba(244,241,234,.6)' }}>
                  {handsFree
                    ? (listening ? 'Habla — te envío cuando hagas una pausa.' : 'Manos libres activo. Espera mi turno o vuelve a hablar.')
                    : 'Toca el micrófono y hablemos — manos libres.'}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: 'rgba(244,241,234,.6)', lineHeight: 1.4 }}>
                Tu navegador no soporta dictado por voz. Escríbeme en la Conversación — te escucho igual. 🌊
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── the bubble ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Abrir a ClaudIA"
        title="Habla con ClaudIA"
        style={{
          pointerEvents: 'auto', position: 'relative',
          width: 62, height: 62, borderRadius: '50%', cursor: 'pointer', padding: 0, flexShrink: 0,
          border: '2px solid rgba(255,210,122,.6)', overflow: 'hidden', background: '#0E1A2B',
          boxShadow: `0 0 ${20 + speakLevel * 44}px rgba(255,210,122,${glow})`,
          transform: `scale(${scale})`, transition: 'transform .08s linear, box-shadow .08s linear',
        }}
      >
        <img src="/claudia-portrait.png" alt="ClaudIA" width={62} height={62} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 26%' }} />
        {/* listening ring */}
        {listening && (
          <span style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: '2px solid #2FB6A8', animation: 'claudiaPulse 1.2s ease-out infinite' }} />
        )}
        {/* status dot */}
        <span style={{ position: 'absolute', right: 2, bottom: 2, width: 14, height: 14, borderRadius: '50%', border: '2px solid #0E1A2B', background: handsFree ? '#2FB6A8' : voiceOn ? '#FFD27A' : 'rgba(244,241,234,.4)' }} />
      </button>

      <style>{`@keyframes claudiaPulse{0%{transform:scale(1);opacity:.9}100%{transform:scale(1.5);opacity:0}}`}</style>
    </div>
  );
}

function dockIconBtn(active: boolean): React.CSSProperties {
  return {
    width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, fontSize: 13,
    display: 'grid', placeItems: 'center', fontFamily: 'inherit',
    color: active ? '#0E1A2B' : 'rgba(244,241,234,.7)',
    background: active ? 'linear-gradient(135deg,#FFD27A,#2FB6A8)' : 'rgba(255,255,255,.05)',
    border: `1px solid ${active ? 'transparent' : 'rgba(244,241,234,.14)'}`,
  };
}
