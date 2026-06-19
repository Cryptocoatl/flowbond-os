import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dbAdmin } from '@/lib/supabase-server';
import { Contact } from '@/lib/types';
import { ActivityRail, InteractionRow } from '../../claudia/ActivityRail';
import LogInteraction from './LogInteraction';

export const dynamic = 'force-dynamic';

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = dbAdmin();
  const { data: contact } = await admin.from('contacts').select('*').eq('id', id).single();
  if (!contact) notFound();
  const c = contact as Contact;

  const { data: interactions } = await admin
    .from('interactions')
    .select('*')
    .eq('contact_id', id)
    .order('occurred_at', { ascending: false });

  const grant = c.grant_id
    ? (await admin.from('grants').select('id,name').eq('id', c.grant_id).single()).data
    : null;

  return (
    <main className="gf-wrap gf-rise" style={{ padding: '28px 20px 90px' }}>
      <Link href="/contacts" style={{ color: 'var(--gf-muted)', fontSize: 13 }}>← The CRM</Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 22, marginTop: 16, alignItems: 'start' }}>
        {/* Profile */}
        <aside style={{ display: 'grid', gap: 14, position: 'sticky', top: 74 }}>
          <div className="gf-card">
            <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 26, margin: 0 }}>{c.name}</h1>
            {(c.role || c.organization) && (
              <div style={{ color: 'var(--gf-muted)', marginTop: 4 }}>
                {[c.role, c.organization].filter(Boolean).join(' · ')}
              </div>
            )}
            {c.relationship && (
              <span className="gf-tag" style={{ display: 'inline-block', marginTop: 10, color: 'var(--cl-gold)', borderColor: 'currentColor' }}>
                {c.relationship}
              </span>
            )}
            <div style={{ display: 'grid', gap: 6, marginTop: 14, fontSize: 13 }}>
              {c.email && <a href={`mailto:${c.email}`} style={{ color: 'var(--cl-gold)' }}>✉ {c.email}</a>}
              {c.phone && <span style={{ color: 'var(--gf-muted)' }}>☎ {c.phone}</span>}
              {Object.entries(c.links ?? {}).map(([k, v]) => (
                <a key={k} href={String(v)} target="_blank" rel="noreferrer" style={{ color: 'var(--cl-gold)' }}>↗ {k}</a>
              ))}
            </div>
            {grant && (
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--gf-muted)' }}>
                Linked grant: <Link href={`/grants/${grant.id}`} style={{ color: 'var(--cl-gold)' }}>{grant.name}</Link>
              </div>
            )}
            {c.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                {c.tags.map((t) => <span key={t} className="gf-tag">{t}</span>)}
              </div>
            )}
            {c.notes && (
              <p style={{ fontSize: 13, color: 'var(--gf-text)', opacity: 0.85, marginTop: 14, lineHeight: 1.5 }}>{c.notes}</p>
            )}
            <div style={{ color: 'var(--gf-muted)', fontSize: 11, marginTop: 14 }}>
              {c.last_contacted_at ? `Last touch ${new Date(c.last_contacted_at).toLocaleDateString()}` : 'Not yet contacted'}
            </div>
          </div>
          <LogInteraction contactId={c.id} />
        </aside>

        {/* Timeline */}
        <section>
          <h2 style={{ fontSize: 18, margin: '0 0 16px' }}>Conversation</h2>
          {interactions && interactions.length > 0 ? (
            <ActivityRail items={interactions as InteractionRow[]} />
          ) : (
            <div className="gf-card" style={{ color: 'var(--gf-muted)', fontSize: 13 }}>
              No history yet. Log the first touch — ClaudIA will keep the thread from here.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
