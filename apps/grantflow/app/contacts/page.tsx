import Link from 'next/link';
import { dbAdmin } from '@/lib/supabase-server';
import { Contact } from '@/lib/types';
import AddContact from './AddContact';

export const dynamic = 'force-dynamic';

const REL_COLOR: Record<string, string> = {
  funder: 'var(--cl-gold)',
  'program-officer': 'var(--cl-amber)',
  partner: 'var(--gf-emerald)',
  advisor: '#7dd3fc',
  community: '#fcd34d',
  press: '#fda4af',
};

export default async function ContactsPage() {
  const { data } = await dbAdmin().from('contacts').select('*').order('name');
  const contacts = (data ?? []) as Contact[];

  return (
    <main className="gf-wrap gf-rise" style={{ padding: '34px 20px 90px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 32, margin: 0 }}>The CRM</h1>
          <p style={{ color: 'var(--gf-muted)', margin: '4px 0 0' }}>
            Every funder, program officer, partner, and advocate — and the thread of every conversation.
          </p>
        </div>
        <AddContact />
      </div>

      {contacts.length === 0 ? (
        <div className="gf-card" style={{ textAlign: 'center', padding: 44 }}>
          <p style={{ color: 'var(--gf-muted)' }}>No contacts yet. Add the first person ClaudIA should keep track of.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
          {contacts.map((c) => (
            <Link key={c.id} href={`/contacts/${c.id}`} className="gf-card link">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{c.name}</span>
                {c.relationship && (
                  <span className="gf-tag" style={{ color: REL_COLOR[c.relationship] ?? 'var(--gf-muted)', borderColor: 'currentColor' }}>
                    {c.relationship}
                  </span>
                )}
              </div>
              {(c.organization || c.role) && (
                <div style={{ color: 'var(--gf-muted)', fontSize: 13, marginTop: 4 }}>
                  {[c.role, c.organization].filter(Boolean).join(' · ')}
                </div>
              )}
              {c.email && <div style={{ color: 'var(--cl-gold)', fontSize: 12, marginTop: 8 }}>{c.email}</div>}
              <div style={{ color: 'var(--gf-muted)', fontSize: 11, marginTop: 10 }}>
                {c.last_contacted_at
                  ? `last touch ${new Date(c.last_contacted_at).toLocaleDateString()}`
                  : 'not yet contacted'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
