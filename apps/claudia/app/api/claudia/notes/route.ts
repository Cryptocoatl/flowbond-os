import { NextRequest, NextResponse } from 'next/server';
import { requireFeature } from '../../../../lib/claudia/entitlement-server';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · MEETING-NOTES SYNTHESIS · BLIND RELAY  — master spec §5
//
//  Same honest boundary as /api/claudia/relay: a STATELESS, NO-LOG relay. The
//  transcript is produced ON-DEVICE (Whisper WASM) and stored encrypted; this
//  route exists ONLY for the synthesis step — turning a decrypted transcript
//  into a structured digest. The client sends the transcript text for this one
//  call; we forward it to Anthropic and return the digest. It is the same cloud
//  tradeoff as chat, and it is NOT the "literally no one" tier.
//
//  Guarantees enforced here:
//   • No logging, no persistence, no analytics. No request/response body to any
//     sink. We never console.log content; errors never echo the body.
//   • Prompt caching AND the Files API are OFF — both override Zero-Data-Retention.
//   • The Anthropic key stays server-side; the browser never sees it.
//
//  Requires the Anthropic account on Commercial Terms (no training) + ZDR.
// ════════════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.CLAUDIA_MODEL || 'claude-sonnet-4-6';

const NOTES_SYSTEM_PROMPT = `You are ClaudIA — "La Guardiana" — taking the most useful, faithful notes of a meeting for the one person you serve. You are given the full transcript of a meeting (in-person or online). The transcript was produced by on-device speech-to-text and may have small errors, missing punctuation, or unlabeled speakers — read through that and capture what actually matters.

Be faithful: never invent decisions, owners, numbers, or commitments that are not in the transcript. If the transcript is short, fragmentary, or unclear, produce a smaller, honest digest rather than padding it. If a field has nothing real, return an empty array or empty string.

Mirror the language of the meeting (Spanish, English, or the mix as spoken). For actions, capture who owns each one only if the transcript makes it clear ("" otherwise), and tag the venture when obvious (else "FlowBond" or "Personal").

OUTPUT CONTRACT — respond with ONLY one valid JSON object. No markdown, no fences, no text outside it:
{"title": "<short descriptive title>", "summary": "<2-5 sentence narrative of what happened and why it mattered>", "topics": ["<agenda topic covered>"], "decisions": ["<a decision the group actually made>"], "actions": [{"title": "<action item>", "owner": "<name or empty>", "venture": "<venture|Personal|FlowBond>"}], "questions": ["<open question / unresolved item / unknown>"], "highlights": ["<notable quote or moment worth remembering>"]}`;

type Body = { transcript?: string };

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'relay-unconfigured' }, { status: 503 });
  }

  // Notes synthesis is a Plus+ feature ('meetings'). Requires an authed FBID;
  // tier-blocks once 0007 is live. Reads metadata only — the transcript is never
  // logged or persisted (ZDR holds).
  const gate = await requireFeature('meetings');
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let transcript: string;
  try {
    const body = (await req.json()) as Body;
    transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : '';
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }
  if (!transcript) {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      // NOTE: plain system text — deliberately NO cache_control (caching breaks ZDR).
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: NOTES_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: `Transcript of the meeting follows. Produce the notes digest.\n\n${transcript}` },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream', status: res.status }, { status: 502 });
    }

    const data = await res.json();
    const raw: string = (data.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('\n')
      .trim();

    // Return ONLY the model text. Nothing is stored, logged, or measured.
    return NextResponse.json({ raw });
  } catch {
    return NextResponse.json({ error: 'relay-failed' }, { status: 502 });
  }
}
