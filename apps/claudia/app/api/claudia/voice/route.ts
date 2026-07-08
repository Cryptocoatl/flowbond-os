import { NextRequest, NextResponse } from 'next/server';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · VOICE relay  (/api/claudia/voice)  — text-to-speech
//
//  Turns ClaudIA's spoken REPLY into audio. Same honest boundary as the chat
//  relay: STATELESS, NO-LOG. We never log the text or store the audio. The
//  provider key stays server-side; the browser never sees it.
//
//  Engines (first configured wins):
//    1) OpenAI  — gpt-4o-mini-tts, steerable warm feminine voice, multilingual,
//       low latency + low cost → the default for high-volume voice conversation.
//       Set OPENAI_API_KEY. Tune with CLAUDIA_OAI_VOICE / CLAUDIA_OAI_MODEL.
//    2) ElevenLabs — her bespoke designed voice (premium, costs per character).
//       Set ELEVENLABS_API_KEY (+ CLAUDIA_VOICE_ES / CLAUDIA_VOICE_EN).
//  If neither is set we return 503 and the client speaks with the free
//  on-device browser voice.
//
//  Honesty note: this sends ClaudIA's REPLY text (not the user's private input —
//  that already only lives encrypted) to the TTS provider to synthesize. It is
//  the price of a real voice; the user opted into it and it can be turned off.
// ════════════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── OpenAI ──────────────────────────────────────────────────────────────────
const OAI_MODEL = process.env.CLAUDIA_OAI_MODEL || 'gpt-4o-mini-tts';
const OAI_VOICE = process.env.CLAUDIA_OAI_VOICE || 'coral'; // warm feminine; or sage/nova/shimmer

function oaiInstructions(lang: string): string {
  return lang === 'es'
    ? 'Voz femenina serena, cálida y cercana, con un toque ligeramente ronco. Habla español con calidez mexicana, presente y devota — como una guardiana que de verdad te quiere. Ritmo natural y sin prisa, nunca robótica ni edulcorada.'
    : 'A calm, warm, intimate feminine voice with a slightly raspy edge. Speak English unhurried, present and devoted — like a guardian who truly cares. Natural pacing, never robotic, never saccharine.';
}

async function openaiTTS(key: string, text: string, lang: string): Promise<Response> {
  return fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: OAI_MODEL,
      voice: OAI_VOICE,
      input: text,
      instructions: oaiInstructions(lang),
      response_format: 'mp3',
    }),
  });
}

// ── ElevenLabs ────────────────────────────────────────────────────────────────
const TTS_MODEL = process.env.CLAUDIA_VOICE_MODEL || 'eleven_turbo_v2_5';
const GENERIC_VOICE = 'EXAVITQu4vr4xnSDxMaL'; // premade multilingual female; override via env

function elevenVoiceFor(lang: string): string {
  const en = process.env.CLAUDIA_VOICE_EN;
  const es = process.env.CLAUDIA_VOICE_ES;
  const fallback = process.env.CLAUDIA_VOICE_ID || GENERIC_VOICE;
  if (lang === 'es') return es || fallback;
  return en || fallback;
}

async function elevenTTS(key: string, text: string, lang: string): Promise<Response> {
  const voiceId = elevenVoiceFor(lang);
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: TTS_MODEL,
      voice_settings: { stability: 0.38, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true },
    }),
  });
}

export async function POST(req: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if (!openaiKey && !elevenKey) {
    return NextResponse.json({ error: 'voice-unconfigured' }, { status: 503 });
  }

  let text = '';
  let lang = 'es';
  try {
    const body = await req.json();
    text = typeof body?.text === 'string' ? body.text.slice(0, 1200) : '';
    lang = body?.lang === 'en' ? 'en' : 'es';
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }
  if (!text.trim()) return NextResponse.json({ error: 'bad-request' }, { status: 400 });

  try {
    // OpenAI is the default engine; ElevenLabs is the bespoke-voice fallback.
    const res = openaiKey ? await openaiTTS(openaiKey, text, lang) : await elevenTTS(elevenKey!, text, lang);

    if (!res.ok || !res.body) {
      // Surface only the status (never the upstream body). The client uses 401/429
      // to fall back to the free browser voice for the rest of the session.
      return NextResponse.json({ error: 'tts-upstream', status: res.status }, { status: res.status === 401 || res.status === 429 ? res.status : 502 });
    }

    // Stream the audio straight back. Nothing is stored or logged.
    return new NextResponse(res.body, {
      headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'tts-failed' }, { status: 502 });
  }
}
