import { NextRequest, NextResponse } from 'next/server';
import { CLAUDIA_SYSTEM_PROMPT } from '../../../../lib/claudia/system-prompt';
import { requireFeature } from '../../../../lib/claudia/entitlement-server';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · BLIND RELAY  (private-cloud mode)  — master spec §5
//
//  Honest boundary: this is a STATELESS, NO-LOG relay. In cloud mode the client
//  sends ClaudIA the decrypted conversation (the capability tradeoff); this route
//  forwards it to Anthropic and returns the reply. It is the price of cloud-grade
//  capability — and it is NOT the "literally no one" tier (that is Sealed mode,
//  on-device, which is deferred).
//
//  Guarantees enforced here:
//   • No logging, no persistence, no analytics. NO request/response body reaches
//     any sink. We never console.log content; errors never echo the body.
//   • Prompt caching AND the Files API are OFF — both override Zero-Data-Retention.
//   • The Anthropic key stays server-side; the browser never sees it.
//
//  Requires the Anthropic account to be on Commercial Terms (no training) + ZDR.
//  NOT a TEE/enclave with remote attestation — that is a later milestone; until
//  then the UI must label this exactly as "Private cloud — Anthropic ZDR".
// ════════════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.CLAUDIA_MODEL || 'claude-sonnet-4-6';
const MODEL_PRO = process.env.CLAUDIA_MODEL_PRO || MODEL; // optional better model for Pro tier

type Msg = { role: 'user' | 'assistant'; content: string };

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'relay-unconfigured' }, { status: 503 });
  }

  // Require an authenticated FBID (every tier includes 'chat'). This closes the
  // open-relay abuse vector — no anonymous use of the Anthropic key. Tier-blocking
  // activates once 0007 is live; auth is always required. Reads metadata only (ZDR).
  const gate = await requireFeature('chat');
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const model = gate.ent?.tier === 'pro' ? MODEL_PRO : MODEL;

  let messages: Msg[];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }
  if (!messages.length) {
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
        model,
        max_tokens: 1000,
        system: CLAUDIA_SYSTEM_PROMPT,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      // Surface only the status — never the upstream body (it may echo content).
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
    // No error payload — a stack/body could leak content into a sink.
    return NextResponse.json({ error: 'relay-failed' }, { status: 502 });
  }
}
