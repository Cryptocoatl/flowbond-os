// Server-only: uses the service-role client. Imported by server components only.
import { dbAdmin, dbRead } from '@/lib/supabase-server';
import {
  Application,
  AuditResult,
  AuditRound,
  DraftSection,
  ReviewState,
  SubmissionItem,
} from '@/lib/types';

/** Everything one Draft Review Card needs, assembled server-side. */
export interface ReviewCardData {
  id: string;
  grantId: string | null;
  grantName: string;
  organization: string | null;
  layer: string | null;
  fitScore: number | null;
  deadline: string | null;
  grantUrl: string | null;
  submissionMethod: string | null;
  submissionUrl: string | null;
  submissionEmail: string | null;
  projectSlug: string | null;
  projectName: string | null;
  reviewState: ReviewState;
  stage: string;
  amountRequested: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  submissionRef: string | null;
  submittedUrl: string | null;
  sections: DraftSection[];
  results: AuditResult[];
  items: SubmissionItem[];
  openQuestions: string[];
}

export interface ReviewData {
  cards: ReviewCardData[];
  rounds: AuditRound[];
}

type AppRow = Application & { draft: { open_questions?: string[] } | null };

async function assemble(apps: AppRow[]): Promise<ReviewData> {
  const admin = dbAdmin();
  const ids = apps.map((a) => a.id);

  const [{ data: roundsRaw }, { data: sectionsRaw }, { data: resultsRaw }, { data: itemsRaw }] =
    await Promise.all([
      admin.from('audit_rounds').select('*').eq('active', true).order('round_no'),
      ids.length
        ? admin.from('draft_sections').select('*').in('application_id', ids).order('position')
        : Promise.resolve({ data: [] }),
      ids.length
        ? admin.from('audit_results').select('*').in('application_id', ids).order('created_at')
        : Promise.resolve({ data: [] }),
      ids.length
        ? admin.from('submission_items').select('*').in('application_id', ids).order('position')
        : Promise.resolve({ data: [] }),
    ]);

  const db = dbRead();
  const grantIds = [...new Set(apps.map((a) => a.grant_id).filter(Boolean))] as string[];
  const slugs = [...new Set(apps.map((a) => a.project_slug).filter(Boolean))] as string[];
  const [{ data: grants }, { data: projects }, { data: matches }] = await Promise.all([
    grantIds.length
      ? db
          .from('grants')
          .select(
            'id,name,organization,layer,deadline_date,deadline,fit_score,url,submission_method,submission_url,submission_email',
          )
          .in('id', grantIds)
      : Promise.resolve({ data: [] }),
    slugs.length ? db.from('projects').select('slug,name').in('slug', slugs) : Promise.resolve({ data: [] }),
    grantIds.length
      ? db.from('matches').select('grant_id,project_slug,fit_score').in('grant_id', grantIds)
      : Promise.resolve({ data: [] }),
  ]);

  type GrantLite = {
    id: string;
    name: string;
    organization: string | null;
    layer: string | null;
    deadline_date: string | null;
    deadline: string | null;
    fit_score: number | null;
    url: string | null;
    submission_method: string | null;
    submission_url: string | null;
    submission_email: string | null;
  };

  const grantById = new Map((grants ?? []).map((g) => [(g as GrantLite).id, g as GrantLite]));
  const projName = new Map((projects ?? []).map((p: { slug: string; name: string }) => [p.slug, p.name]));
  const matchFit = new Map(
    (matches ?? []).map((m: { grant_id: string; project_slug: string; fit_score: number | null }) => [
      `${m.grant_id}::${m.project_slug}`,
      m.fit_score,
    ]),
  );

  const byApp = <T extends { application_id: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) {
      const list = m.get(r.application_id) ?? [];
      list.push(r);
      m.set(r.application_id, list);
    }
    return m;
  };
  const sections = byApp(sectionsRaw as DraftSection[] | null);
  const results = byApp(resultsRaw as AuditResult[] | null);
  const items = byApp(itemsRaw as SubmissionItem[] | null);

  const cards: ReviewCardData[] = apps.map((a) => {
    const g = a.grant_id ? grantById.get(a.grant_id) : undefined;
    // A project-specific match score beats the grant's generic one.
    const fit =
      (a.grant_id && a.project_slug ? matchFit.get(`${a.grant_id}::${a.project_slug}`) : null) ??
      g?.fit_score ??
      null;
    return {
      id: a.id,
      grantId: a.grant_id,
      grantName: g?.name ?? 'Unknown grant',
      organization: g?.organization ?? null,
      layer: g?.layer ?? null,
      fitScore: fit,
      deadline: g?.deadline_date ?? null,
      grantUrl: g?.url ?? null,
      submissionMethod: g?.submission_method ?? null,
      submissionUrl: g?.submission_url ?? null,
      submissionEmail: g?.submission_email ?? null,
      projectSlug: a.project_slug,
      projectName: a.project_slug ? projName.get(a.project_slug) ?? a.project_slug : null,
      reviewState: (a.review_state ?? 'drafting') as ReviewState,
      stage: a.stage,
      amountRequested: a.amount_requested,
      submittedBy: a.submitted_by,
      submittedAt: a.submitted_at,
      submissionRef: a.submission_ref,
      submittedUrl: a.submission_url,
      sections: sections.get(a.id) ?? [],
      results: results.get(a.id) ?? [],
      items: items.get(a.id) ?? [],
      openQuestions: a.draft?.open_questions ?? [],
    };
  });

  return { cards, rounds: (roundsRaw ?? []) as AuditRound[] };
}

export async function loadReviewCards(): Promise<ReviewData> {
  const { data } = await dbAdmin()
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });
  return assemble((data ?? []) as AppRow[]);
}

export async function loadReviewCard(id: string): Promise<ReviewData> {
  const { data } = await dbAdmin().from('applications').select('*').eq('id', id).maybeSingle();
  return assemble(data ? [data as AppRow] : []);
}
