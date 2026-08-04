import type { Metadata } from 'next'
import { PageShell } from '@/components/PageShell'
import { DOC_INDEX } from '@/content/docs'

export const metadata: Metadata = {
  title: 'Documentation — FlowBond',
  description:
    'How FlowBond works: how a project runs, what you own, billing, identity, payments, rewards, intelligence, and our security and sub-processor disclosures.',
  alternates: { canonical: '/docs' },
}

export default function DocsIndex() {
  return (
    <PageShell
      eyebrow="Documentation"
      title={
        <>
          How this <em style={{ fontStyle: 'italic', color: 'var(--jade)' }}>actually</em> works.
        </>
      }
      lead="Written for the people who use what we build — clients, their teams, and the developers evaluating the foundation. Where something is not ready, it says so."
      wide
    >
      <div className="docs-index">
        {DOC_INDEX.map((g) => (
          <section key={g.group} className="docs-group">
            <h2>{g.group}</h2>
            <div className="docs-cards">
              {g.pages.map((p, i) => (
                <a key={p.slug} className={`docs-card reveal d${(i % 4) + 1}`} href={`/docs/${p.slug}`}>
                  <h3>{p.title}</h3>
                  <p>{p.summary}</p>
                  <span className="pc-go">Read ↗</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="page-cta">
        <h2>Something missing or wrong?</h2>
        <p>Documentation that quietly drifts out of date is worse than none. Tell us and we will fix it.</p>
        <a href="/contact" className="btn btn-primary" data-mag>
          Contact us <span className="arr">→</span>
        </a>
      </div>
    </PageShell>
  )
}
