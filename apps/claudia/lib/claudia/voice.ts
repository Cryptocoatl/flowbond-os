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
let usingBrowser = false; // once the cloud voice is unavailable, stay on-device this session

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
  try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
}

/** Free on-device voice (Web Speech synthesis). No key, no network, no cost —
 *  the graceful fallback when the cloud voice (coral / ElevenLabs) isn't set or
 *  is rate-limited. speechSynthesis gives no amplitude, so we fake a gentle
 *  pulse while she talks so the avatar still feels alive. */
function browserSpeak(text: string, lang: 'es' | 'en', onLevel: (v: number) => void): Promise<void> {
  return new Promise<void>((resolve) => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!synth) { resolve(); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'es' ? 'es-MX' : 'en-US';
    u.rate = 1; u.pitch = 1.03;
    // prefer a matching-language female-ish voice if the OS offers one
    const pick = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith(u.lang.slice(0, 2)) && /female|mónica|monica|paulina|samantha|luciana/i.test(v.name))
      || synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith(u.lang.slice(0, 2)));
    if (pick) u.voice = pick;

    let t = 0;
    const pulse = () => { t += 0.28; onLevel(0.28 + Math.abs(Math.sin(t)) * 0.32); raf = requestAnimationFrame(pulse); };
    u.onstart = () => { if (raf) cancelAnimationFrame(raf); pulse(); };
    const done = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } onLevel(0); resolve(); };
    u.onend = done; u.onerror = done;
    try { synth.cancel(); synth.speak(u); } catch { done(); }
  });
}

/** Speak text aloud. onLevel receives 0..1 amplitude each frame; resolves when
 *  playback ends. Throws with the error code (e.g. 'voice-unconfigured'). */
export async function speak(text: string, onLevel: (v: number) => void): Promise<void> {
  const clean = stripForSpeech(text);
  if (!clean) return;
  stopSpeaking();
  const lang = detectLang(clean);

  // Once the cloud voice proved unavailable this session, don't keep hitting it.
  if (usingBrowser) { await browserSpeak(clean, lang, onLevel); return; }

  let res: Response;
  try {
    res = await fetch('/api/claudia/voice', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: clean, lang }),
    });
  } catch {
    // network hiccup — fall back to the free on-device voice rather than go mute
    await browserSpeak(clean, lang, onLevel);
    return;
  }
  if (!res.ok) {
    // 503 = no TTS key configured; 401/429 = key rejected/rate-limited.
    // Either way she should still speak — switch to the on-device voice.
    if (res.status === 503 || res.status === 401 || res.status === 429) usingBrowser = true;
    await browserSpeak(clean, lang, onLevel);
    return;
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
