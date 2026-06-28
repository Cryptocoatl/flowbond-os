import { NextRequest, NextResponse } from 'next/server';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · VOICE relay  (/api/claudia/voice)  — ElevenLabs TTS
//
//  Turns ClaudIA's spoken REPLY into audio. Same honest boundary as the chat
//  relay: STATELESS, NO-LOG. We never log the text or store the audio. The
//  ElevenLabs key stays server-side; the browser never sees it.
//
//  Honesty note: this sends ClaudIA's REPLY text (not the user's private input —
//  that already only lives encrypted) to ElevenLabs to synthesize. It is the
//  price of a real, premium voice. The user opted into this explicitly; the UI
//  labels the voice as cloud-synthesized and it can be turned off.
//
//  Voices (per language, so EN stays neutral-raspy and ES stays Mexican×Argentine):
//    CLAUDIA_VOICE_EN, CLAUDIA_VOICE_ES  — ElevenLabs voice ids (recommended)
//    falls back to CLAUDIA_VOICE_ID, then a generic multilingual voice, so that
//    just setting ELEVENLABS_API_KEY already makes her speak.
// ════════════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TTS_MODEL = process.env.CLAUDIA_VOICE_MODEL || 'eleven_multilingual_v2';
const GENERIC_VOICE = 'EXAVITQu4vr4xnSDxMaL'; // ElevenLabs premade multilingual female; override via env

function voiceFor(lang: string): string {
  const en = process.env.CLAUDIA_VOICE_EN;
  const es = process.env.CLAUDIA_VOICE_ES;
  const fallback = process.env.CLAUDIA_VOICE_ID || GENERIC_VOICE;
  if (lang === 'es') return es || fallback;
  return en || fallback;
}

export async function POST(req: NextRequest) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return NextResponse.json({ error: 'voice-unconfigured' }, { status: 503 });

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

  const voiceId = voiceFor(lang);
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'content-type': 'application/json',
          accept: 'audio/mpeg',
        },
        // A touch raspy/expressive: lower stability, warm style. The raspiness
        // itself lives in the chosen voice; these just tune delivery.
        body: JSON.stringify({
          text,
          model_id: TTS_MODEL,
          voice_settings: { stability: 0.38, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true },
        }),
      },
    );

    if (!res.ok || !res.body) {
      // Surface only the status — never the upstream body.
      return NextResponse.json({ error: 'tts-upstream', status: res.status }, { status: 502 });
    }

    // Stream the audio straight back. Nothing is stored or logged.
    return new NextResponse(res.body, {
      headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'tts-failed' }, { status: 502 });
  }
}
