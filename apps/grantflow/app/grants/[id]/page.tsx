import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dbRead } from '@/lib/supabase-server';
import { Grant, Match, Project } from '@/lib/types';
import { LayerPill, StatusPill, FitMeter, Effort } from '../../components/ui';
import TrackButton from './TrackButton';

export const dynamic = 'force-dynamic';

export default async function GrantDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = dbRead();
  const { data: grant } = await db.from('grants').select('*').eq('id', id).maybeSingle();
  if (!grant) notFound();
  const g = grant as Grant;

  const { data: matchesRaw } = await db
    .from('matches')
    .select('*')
    .eq('grant_id', id)
    .order('fit_score', { ascending: false });
  const matches = (matchesRaw ?? []) as Match[];

  const slugs = matches.map((m) => m.project_slug);
  const { data: projRaw } = slugs.length
    ? await db.from('projects').select('*').in('slug', slugs)
    : { data: [] };
  const projBySlug = new Map((projRaw ?? []).map((p: Project) => [p.slug, p]));

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) =>
    children ? (
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: 'var(--gf-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.55 }}>{children}</div>
      </div>
    ) : null;

  return (
    <main className="gf-wrap gf-rise" style={{ padding: '24px 20px 90px' }}>
      <Link href="/grants" style={{ color: 'var(--gf-muted)', fontSize: 13 }}>
        ← All grants
      </Link>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', margin: '14px 0 6px' }}>
        <StatusPill status={g.status} />
        {g.layers?.map((l) => <LayerPill key={l} layer={l} />)}
        <Effort level={g.effort_level} />
        {!g.verified && <span className="gf-tag" style={{ color: 'var(--gf-gold)' }}>⚠️ unverified — confirm on source</span>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 32, margin: '6px 0 4px' }}>
            {g.name}
          </h1>
          <div style={{ color: 'var(--gf-muted)', fontSize: 15 }}>{g.organization}</div>
        </div>
        <div className="gf-card" style={{ minWidth: 200 }}>
          <div style={{ color: 'var(--gf-muted)', fontSize: 12 }}>Ecosystem fit</div>
          <div style={{ marginTop: 6 }}>
            <FitMeter score={g.fit_score} />
          </div>
          <div style={{ marginTop: 12, color: 'var(--gf-muted)', fontSize: 12 }}>Funding</div>
          <div style={{ fontWeight: 700, color: 'var(--gf-emerald)', marginTop: 2 }}>{g.funding_amount}</div>
          {g.currency && <div style={{ color: 'var(--gf-muted)', fontSize: 12 }}>{g.currency}</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 18, marginTop: 22 }}>
        {/* Main */}
        <div className="gf-card">
          <Field label="Deadline">🗓 {g.deadline}</Field>
          <Field label="Eligibility">{g.eligibility_summary}</Field>
          <Field label="How to apply">{g.application_process}</Field>
          <Field label="What you need">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {g.requirements?.map((r, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {r}
                </li>
              ))}
            </ul>
          </Field>
          <Field label="Strategy notes">{g.notes}</Field>
          {g.chains?.length > 0 && (
            <Field label="Chains">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {g.chains.map((c) => (
                  <span key={c} className="gf-tag">
                    {c}
                  </span>
                ))}
              </div>
            </Field>
          )}
          {g.tags?.length > 0 && (
            <Field label="Tags">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {g.tags.map((t) => (
                  <span key={t} className="gf-tag">
                    {t}
                  </span>
                ))}
              </div>
            </Field>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            {g.url && (
              <a className="gf-btn" href={g.url} target="_blank" rel="noopener noreferrer">
                Open official page ↗
              </a>
            )}
          </div>
          {g.source && (
            <div style={{ color: 'var(--gf-muted)', fontSize: 11, marginTop: 10 }}>source: {g.source}</div>
          )}
        </div>

        {/* Side: matched projects + track */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="gf-card">
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Which project should apply</h3>
            <p style={{ color: 'var(--gf-muted)', fontSize: 12, marginTop: 0 }}>
              Ranked by fit. Reasons are auto-generated from research.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
              {matches.length === 0 && (
                <span style={{ color: 'var(--gf-muted)', fontSize: 13 }}>No scored project fits yet.</span>
              )}
              {matches.map((m) => {
                const p = projBySlug.get(m.project_slug);
                return (
                  <Link key={m.id} href={`/projects/${m.project_slug}`} className="gf-card link" style={{ padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{p?.name ?? m.project_slug}</span>
                      <span className="fit">
                        {m.fit_score}
                        <small>/10</small>
                      </span>
                    </div>
                    {m.reason && (
                      <div style={{ color: 'var(--gf-muted)', fontSize: 12, marginTop: 4 }}>{m.reason}</div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <TrackButton
            grantId={g.id}
            grantName={g.name}
            projects={matches.map((m) => ({
              slug: m.project_slug,
              name: projBySlug.get(m.project_slug)?.name ?? m.project_slug,
            }))}
          />
        </div>
      </div>
    </main>
  );
}
