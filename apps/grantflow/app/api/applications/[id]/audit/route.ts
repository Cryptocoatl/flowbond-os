import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin, dbRead } from '@/lib/supabase-server';
import { requireAccess } from '@/lib/auth';
import { runAuditRound } from '@/lib/audit';
import { deriveReviewState } from '@/lib/review';
import {
  AuditResult,
  AuditRound,
  DraftSection,
  Grant,
  Match,
  Project,
  ReviewState,
  SubmissionItem,
} from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// POST /api/applications/[id]/audit  { round: "completeness" | ... }
// Runs one audit round and appends the verdict to the ledger. Never edits the
// draft, never touches submission.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const roundKey: string | undefined = body?.round;
  if (!roundKey) return NextResponse.json({ error: 'round required' }, { status: 400 });

  const admin = dbAdmin();

  const [{ data: app }, { data: roundRow }, { data: sectionsRaw }, { data: itemsRaw }, { data: priorRaw }] =
    await Promise.all([
      admin.from('applications').select('*').eq('id', id).single(),
      admin.from('audit_rounds').select('*').eq('key', roundKey).single(),
      admin.from('draft_sections').select('*').eq('application_id', id).order('position'),
      admin.from('submission_items').select('*').eq('application_id', id).order('position'),
      admin.from('audit_results').select('*').eq('application_id', id).order('created_at', { ascending: false }),
    ]);

  if (!app) return NextResponse.json({ error: 'application not found' }, { status: 404 });
  if (!roundRow) return NextResponse.json({ error: `unknown round "${roundKey}"` }, { status: 400 });
  if (!app.grant_id) return NextResponse.json({ error: 'application has no grant' }, { status: 400 });
  if (!app.project_slug)
    return NextResponse.json({ error: 'attach a project before auditing' }, { status: 400 });

  const round = roundRow as AuditRound;
  const sections = (sectionsRaw ?? []) as DraftSection[];
  const items = (itemsRaw ?? []) as SubmissionItem[];
  const prior = (priorRaw ?? []) as AuditResult[];

  if (!sections.length)
    return NextResponse.json({ error: 'no draft sections to audit — draft it first' }, { status: 400 });

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

  // A new cycle starts when the draft has been edited since the newest verdict.
  const lastEdit = sections.reduce((m, s) => (s.updated_at > m ? s.updated_at : m), '');
  const newest = prior[0];
  const cycle = !newest ? 1 : newest.created_at >= lastEdit ? newest.cycle : newest.cycle + 1;

  const openQuestions: string[] =
    (app.draft as { open_questions?: string[] } | null)?.open_questions ?? [];

  try {
    const { result, model } = await runAuditRound({
      round,
      grant: grant as Grant,
      project: project as Project,
      match: (match ?? null) as Match | null,
      sections,
      openQuestions,
      checklist: items.map((i) => ({ label: i.label, required: i.required, done: i.done })),
      history: prior
        .filter((p) => p.round_key === roundKey)
        .slice(0, 4)
        .reverse()
        .map((p) => ({ cycle: p.cycle, verdict: p.verdict, notes: p.notes })),
    });

    const { data: saved, error: saveErr } = await admin
      .from('audit_results')
      .insert({
        application_id: id,
        round_key: roundKey,
        cycle,
        verdict: result.verdict,
        notes: result.notes,
        findings: result.findings,
        auditor: 'claudia',
        model,
      })
      .select()
      .single();
    if (saveErr) throw saveErr;

    // Recompute readiness from the full ledger, including the row we just wrote.
    const { data: roundsRaw } = await admin.from('audit_rounds').select('*').order('round_no');
    const allResults = [...prior, saved as AuditResult];
    const next = deriveReviewState(
      app.review_state as ReviewState,
      (roundsRaw ?? []) as AuditRound[],
      allResults,
      sections,
    );
    if (next !== app.review_state) {
      await admin
        .from('applications')
        .update({ review_state: next, updated_at: new Date().toISOString() })
        .eq('id', id);
    }

    const blockers = result.findings.filter((f) => f.severity === 'blocker').length;
    await admin.from('interactions').insert({
      kind: 'audit',
      actor: 'ClaudIA',
      model,
      direction: 'internal',
      summary: `Audit round ${round.round_no} (${round.label}) — ${result.verdict.toUpperCase()} on ${grant.name}`,
      body: `${result.notes}\n\n${result.findings.length} finding(s), ${blockers} blocker(s).`,
      grant_id: app.grant_id,
      application_id: id,
      project_slug: app.project_slug,
      occurred_at: new Date().toISOString(),
    });

    return NextResponse.json({ result: saved, review_state: next });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'audit failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
