import Link from 'next/link';
import { dbRead } from '@/lib/supabase-server';
import { Project } from '@/lib/types';
import { LayerPill } from '../components/ui';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const db = dbRead();
  const [{ data: projRaw }, { data: matches }] = await Promise.all([
    db.from('projects').select('*').order('name'),
    db.from('matches').select('project_slug, fit_score'),
  ]);
  const projects = (projRaw ?? []) as Project[];

  const stats = new Map<string, { count: number; best: number }>();
  for (const m of matches ?? []) {
    const s = stats.get(m.project_slug) ?? { count: 0, best: 0 };
    s.count += 1;
    s.best = Math.max(s.best, m.fit_score ?? 0);
    stats.set(m.project_slug, s);
  }

  const ordered = projects.sort(
    (a, b) => (stats.get(b.slug)?.count ?? 0) - (stats.get(a.slug)?.count ?? 0),
  );

  return (
    <main className="gf-wrap gf-rise" style={{ padding: '28px 20px 80px' }}>
      <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 30, margin: '0 0 4px' }}>
        Projects
      </h1>
      <p style={{ color: 'var(--gf-muted)', marginTop: 0 }}>
        Each project and the grants matched to it. Tap one to see its funding paths.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14, marginTop: 18 }}>
        {ordered.map((p) => {
          const s = stats.get(p.slug);
          return (
            <Link key={p.slug} href={`/projects/${p.slug}`} className="gf-card link">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{p.name}</span>
                {p.status && <span className="gf-tag">{p.status}</span>}
              </div>
              {p.tagline && (
                <div style={{ color: 'var(--gf-muted)', fontSize: 13, marginTop: 4 }}>{p.tagline}</div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {p.layers?.map((l) => <LayerPill key={l} layer={l} />)}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'baseline' }}>
                <span>
                  <span className="gf-stat" style={{ fontSize: 24 }}>{s?.count ?? 0}</span>{' '}
                  <span style={{ color: 'var(--gf-muted)', fontSize: 12 }}>grants fit</span>
                </span>
                {s?.best ? (
                  <span className="fit">
                    {s.best}
                    <small>/10 top</small>
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
