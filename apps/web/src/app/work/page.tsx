import type { Metadata } from 'next'
import { PageShell } from '@/components/PageShell'
import { CASES, PLATFORMS } from '@/content/work'

export const metadata: Metadata = {
  title: 'Our work — FlowBond',
  description:
    'Live client platforms built and operated by FlowBond: Legatum, Mayan Transfers, Voces para el Alma, Tevo Salgado, La Vida es Bella, BrandMark.',
  alternates: { canonical: '/work' },
}

export default function WorkPage() {
  return (
    <PageShell
      eyebrow="Our work"
      title={
        <>
          Real businesses, <em style={{ fontStyle: 'italic', color: 'var(--jade)' }}>running</em> on what we built.
        </>
      }
      lead="Every link on this page opens a live production system. Nothing here is a mockup, a concept, or a site that quietly went dark."
      wide
    >
      <div className="case-list">
        {CASES.map((c, i) => (
          <article key={c.slug} className={`case case-${c.accent} reveal d${(i % 3) + 1}`} id={c.slug}>
            <div className="case-head">
              <div>
                <h2>{c.name}</h2>
                <p className="case-kind">{c.kind}</p>
              </div>
              <a className="case-visit" href={c.href} target="_blank" rel="noopener noreferrer">
                {c.href.replace('https://', '')} ↗
              </a>
            </div>
            <p className="case-summary">{c.summary}</p>
            <div className="case-cols">
              <div>
                <h3>What we built</h3>
                <ul>
                  {c.built.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Where it landed</h3>
                <p className="case-outcome">{c.outcome}</p>
                <div className="case-tags">
                  {c.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="platforms">
        <div className="section-tag reveal">Our own products</div>
        <h2 className="lead-h reveal d1" style={{ maxWidth: '22ch' }}>
          We run our own software too.
        </h2>
        <p className="mani-p reveal d2">
          Kept separate from client work on purpose — conflating the two is how portfolios start lying. These are products
          FlowBond builds, operates, and sells itself.
        </p>
        <div className="plat-grid">
          {PLATFORMS.map((p, i) => (
            <a
              key={p.href}
              className={`plat-card reveal d${(i % 4) + 1}`}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h4>{p.name}</h4>
              <p>{p.what}</p>
              <span className="pc-go">Visit ↗</span>
            </a>
          ))}
        </div>
      </section>

      <div className="page-cta">
        <h2>Want something like one of these?</h2>
        <p>Tell us what your business does and where it is losing time. One conversation is enough to know.</p>
        <a href="/contact" className="btn btn-primary" data-mag>
          Start a project <span className="arr">→</span>
        </a>
      </div>
    </PageShell>
  )
}
