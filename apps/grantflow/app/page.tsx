import Link from 'next/link';
import { dbRead } from '@/lib/supabase-server';
import { Grant, LAYERS, LAYER_LABEL } from '@/lib/types';
import { LayerPill, StatusPill, FitMeter } from './components/ui';

export const dynamic = 'force-dynamic';

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const now = new Date();
  const target = new Date(d + 'T00:00:00');
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

export default async function Dashboard() {
  const db = dbRead();
  const [{ data: grantsRaw }, { count: projectCount }, { count: matchCount }] = await Promise.all([
    db.from('grants').select('*'),
    db.from('projects').select('*', { count: 'exact', head: true }),
    db.from('matches').select('*', { count: 'exact', head: true }),
  ]);
  const grants = (grantsRaw ?? []) as Grant[];

  const liveNow = grants.filter((g) => g.status === 'open' || g.status === 'rolling');
  const soon = grants
    .map((g) => ({ g, d: daysUntil(g.deadline_date) }))
    .filter((x) => x.d !== null && x.d! >= 0 && x.d! <= 60)
    .sort((a, b) => a.d! - b.d!);
  const topFit = [...grants]
    .filter((g) => g.status !== 'closed')
    .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))
    .slice(0, 6);

  const byLayer = LAYERS.map((l) => ({
    layer: l,
    count: grants.filter((g) => g.layers?.includes(l)).length,
  }));

  const stat = (n: number | string, label: string) => (
    <div className="gf-card" style={{ flex: 1, minWidth: 150 }}>
      <div className="gf-stat">{n}</div>
      <div style={{ color: 'var(--gf-muted)', fontSize: 13, marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <main className="gf-wrap gf-rise" style={{ padding: '34px 20px 80px' }}>
      <header style={{ marginBottom: 26, maxWidth: 720 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontSize: 38,
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          The FlowBond funding engine
        </h1>
        <p style={{ color: 'var(--gf-muted)', marginTop: 10, fontSize: 16 }}>
          Every live grant we could be applying to — scored against every project, across web3,
          ReFi, social, cultural and tech. Build budget for all of it, no equity given away.
        </p>
      </header>

      <section style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        {stat(grants.length, 'grant programs tracked')}
        {stat(liveNow.length, 'open or rolling right now')}
        {stat(soon.length, 'deadlines within 60 days')}
        {stat(projectCount ?? 0, 'ecosystem projects')}
        {stat(matchCount ?? 0, 'scored grant ↔ project fits')}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18 }}>
        {/* Act now */}
        <section className="gf-card" style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>⏳ Act now — closing soon</h2>
          <p style={{ color: 'var(--gf-muted)', fontSize: 13, marginTop: 0 }}>
            Concrete deadlines in the next 60 days. Verify on the source before applying.
          </p>
          {soon.length === 0 && (
            <p style={{ color: 'var(--gf-muted)' }}>No dated deadlines in range — most live grants are rolling.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {soon.map(({ g, d }) => (
              <Link
                key={g.id}
                href={`/grants/${g.id}`}
                className="gf-card link"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}
              >
                <span
                  style={{
                    color: d! <= 14 ? 'var(--gf-gold)' : 'var(--gf-muted)',
                    fontWeight: 700,
                    width: 64,
                  }}
                >
                  {d === 0 ? 'today' : `${d}d`}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{g.name}</div>
                  <div style={{ color: 'var(--gf-muted)', fontSize: 12 }}>
                    {g.organization} · {g.funding_amount}
                  </div>
                </div>
                <FitMeter score={g.fit_score} />
              </Link>
            ))}
          </div>
        </section>

        {/* Top fit */}
        <section className="gf-card" style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>🎯 Highest-fit opportunities</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 10 }}>
            {topFit.map((g) => (
              <Link key={g.id} href={`/grants/${g.id}`} className="gf-card link">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <StatusPill status={g.status} />
                  <FitMeter score={g.fit_score} />
                </div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{g.name}</div>
                <div style={{ color: 'var(--gf-muted)', fontSize: 13 }}>
                  {g.organization} · {g.funding_amount}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {g.layers?.map((l) => <LayerPill key={l} layer={l} />)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Layers */}
      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Browse by layer</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {byLayer.map(({ layer, count }) => (
            <Link
              key={layer}
              href={`/grants?layer=${layer}`}
              className="gf-card link"
              style={{ flex: 1, minWidth: 170 }}
            >
              <LayerPill layer={layer} />
              <div className="gf-stat" style={{ fontSize: 28, marginTop: 10 }}>
                {count}
              </div>
              <div style={{ color: 'var(--gf-muted)', fontSize: 12 }}>{LAYER_LABEL[layer]} grants</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
