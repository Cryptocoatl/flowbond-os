import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/supabase-server';
import { STAGES } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.grant_id) return NextResponse.json({ error: 'grant_id required' }, { status: 400 });
  const stage = STAGES.includes(body.stage) ? body.stage : 'discovered';
  const { data, error } = await dbAdmin()
    .from('applications')
    .insert({
      grant_id: body.grant_id,
      project_slug: body.project_slug ?? null,
      stage,
      owner: body.owner ?? null,
      amount_requested: body.amount_requested ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ['stage', 'project_slug', 'owner', 'amount_requested', 'notes', 'submitted_at', 'decision_at']) {
    if (k in body) patch[k] = body[k];
  }
  if (patch.stage && !STAGES.includes(patch.stage as never)) {
    return NextResponse.json({ error: 'invalid stage' }, { status: 400 });
  }
  const { data, error } = await dbAdmin().from('applications').update(patch).eq('id', body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await dbAdmin().from('applications').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
