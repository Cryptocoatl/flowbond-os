'use client';
// useSpeech — the guide's voice. Wraps the browser Speech Synthesis API with a
// per-world pitch/rate, language pick, per-utterance start/end callbacks (for
// karaoke-style highlighting), a global mute, and cancel. Degrades silently
// where speechSynthesis is unavailable (SSR / iOS locked). No network, no cost.
import { useCallback, useEffect, useRef, useState } from 'react';

const MUTE_KEY = 'kai.voice.muted';

export interface VoiceCfg {
  pitch: number;
  rate: number;
  lang: 'es' | 'en';
}

export interface SpeakHandlers {
  onStart?: () => void;
  onEnd?: () => void;
}

export interface SpeechItem extends SpeakHandlers {
  text: string;
}

export function useSpeech() {
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const supported = useRef(false);
  const voices = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    supported.current = typeof window !== 'undefined' && 'speechSynthesis' in window;
    if (!supported.current) return;
    try {
      const m = localStorage.getItem(MUTE_KEY) === '1';
      setMuted(m);
      mutedRef.current = m;
    } catch {
      /* ignore */
    }
    const load = () => (voices.current = window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      try {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const makeUtterance = useCallback((text: string, cfg: VoiceCfg, h?: SpeakHandlers) => {
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = cfg.pitch;
    u.rate = cfg.rate;
    u.lang = cfg.lang === 'es' ? 'es-MX' : 'en-US';
    const match = voices.current.find((v) => v.lang?.toLowerCase().startsWith(cfg.lang));
    if (match) u.voice = match;
    if (h?.onStart) u.onstart = h.onStart;
    if (h?.onEnd) {
      u.onend = h.onEnd;
      u.onerror = h.onEnd;
    }
    return u;
  }, []);

  const stop = useCallback(() => {
    if (!supported.current) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }, []);

  // Speak a single line (queued after anything already speaking).
  const speak = useCallback(
    (text: string, cfg: VoiceCfg, h?: SpeakHandlers) => {
      if (!supported.current || mutedRef.current || !text) return;
      try {
        window.speechSynthesis.speak(makeUtterance(text, cfg, h));
      } catch {
        /* ignore */
      }
    },
    [makeUtterance],
  );

  // Speak a sequence in order; each item's onStart/onEnd fire around its turn
  // (used to light up the answer being read). Cancels anything in flight first.
  const speakSequence = useCallback(
    (items: SpeechItem[], cfg: VoiceCfg) => {
      if (!supported.current || mutedRef.current) return;
      try {
        window.speechSynthesis.cancel();
        for (const it of items) {
          if (!it.text) continue;
          window.speechSynthesis.speak(makeUtterance(it.text, cfg, { onStart: it.onStart, onEnd: it.onEnd }));
        }
      } catch {
        /* ignore */
      }
    },
    [makeUtterance],
  );

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      try {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      if (next) stop();
      return next;
    });
  }, [stop]);

  return { speak, speakSequence, stop, muted, toggleMute };
}
