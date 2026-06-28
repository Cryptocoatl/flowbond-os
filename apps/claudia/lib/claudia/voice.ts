'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · voice playback + audio-reactive level  (lib/claudia/voice.ts)
//
//  Fetches her spoken reply from /api/claudia/voice (ElevenLabs) and plays it,
//  exposing a 0..1 amplitude each frame so her avatar can pulse in sync —
//  the "she's alive and talking" presence. Nothing persists; audio is a blob
//  URL revoked when she finishes.
// ════════════════════════════════════════════════════════════════════════

let ctx: AudioContext | null = null;
let current: HTMLAudioElement | null = null;
let raf = 0;

// Drop emoji / pictographs / arrows so she doesn't "read" them aloud.
function stripForSpeech(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2728}\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Heuristic language pick — drives the per-language voice (ES vs EN). */
export function detectLang(text: string): 'es' | 'en' {
  const t = text.toLowerCase();
  if (/[ñ¿¡áéíóú]/.test(t)) return 'es';
  const es = (t.match(/\b(que|los|las|tu|tus|esta|estoy|gracias|hola|listo|aqui|para|con|por|una|mundo|memoria|cuido|imperio)\b/g) || []).length;
  const en = (t.match(/\b(the|you|your|and|with|for|here|ready|hello|empire|world|memory|care|love)\b/g) || []).length;
  return es >= en ? 'es' : 'en';
}

export function stopSpeaking(): void {
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  if (current) { current.pause(); current.src = ''; current = null; }
}

/** Speak text aloud. onLevel receives 0..1 amplitude each frame; resolves when
 *  playback ends. Throws with the error code (e.g. 'voice-unconfigured'). */
export async function speak(text: string, onLevel: (v: number) => void): Promise<void> {
  const clean = stripForSpeech(text);
  if (!clean) return;
  stopSpeaking();

  const res = await fetch('/api/claudia/voice', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: clean, lang: detectLang(clean) }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: 'tts-failed' }));
    throw new Error((e as { error?: string }).error || 'tts-failed');
  }

  const url = URL.createObjectURL(await res.blob());
  const audio = new Audio(url);
  current = audio;

  // audio-reactive amplitude via Web Audio (best-effort; playback works regardless)
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ||= new AC();
    if (ctx.state === 'suspended') await ctx.resume();
    const srcNode = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    srcNode.connect(analyser);
    analyser.connect(ctx.destination);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      onLevel(Math.min(1, sum / data.length / 128));
      raf = requestAnimationFrame(tick);
    };
    tick();
  } catch {
    /* analyser unavailable — play without reactivity */
  }

  await new Promise<void>((resolve) => {
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });

  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  onLevel(0);
  URL.revokeObjectURL(url);
  if (current === audio) current = null;
}
