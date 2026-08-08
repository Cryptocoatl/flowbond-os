import type { Metadata } from 'next'
import { PageShell } from '@/components/PageShell'
import { TECH_INTRO, STACK, SECURITY, ROADMAP, LAYER0 } from '@/content/technology'

export const metadata: Metadata = {
  title: 'Technology — FlowBond',
  description:
    'The foundation under every FlowBond product: one identity across products, per-person database access, payments through licensed providers, grounded intelligence, and append-only ledgers.',
  alternates: { canonical: '/technology' },
}

export default function TechnologyPage() {
  return (
    <PageShell
      eyebrow="Technology"
      title={
        <>
          One foundation, <em style={{ fontStyle: 'italic', color: 'var(--violet-bright)' }}>shaped per business</em>.
        </>
      }
      lead={TECH_INTRO.body}
      wide
    >
      <div className="l0-grid tech-grid">
        {STACK.map((s, i) => (
          <div key={s.ic} className={`l0-cell reveal${i ? ` d${(i % 4) + 1}` : ''}`}>
            <div className="ic">{s.ic}</div>
            <h4>{s.h4}</h4>
            <p>{s.p}</p>
            <p className="tech-detail">{s.detail}</p>
          </div>
        ))}
      </div>

      <section className="sec-block">
        <div className="section-tag reveal">{SECURITY.tag}</div>
        <h2 className="lead-h reveal d1" style={{ maxWidth: '20ch' }}>
          {SECURITY.h2}
        </h2>
        <div className="sec-grid">
          {SECURITY.points.map((p, i) => (
            <div key={p.h4} className={`sec-card reveal d${(i % 3) + 1}`}>
              <h4>{p.h4}</h4>
              <p>{p.p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sec-block">
        <div className="section-tag reveal">{ROADMAP.tag}</div>
        <h2 className="lead-h reveal d1" style={{ maxWidth: '22ch' }}>
          What is <em>not</em> real yet.
        </h2>
        <p className="mani-p reveal d2">{ROADMAP.lead}</p>
        <div className="sec-grid">
          {ROADMAP.items.map((r, i) => (
            <div key={r.h4} className={`sec-card sec-roadmap reveal d${(i % 3) + 1}`}>
              <h4>{r.h4}</h4>
              <p>{r.p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sec-block">
        <div className="section-tag reveal">{LAYER0.tag}</div>
        <h2 className="lead-h reveal d1" style={{ maxWidth: '20ch' }}>
          {LAYER0.h2}
        </h2>
        <p className="mani-p reveal d2">{LAYER0.body}</p>
        <p className="mani-p reveal d3">{LAYER0.bodyB}</p>
      </section>

      <div className="page-cta">
        <h2>Read the documentation.</h2>
        <p>How identity, payments, rewards, and intelligence work in practice — including what we do not offer yet.</p>
        <a href="/docs" className="btn btn-primary" data-mag>
          Open the docs <span className="arr">→</span>
        </a>
      </div>
    </PageShell>
  )
}
