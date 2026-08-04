import type { Metadata } from 'next'
import { PageShell } from '@/components/PageShell'
import { OFFERINGS, ENGAGEMENT, FAQ } from '@/content/services'

export const metadata: Metadata = {
  title: 'Services & pricing — FlowBond',
  description:
    'What FlowBond builds — websites, platforms, apps, intelligence, payments, rewards — and how we charge for it: fixed-price projects, monthly care plans, and product subscriptions.',
  alternates: { canonical: '/services' },
}

export default function ServicesPage() {
  return (
    <PageShell
      eyebrow="Services"
      title={
        <>
          What we build, and <em style={{ fontStyle: 'italic', color: 'var(--gold-bright)' }}>what it costs you</em>.
        </>
      }
      lead="No hourly meter. You approve a scope and a price before anything starts, and the number does not move unless you ask for something that was not in it."
      wide
    >
      <div className="svc-grid">
        {OFFERINGS.map((o, i) => (
          <article key={o.h4} className={`svc-card svc-${o.accent} reveal d${(i % 4) + 1}`}>
            <span className="svc-tag">{o.tag}</span>
            <h3>{o.h4}</h3>
            <p>{o.p}</p>
            <ul>
              {o.includes.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className="svc-price">{o.priceNote}</p>
          </article>
        ))}
      </div>

      <section className="engine" style={{ paddingInline: 0 }}>
        <div className="section-tag reveal">{ENGAGEMENT.tag}</div>
        <h2 className="lead-h reveal d1" style={{ maxWidth: '22ch' }}>
          Three ways money changes hands.
        </h2>
        <p className="mani-p reveal d2">{ENGAGEMENT.lead}</p>
        <div className="eng-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {ENGAGEMENT.models.map((m, i) => (
            <div key={m.n} className={`eng-card reveal d${i + 1}`}>
              <div className="n">{m.n}</div>
              <h4>{m.h4}</h4>
              <p>{m.p}</p>
            </div>
          ))}
        </div>
        <p className="disclosure reveal">{ENGAGEMENT.note}</p>
      </section>

      <section className="faq">
        <div className="section-tag reveal">Straight answers</div>
        <h2 className="lead-h reveal d1" style={{ maxWidth: '20ch' }}>
          The questions everyone asks.
        </h2>
        <div className="faq-list">
          {FAQ.map((f, i) => (
            <div key={f.q} className={`faq-item reveal d${(i % 3) + 1}`}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="page-cta">
        <h2>Get a number in writing.</h2>
        <p>One conversation, no charge, and an honest opinion whether or not you hire us.</p>
        <a href="/contact" className="btn btn-primary" data-mag>
          Start a project <span className="arr">→</span>
        </a>
      </div>
    </PageShell>
  )
}
