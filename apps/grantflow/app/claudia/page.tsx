import Link from 'next/link';
import { dbAdmin, dbRead } from '@/lib/supabase-server';
import { Grant } from '@/lib/types';
import { ActivityRail, InteractionRow } from './ActivityRail';

export const dynamic = 'force-dynamic';

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const target = new Date(d + 'T00:00:00');
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000);
}

export default async function ClaudiaHome() {
  const db = dbRead();
  const admin = dbAdmin();

  const [
    { data: grantsRaw },
    { count: contactCount },
    { count: matchCount },
    { data: apps },
    { data: recent },
    { data: needContact },
  ] = await Promise.all([
    db.from('grants').select('*'),
    admin.from('contacts').select('*', { count: 'exact', head: true }),
    db.from('matches').select('*', { count: 'exact', head: true }),
    admin.from('applications').select('*'),
    admin.from('interactions').select('*').order('occurred_at', { ascending: false }).limit(8),
    admin
      .from('contacts')
      .select('id,name,organization,relationship,last_contacted_at')
      .order('last_contacted_at', { ascending: true, nullsFirst: true })
      .limit(5),
  ]);

  const grants = (grantsRaw ?? []) as Grant[];
  const reconnect = needContact ?? [];
  const applications = apps ?? [];
  const drafting = applications.filter((a) => a.stage === 'drafting');
  const drafted = applications.filter((a) => a.draft_status === 'drafted');

  const soon = grants
    .map((g) => ({ g, d: daysUntil(g.deadline_date) }))
    .filter((x) => x.d !== null && x.d! >= 0 && x.d! <= 45)
    .sort((a, b) => a.d! - b.d!)
    .slice(0, 5);

  const stat = (n: number | string, label: string, href: string) => (
    <Link key={label} href={href} className="gf-card link" style={{ flex: 1, minWidth: 130, textAlign: 'center' }}>
      <div className="gf-stat" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>{n}</div>
      <div style={{ color: 'var(--gf-muted)', fontSize: 12, marginTop: 4 }}>{label}</div>
    </Link>
  );

  return (
    <main>
      {/* ── Sunrise hero ─────────────────────────────────────────── */}
      <section
        className="cl-scene cl-motes"
        style={{ minHeight: '78vh', display: 'grid', placeItems: 'center', padding: '60px 20px 80px' }}
      >
        <span className="cl-rays" aria-hidden />
        <span className="cl-sun" aria-hidden />

        <div className="cl-stagger" style={{ textAlign: 'center', maxWidth: 760 }}>
          <div className="cl-logo-halo" style={{ marginBottom: 6 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="cl-logo-img" src="/claudia-logo.png" alt="ClaudIA" width={260} height={260} />
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontSize: 'clamp(40px, 7vw, 78px)',
              lineHeight: 1.02,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            <span className="cl-shine">ClaudIA</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(16px, 2.4vw, 21px)',
              color: 'var(--cl-gold)',
              margin: '14px 0 0',
              fontStyle: 'italic',
              fontFamily: 'var(--font-display), Georgia, serif',
            }}
          >
            Unalienable technology, made and followed by love.
          </p>

          <p style={{ color: 'var(--gf-muted)', maxWidth: 580, margin: '16px auto 0', fontSize: 15, lineHeight: 1.6 }}>
            Steward of FlowBond&apos;s funding. ClaudIA finds the grants, writes the applications,
            and keeps every funder, partner, and conversation in one quiet, structured place — so
            nothing worth following ever slips.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
            <Link href="/pipeline" className="cl-btn">✦ Open the pipeline</Link>
            <Link href="/contacts" className="cl-btn ghost">View the CRM</Link>
          </div>
        </div>
      </section>

      {/* ── ClaudIA's follow-up command center ───────────────────── */}
      <div className="gf-wrap gf-rise" style={{ padding: '38px 20px 90px' }}>
        <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          {stat(grants.length, 'grants tracked', '/grants')}
          {stat(matchCount ?? 0, 'scored fits', '/grants')}
          {stat(applications.length, 'in pipeline', '/pipeline')}
          {stat(drafted.length, 'ClaudIA drafts', '/pipeline')}
          {stat(contactCount ?? 0, 'contacts', '/contacts')}
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18 }}>
          {/* Needs attention */}
          <section className="gf-card">
            <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>☀️ What needs you</h2>
            <p style={{ color: 'var(--gf-muted)', fontSize: 12, marginTop: 0 }}>
              ClaudIA&apos;s read on what&apos;s warm right now.
            </p>

            {soon.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--cl-gold)', marginBottom: 6 }}>Deadlines within 45 days</div>
                {soon.map(({ g, d }) => (
                  <Link key={g.id} href={`/grants/${g.id}`} className="gf-card link" style={{ display: 'flex', gap: 10, padding: '9px 12px', marginBottom: 6 }}>
                    <span style={{ color: 'var(--cl-amber)', fontWeight: 700, width: 48 }}>{d === 0 ? 'today' : `${d}d`}</span>
                    <span style={{ flex: 1, fontSize: 13 }}>{g.name}</span>
                  </Link>
                ))}
              </div>
            )}

            {drafting.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--cl-gold)', marginBottom: 6 }}>Drafts awaiting your review</div>
                <Link href="/pipeline" className="gf-card link" style={{ display: 'block', padding: '9px 12px', fontSize: 13 }}>
                  {drafting.length} application{drafting.length > 1 ? 's' : ''} in drafting → review &amp; submit
                </Link>
              </div>
            )}

            {reconnect.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--cl-gold)', marginBottom: 6 }}>People to reconnect with</div>
                {reconnect.map((c) => (
                  <Link key={c.id} href={`/contacts/${c.id}`} className="gf-card link" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', marginBottom: 6, fontSize: 13 }}>
                    <span>{c.name}{c.organization ? ` · ${c.organization}` : ''}</span>
                    <span style={{ color: 'var(--gf-muted)', fontSize: 11 }}>
                      {c.last_contacted_at ? new Date(c.last_contacted_at).toLocaleDateString() : 'never'}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {soon.length === 0 && drafting.length === 0 && reconnect.length === 0 && (
              <p style={{ color: 'var(--gf-muted)', fontSize: 13, marginTop: 10 }}>
                All quiet. Track a grant or add a contact and ClaudIA will start following up.
              </p>
            )}
          </section>

          {/* Recent activity */}
          <section className="gf-card">
            <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>🌙 Recent flow</h2>
            <p style={{ color: 'var(--gf-muted)', fontSize: 12, marginTop: 0 }}>
              Every touch — yours, ClaudIA&apos;s, and the models in the loop.
            </p>
            {recent && recent.length > 0 ? (
              <div style={{ marginTop: 14 }}>
                <ActivityRail items={(recent as InteractionRow[])} />
              </div>
            ) : (
              <p style={{ color: 'var(--gf-muted)', fontSize: 13, marginTop: 10 }}>
                No activity logged yet. ClaudIA records every draft, email, and call here.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
