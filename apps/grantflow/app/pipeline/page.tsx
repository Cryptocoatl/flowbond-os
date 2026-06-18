import Link from 'next/link';
import { dbAdmin, dbRead } from '@/lib/supabase-server';
import { Application } from '@/lib/types';
import PipelineBoard, { PipelineCard } from './PipelineBoard';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  const { data: appsRaw } = await dbAdmin()
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });
  const apps = (appsRaw ?? []) as Application[];

  const db = dbRead();
  const grantIds = [...new Set(apps.map((a) => a.grant_id).filter(Boolean))] as string[];
  const slugs = [...new Set(apps.map((a) => a.project_slug).filter(Boolean))] as string[];
  const [{ data: grants }, { data: projects }] = await Promise.all([
    grantIds.length ? db.from('grants').select('id,name').in('id', grantIds) : Promise.resolve({ data: [] }),
    slugs.length ? db.from('projects').select('slug,name').in('slug', slugs) : Promise.resolve({ data: [] }),
  ]);
  const grantName = new Map((grants ?? []).map((g: { id: string; name: string }) => [g.id, g.name]));
  const projName = new Map((projects ?? []).map((p: { slug: string; name: string }) => [p.slug, p.name]));

  const cards: PipelineCard[] = apps.map((a) => ({
    id: a.id,
    grant_id: a.grant_id,
    grantName: a.grant_id ? grantName.get(a.grant_id) ?? 'Unknown grant' : 'Unknown grant',
    projectName: a.project_slug ? projName.get(a.project_slug) ?? a.project_slug : null,
    stage: a.stage,
    owner: a.owner,
    amount_requested: a.amount_requested,
    notes: a.notes,
  }));

  return (
    <main className="gf-wrap gf-rise" style={{ padding: '28px 20px 80px' }}>
      <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 30, margin: '0 0 4px' }}>
        Pipeline
      </h1>
      <p style={{ color: 'var(--gf-muted)', marginTop: 0 }}>
        Grants you are pursuing, by stage. Move them along as you go.
      </p>
      {cards.length === 0 ? (
        <div className="gf-card" style={{ textAlign: 'center', padding: 40, marginTop: 16 }}>
          <p style={{ color: 'var(--gf-muted)' }}>Nothing tracked yet.</p>
          <Link className="gf-btn" href="/grants">
            Browse grants →
          </Link>
        </div>
      ) : (
        <PipelineBoard cards={cards} />
      )}
    </main>
  );
}
