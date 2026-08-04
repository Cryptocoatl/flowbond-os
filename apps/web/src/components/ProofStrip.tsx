import { PROOF } from '@/content/site'

/** Real businesses, each link verified live before shipping. Never put a gated
 *  or dead site in here. Sits at the tail of the page as supporting evidence —
 *  `proof--tail` keeps it deliberately quieter than the service sections. */
export function ProofStrip() {
  return (
    <section className="proof proof--tail" id="proof">
      <div className="section-tag reveal">{PROOF.tag}</div>
      <h2 className="lead-h reveal d1" style={{ maxWidth: '20ch' }}>
        {PROOF.lead}
      </h2>
      <div className="proof-grid">
        {PROOF.items.map((it, i) => (
          <a
            key={it.href}
            className={`proof-card reveal d${(i % 4) + 1}`}
            href={it.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="pc-name">{it.name}</span>
            <span className="pc-what">{it.what}</span>
            <span className="pc-go">Visit ↗</span>
          </a>
        ))}
      </div>
      <div className="proof-cta reveal">
        <a href={PROOF.cta.href} className="btn btn-ghost" data-mag>
          {PROOF.cta.label} <span className="arr">→</span>
        </a>
      </div>
    </section>
  )
}
