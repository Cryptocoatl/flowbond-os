import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin, dbRead } from '@/lib/supabase-server';
import { draftApplication } from '@/lib/claudia';
import { requireAccess } from '@/lib/auth';
import { Grant, Project, Match } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// POST /api/applications/[id]/draft — ClaudIA drafts the application from its grant + project.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAccess())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const admin = dbAdmin();

  const { data: app, error: appErr } = await admin
    .from('applications')
    .select('*')
    .eq('id', id)
    .single();
  if (appErr || !app) return NextResponse.json({ error: 'application not found' }, { status: 404 });
  if (!app.grant_id) return NextResponse.json({ error: 'application has no grant' }, { status: 400 });
  if (!app.project_slug)
    return NextResponse.json({ error: 'attach a project before drafting' }, { status: 400 });

  const db = dbRead();
  const [{ data: grant }, { data: project }, { data: match }] = await Promise.all([
    db.from('grants').select('*').eq('id', app.grant_id).single(),
    db.from('projects').select('*').eq('slug', app.project_slug).single(),
    db
      .from('matches')
      .select('*')
      .eq('grant_id', app.grant_id)
      .eq('project_slug', app.project_slug)
      .maybeSingle(),
  ]);
  if (!grant) return NextResponse.json({ error: 'grant not found' }, { status: 404 });
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });

  await admin
    .from('applications')
    .update({ draft_status: 'generating', updated_at: new Date().toISOString() })
    .eq('id', id);

  try {
    const { draft, model } = await draftApplication(
      grant as Grant,
      project as Project,
      (match ?? null) as Match | null,
    );
    const now = new Date().toISOString();
    const { data: saved, error: saveErr } = await admin
      .from('applications')
      .update({
        draft,
        draft_status: 'drafted',
        drafted_by: 'claudia',
        draft_model: model,
        draft_updated_at: now,
        stage: app.stage === 'discovered' || app.stage === 'researching' ? 'drafting' : app.stage,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();
    if (saveErr) throw saveErr;

    // ClaudIA records her own work in the activity ledger.
    await admin.from('interactions').insert({
      kind: 'ai_draft',
      actor: 'ClaudIA',
      model,
      direction: 'internal',
      summary: `Drafted application for ${grant.name}`,
      body: draft.summary,
      grant_id: app.grant_id,
      application_id: id,
      project_slug: app.project_slug,
      occurred_at: now,
    });

    return NextResponse.json(saved);
  } catch (e) {
    await admin
      .from('applications')
      .update({ draft_status: 'none', updated_at: new Date().toISOString() })
      .eq('id', id);
    const msg = e instanceof Error ? e.message : 'drafting failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
