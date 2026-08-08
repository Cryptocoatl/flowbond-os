import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/supabase-server';
import { requireAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const deny = () => NextResponse.json({ error: 'unauthorized' }, { status: 401 });

/**
 * Recording a submission that a human already made.
 *
 * This route does not send anything to a funder and there is no code path in
 * this app that does. Steph submits on the funder's own portal/email/form; this
 * writes down that it happened.
 *
 * Three things make it human-only:
 *   1. requireAccess() — needs a real signed-in FBID session, not a service token.
 *   2. `confirm: true` must be in the body — no accidental or replayed call.
 *   3. submitted_by is taken from the SESSION, never from the request body, so
 *      it cannot be spoofed. The DB trigger refuses the transition without it.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAccess();
  if (!session) return deny();

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (body?.confirm !== true) {
    return NextResponse.json(
      { error: 'confirm:true required — marking a submission is an explicit human action' },
      { status: 400 },
    );
  }

  const admin = dbAdmin();
  const { data: app } = await admin
    .from('applications')
    .select('id,review_state,grant_id,project_slug')
    .eq('id', id)
    .single();
  if (!app) return NextResponse.json({ error: 'application not found' }, { status: 404 });
  if (app.review_state === 'submitted')
    return NextResponse.json({ error: 'already marked as submitted' }, { status: 409 });

  const who = session.user.email ?? session.user.id;
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from('applications')
    .update({
      review_state: 'submitted',
      stage: 'submitted',
      submitted_by: who,
      submitted_at: body?.submitted_at ?? now,
      submission_method: body?.method ?? null,
      submission_ref: body?.ref ?? null,
      submission_url: body?.url ?? null,
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single();

  // The DB trigger raises if the audit gate isn't satisfied — surface that verbatim.
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from('interactions').insert({
    kind: 'submission',
    actor: who,
    direction: 'outbound',
    channel: body?.method ?? null,
    summary: `Marked as submitted by ${who}`,
    body: [body?.ref ? `Confirmation: ${body.ref}` : null, body?.url ?? null]
      .filter(Boolean)
      .join('\n') || null,
    grant_id: app.grant_id,
    application_id: id,
    project_slug: app.project_slug,
    occurred_at: now,
  });

  return NextResponse.json(data);
}

// DELETE — undo a mis-click. Reverts to Ready; the interaction log keeps both events.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAccess();
  if (!session) return deny();
  const { id } = await params;
  const who = session.user.email ?? session.user.id;
  const now = new Date().toISOString();

  const { data, error } = await dbAdmin()
    .from('applications')
    .update({
      review_state: 'ready',
      submitted_by: null,
      submitted_at: null,
      submission_method: null,
      submission_ref: null,
      submission_url: null,
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await dbAdmin().from('interactions').insert({
    kind: 'submission',
    actor: who,
    direction: 'internal',
    summary: `Un-marked submission (correction) by ${who}`,
    application_id: id,
    occurred_at: now,
  });

  return NextResponse.json(data);
}
