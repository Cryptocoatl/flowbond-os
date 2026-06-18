import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dbRead } from '@/lib/supabase-server';
import { Grant, Match, Project } from '@/lib/types';
import { LayerPill, StatusPill, FitMeter, Effort } from '../../components/ui';

export const dynamic = 'force-dynamic';

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = dbRead();
  const { data: project } = await db.from('projects').select('*').eq('slug', slug).maybeSingle();
  if (!project) notFound();
  const p = project as Project;

  const { data: matchesRaw } = await db
    .from('matches')
    .select('*')
    .eq('project_slug', slug)
    .order('fit_score', { ascending: false });
  const matches = (matchesRaw ?? []) as Match[];

  const ids = matches.map((m) => m.grant_id);
  const { data: grantsRaw } = ids.length
    ? await db.from('grants').select('*').in('id', ids)
    : { data: [] };
  const grantById = new Map((grantsRaw ?? []).map((g: Grant) => [g.id, g]));

  return (
    <main className="gf-wrap gf-rise" style={{ padding: '24px 20px 90px' }}>
      <Link href="/projects" style={{ color: 'var(--gf-muted)', fontSize: 13 }}>
        ← All projects
      </Link>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0 6px' }}>
        {p.layers?.map((l) => <LayerPill key={l} layer={l} />)}
        {p.status && <span className="gf-tag">{p.status}</span>}
      </div>
      <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 32, margin: '4px 0' }}>
        {p.name}
      </h1>
      {p.tagline && <p style={{ color: 'var(--gf-muted)', marginTop: 0, fontSize: 16 }}>{p.tagline}</p>}
      {p.url && (
        <a className="gf-btn" href={p.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 4 }}>
          Visit ↗
        </a>
      )}

      <h2 style={{ fontSize: 18, margin: '28px 0 4px' }}>
        {matches.length} matched grant{matches.length === 1 ? '' : 's'}
      </h2>
      <p style={{ color: 'var(--gf-muted)', fontSize: 13, marginTop: 0 }}>
        Best funding paths for {p.name}, ranked by fit.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        {matches.map((m) => {
          const g = grantById.get(m.grant_id);
          if (!g) return null;
          return (
            <Link key={m.id} href={`/grants/${g.id}`} className="gf-card link">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 5 }}>
                    <StatusPill status={g.status} />
                    {g.layers?.map((l) => <LayerPill key={l} layer={l} />)}
                    <Effort level={g.effort_level} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{g.name}</div>
                  <div style={{ color: 'var(--gf-muted)', fontSize: 13 }}>
                    {g.organization} · 💰 {g.funding_amount} · 🗓 {g.deadline}
                  </div>
                  {m.reason && (
                    <div style={{ fontSize: 13, marginTop: 8, color: 'var(--gf-text)' }}>
                      <span style={{ color: 'var(--gf-emerald)' }}>Why it fits: </span>
                      {m.reason}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--gf-muted)', fontSize: 11 }}>fit for {p.name}</div>
                  <FitMeter score={m.fit_score} />
                </div>
              </div>
            </Link>
          );
        })}
        {matches.length === 0 && (
          <p style={{ color: 'var(--gf-muted)' }}>No matched grants yet for this project.</p>
        )}
      </div>
    </main>
  );
}
