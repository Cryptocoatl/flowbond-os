import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generate, activeProvider, anyConfigured } from '@/lib/providers';
import { quote, chargeAndLog } from '@/lib/usage';
import type { Operation } from '@/lib/pricing';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// POST /api/generate — generative video / image-to-video / upscale / music.
// Provider (Higgsfield or fal) is chosen by the dispatcher via env. Charges
// FlowCredits only on success; logs real cost to the usage ledger.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  if (!anyConfigured()) {
    return NextResponse.json({ error: 'not_configured', hint: 'Set HIGGSFIELD_KEY_ID + HIGGSFIELD_KEY_SECRET (or FAL_KEY) to enable generation.' }, { status: 503 });
  }
  const provider = activeProvider();

  let body: { op?: string; prompt?: string; imageUrl?: string; videoUrl?: string; seconds?: number; aspect?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const op = body.op as Operation;
  const seconds = Math.min(30, Math.max(2, body.seconds ?? 5));
  const units = op === 'music' ? 1 : seconds;

  // price + affordability check up front (read-only)
  const q = await quote(supabase, op, units);
  if (!q.affordable) {
    return NextResponse.json({ error: 'insufficient_credits', credits: q.credits, balance: q.balance }, { status: 402 });
  }

  // register the creation row (so usage + spend can reference it)
  const modeMap: Record<string, string> = { text_to_video: 'video', image_to_video: 'video', upscale: 'video', music: 'dream' };
  const { data: creation } = await supabase.from('flow3_creations').insert({
    user_id: user.id,
    mode: modeMap[op] ?? 'video',
    prompt: body.prompt || op,
    status: 'rendering',
    cost: q.credits,
    provider,
    duration_s: seconds,
    meta: { op },
  }).select().single();

  let result: { url: string | null; raw: unknown; model: string };
  try {
    result = await generate({
      op, prompt: body.prompt, imageUrl: body.imageUrl, videoUrl: body.videoUrl, seconds, aspect: body.aspect,
    });
  } catch (e) {
    if (creation) await supabase.from('flow3_creations').update({ status: 'failed' }).eq('id', creation.id);
    return NextResponse.json({ error: 'generation_failed', detail: String(e) }, { status: 502 });
  }
  const model = result.model;

  // success → charge + log
  const { balance } = await chargeAndLog(supabase, user.id, {
    op, units, credits: q.credits, rawUsd: q.rawUsd, provider, model, creationId: creation?.id,
    meta: { seconds },
  });
  if (creation) {
    await supabase.from('flow3_creations').update({ status: 'complete', output_url: result.url }).eq('id', creation.id);
  }

  return NextResponse.json({ url: result.url, creation, credits: q.credits, balance });
}
