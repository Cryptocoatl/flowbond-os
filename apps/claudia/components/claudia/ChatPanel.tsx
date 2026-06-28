'use client';

import { useEffect, useRef, useState } from 'react';
import { card } from './CarePanel';
import { NudgeBanner } from './NudgeBanner';
import { useDictation, type DictationLang } from '../../lib/claudia/listen';
import type { ChatMessage } from '../../lib/claudia/client';

export function ChatPanel({
  messages, loading, input, setInput, onSend, nudge, onCloseNudge,
}: {
  messages: ChatMessage[];
  loading: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  nudge: string;
  onCloseNudge: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // ── voice input (on-device dictation) ──────────────────────────────────────
  const [micLang, setMicLang] = useState<DictationLang>('es-MX');
  const { supported: micSupported, listening, toggle: toggleMic } = useDictation(input, setInput, { lang: micLang });

  return (
    <div style={card({ flex: '1 1 380px', display: 'flex', flexDirection: 'column', minHeight: 460 })}>
      <NudgeBanner text={nudge} onClose={onCloseNudge} />
      <div ref={scrollRef} className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            className="msg"
            style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}
          >
            <div
              style={{
                maxWidth: '82%',
                padding: '11px 15px',
                borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                fontSize: 14.5,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                fontFamily: m.role === 'user' ? 'system-ui, sans-serif' : 'inherit',
                background:
                  m.role === 'user'
                    ? 'rgba(47,182,168,.16)'
                    : 'linear-gradient(135deg, rgba(255,210,122,.1), rgba(255,138,107,.08))',
                border: m.role === 'user' ? '1px solid rgba(47,182,168,.3)' : '1px solid rgba(255,210,122,.18)',
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 5, padding: '6px 4px' }}>
            {[0, 1, 2].map((d) => (
              <span key={d} className="dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFD27A', animationDelay: `${d * 0.2}s` }} />
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 9, padding: 12, borderTop: '1px solid rgba(244,241,234,.1)', background: 'rgba(0,0,0,.15)' }}>
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={listening ? 'Te escucho…  ·  listening…' : 'Cuéntale a ClaudIA…  ·  what do you need?'}
          style={{
            flex: 1,
            resize: 'none',
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(244,241,234,.14)',
            borderRadius: 13,
            color: '#F4F1EA',
            padding: '11px 13px',
            fontSize: 14.5,
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1.4,
          }}
        />
        {micSupported && (
          <button
            onClick={() => setMicLang((l) => (l === 'es-MX' ? 'en-US' : 'es-MX'))}
            title="Idioma de dictado · dictation language"
            style={{
              border: '1px solid rgba(244,241,234,.14)',
              borderRadius: 13,
              padding: '0 9px',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.04em',
              color: 'rgba(244,241,234,.62)',
              background: 'rgba(255,255,255,.04)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {micLang === 'es-MX' ? 'ES' : 'EN'}
          </button>
        )}
        {micSupported && (
          <button
            onClick={toggleMic}
            title={listening ? 'Detener · stop' : 'Habla con ClaudIA · talk'}
            className={listening ? 'mic-live' : undefined}
            style={{
              border: listening ? 'none' : '1px solid rgba(244,241,234,.14)',
              borderRadius: 13,
              padding: '0 14px',
              cursor: 'pointer',
              fontSize: 16,
              display: 'grid',
              placeItems: 'center',
              color: listening ? '#fff' : 'rgba(244,241,234,.8)',
              background: listening
                ? 'linear-gradient(135deg, #FF6060, #FF8A6B)'
                : 'rgba(255,255,255,.05)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {listening ? '◉' : '🎙️'}
          </button>
        )}
        <button
          onClick={onSend}
          disabled={loading || !input.trim()}
          style={{
            border: 'none',
            borderRadius: 13,
            padding: '0 18px',
            cursor: loading || !input.trim() ? 'default' : 'pointer',
            fontSize: 15,
            fontWeight: 600,
            color: '#0E1A2B',
            background: 'linear-gradient(135deg, #FFD27A, #FF8A6B)',
            opacity: loading || !input.trim() ? 0.4 : 1,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          ✦
        </button>
      </div>
    </div>
  );
}
