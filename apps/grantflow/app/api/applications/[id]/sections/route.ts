import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/supabase-server';
import { requireAccess } from '@/lib/auth';
import { deriveReviewState } from '@/lib/review';
import { AuditResult, AuditRound, DraftSection, ReviewState } from '@/lib/types';

export const dynamic = 'force-dynamic';

const deny = () => NextResponse.json({ error: 'unauthorized' }, { status: 401 });

/**
 * Editing a section bumps its updated_at, which invalidates every audit verdict
 * older than the edit (see grantflow.audit_gate). A draft sitting at "Ready"
 * therefore falls back to "In Audit" the moment Steph changes a word.
 */
async function reconcileReviewState(id: string) {
  const admin = dbAdmin();
  const [{ data: app }, { data: rounds }, { data: results }, { data: sections }] = await Promise.all([
    admin.from('applications').select('id,review_state').eq('id', id).single(),
    admin.from('audit_rounds').select('*').order('round_no'),
    admin.from('audit_results').select('*').eq('application_id', id),
    admin.from('draft_sections').select('*').eq('application_id', id),
  ]);
  if (!app) return null;

  const next = deriveReviewState(
    app.review_state as ReviewState,
    (rounds ?? []) as AuditRound[],
    (results ?? []) as AuditResult[],
    (sections ?? []) as DraftSection[],
  );
  if (next !== app.review_state) {
    await admin
      .from('applications')
      .update({ review_state: next, updated_at: new Date().toISOString() })
      .eq('id', id);
  }
  return next;
}

// PATCH /api/applications/[id]/sections  { key, body?, label?, word_limit?, source_note? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAccess();
  if (!session) return deny();
  const { id } = await params;
  const payload = await req.json().catch(() => null);
  if (!payload?.key) return NextResponse.json({ error: 'key required' }, { status: 400 });

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: session.user.email ?? 'steph',
  };
  for (const f of ['body', 'label', 'word_limit', 'source_note', 'required', 'position']) {
    if (f in payload) patch[f] = payload[f];
  }

  const { data, error } = await dbAdmin()
    .from('draft_sections')
    .update(patch)
    .eq('application_id', id)
    .eq('key', payload.key)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const review_state = await reconcileReviewState(id);
  return NextResponse.json({ section: data, review_state });
}

// POST /api/applications/[id]/sections  { key, label, body?, position?, word_limit? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAccess();
  if (!session) return deny();
  const { id } = await params;
  const payload = await req.json().catch(() => null);
  if (!payload?.key || !payload?.label)
    return NextResponse.json({ error: 'key and label required' }, { status: 400 });

  const { data, error } = await dbAdmin()
    .from('draft_sections')
    .insert({
      application_id: id,
      key: payload.key,
      label: payload.label,
      body: payload.body ?? '',
      position: payload.position ?? 99,
      word_limit: payload.word_limit ?? null,
      required: payload.required ?? true,
      updated_by: session.user.email ?? 'steph',
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const review_state = await reconcileReviewState(id);
  return NextResponse.json({ section: data, review_state });
}

// DELETE /api/applications/[id]/sections?key=...
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAccess())) return deny();
  const { id } = await params;
  const key = new URL(req.url).searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

  const { error } = await dbAdmin()
    .from('draft_sections')
    .delete()
    .eq('application_id', id)
    .eq('key', key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const review_state = await reconcileReviewState(id);
  return NextResponse.json({ ok: true, review_state });
}
