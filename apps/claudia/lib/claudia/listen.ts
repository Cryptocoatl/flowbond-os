'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · voice INPUT (dictation)  (lib/claudia/listen.ts)
//
//  Talk to her instead of typing. Uses the browser-native Web Speech API
//  (SpeechRecognition) — on-device, no key, no relay of OUR own. The spoken
//  audio is handled by the browser's speech engine; nothing of ClaudIA's
//  vault or relay touches it. The recognized text lands in the same input
//  box as typing, so the privacy boundary is identical to typing a message:
//  it is encrypted into the vault the moment you send.
//
//  Honesty note: some browsers (Chrome) perform recognition via their own
//  cloud speech service — that is the browser's behavior, outside our trust
//  boundary, and is the same as the OS keyboard's dictation. We never see or
//  store the audio. Safari/iOS does on-device recognition.
// ════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal typings — the Web Speech API is not in the standard TS lib.
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
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** True if this browser can transcribe speech to text on the client. */
export function dictationSupported(): boolean {
  return getCtor() !== null;
}

export type DictationLang = 'es-MX' | 'en-US';

/**
 * Push-to-talk dictation that writes into the chat input. Reading `input`
 * lets us append onto whatever was already typed; `setInput` receives the
 * running transcript (interim + final) live, so she fills in as you speak.
 * Nothing auto-sends — you review and press send, exactly like typing.
 */
export function useDictation(
  input: string,
  setInput: (v: string) => void,
  opts?: { lang?: DictationLang },
) {
  const [supported] = useState(dictationSupported);
  const [listening, setListening] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const baseRef = useRef('');          // text already in the box when we started
  const inputRef = useRef(input);
  inputRef.current = input;
  const lang = opts?.lang ?? 'es-MX';

  const stop = useCallback(() => {
    const r = recRef.current;
    if (r) { try { r.stop(); } catch { /* already stopped */ } }
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    // Continue from whatever's already typed, with a trailing space.
    const seed = inputRef.current.replace(/\s+$/, '');
    baseRef.current = seed ? seed + ' ' : '';

    r.onresult = (e) => {
      let finalAdd = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = res[0]?.transcript ?? '';
        if (res.isFinal) finalAdd += txt;
        else interim += txt;
      }
      if (finalAdd) baseRef.current = (baseRef.current + finalAdd).replace(/ {2,}/g, ' ');
      setInput((baseRef.current + interim).replace(/^\s+/, ''));
    };
    r.onend = () => { setListening(false); recRef.current = null; };
    r.onerror = () => { setListening(false); };

    recRef.current = r;
    try { r.start(); setListening(true); } catch { setListening(false); }
  }, [lang, setInput]);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  // Stop recognition if the component unmounts mid-listen.
  useEffect(() => () => { const r = recRef.current; if (r) { try { r.abort(); } catch { /* noop */ } } }, []);

  return { supported, listening, toggle };
}
