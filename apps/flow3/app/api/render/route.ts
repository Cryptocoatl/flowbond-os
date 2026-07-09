import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shotstackConfigured, render, type RenderClip } from '@/lib/providers/shotstack';
import { chargeAndLog } from '@/lib/usage';
import { rawCostUsd } from '@/lib/pricing';
import { editCost } from '@/lib/credits';
import type { EditState } from '@/lib/grade';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// POST /api/render — Shotstack server render of the timeline → real MP4
// (audio, transitions, resolution). Charges on success; logs cost.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  if (!shotstackConfigured()) {
    return NextResponse.json({ error: 'not_configured', provider: 'shotstack', hint: 'Set SHOTSTACK_KEY for server render.' }, { status: 503 });
  }

  let body: { clips?: RenderClip[]; edit?: EditState; soundtrack?: string; outputLength?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const clips = body.clips ?? [];
  const edit = body.edit;
  if (!clips.length || !edit) return NextResponse.json({ error: 'nothing_to_render' }, { status: 400 });

  const totalSec = clips.reduce((s, c) => s + (c.length || 0), 0);
  const minutes = Math.max(0.1, totalSec / 60);

  // Price by OUTPUT length (the FlowStudio model), not provider minutes — one
  // consistent price whether the render runs in the browser or on the server.
  const outputLength = body.outputLength ?? Math.round(totalSec);
  const credits = editCost(outputLength);
  const { data: balBefore } = await supabase.rpc('fc_balance');
  if (((balBefore as number) ?? 0) < credits) {
    return NextResponse.json({ error: 'insufficient_credits', credits, balance: (balBefore as number) ?? 0 }, { status: 402 });
  }

  const { data: creation } = await supabase.from('flow3_creations').insert({
    user_id: user.id, mode: 'edit', prompt: `Render · ${clips.length} clips · ${outputLength}s`, title: 'FlowStudio render',
    status: 'rendering', cost: credits, provider: 'shotstack', duration_s: totalSec, meta: { aspect: edit.aspect, resolution: edit.resolution, outputLength },
  }).select().single();

  let out: { url: string | null; id: string };
  try {
    out = await render(clips, edit, body.soundtrack);
  } catch (e) {
    if (creation) await supabase.from('flow3_creations').update({ status: 'failed' }).eq('id', creation.id);
    return NextResponse.json({ error: 'render_failed', detail: String(e) }, { status: 502 });
  }

  // charge only after the render succeeded
  const { balance } = await chargeAndLog(supabase, user.id, {
    op: 'render', units: minutes, credits, rawUsd: rawCostUsd('render', minutes),
    provider: 'shotstack', model: `shotstack/${process.env.SHOTSTACK_ENV || 'stage'}`,
    creationId: creation?.id, meta: { minutes, clips: clips.length, outputLength },
  });
  if (creation) await supabase.from('flow3_creations').update({ status: 'complete', output_url: out.url, job_id: out.id }).eq('id', creation.id);

  return NextResponse.json({ url: out.url, jobId: out.id, creation, credits, balance });
}
