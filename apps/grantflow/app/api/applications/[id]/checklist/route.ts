import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/supabase-server';
import { requireAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const deny = () => NextResponse.json({ error: 'unauthorized' }, { status: 401 });

// POST /api/applications/[id]/checklist  { label, required?, position? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAccess())) return deny();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.label) return NextResponse.json({ error: 'label required' }, { status: 400 });

  const { data, error } = await dbAdmin()
    .from('submission_items')
    .insert({
      application_id: id,
      label: body.label,
      required: body.required ?? true,
      position: body.position ?? 99,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/applications/[id]/checklist  { item_id, done?, url?, note?, label? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAccess();
  if (!session) return deny();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.item_id) return NextResponse.json({ error: 'item_id required' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const f of ['done', 'url', 'note', 'label', 'required', 'position']) {
    if (f in body) patch[f] = body[f];
  }
  if ('done' in body) {
    patch.checked_by = body.done ? session.user.email ?? 'steph' : null;
    patch.checked_at = body.done ? new Date().toISOString() : null;
  }

  const { data, error } = await dbAdmin()
    .from('submission_items')
    .update(patch)
    .eq('id', body.item_id)
    .eq('application_id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/applications/[id]/checklist?item_id=...
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAccess())) return deny();
  const { id } = await params;
  const itemId = new URL(req.url).searchParams.get('item_id');
  if (!itemId) return NextResponse.json({ error: 'item_id required' }, { status: 400 });

  const { error } = await dbAdmin()
    .from('submission_items')
    .delete()
    .eq('id', itemId)
    .eq('application_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
