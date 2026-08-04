import { HOW } from '@/content/site'

export function How() {
  return (
    <section className="engine" id="how">
      <div className="section-tag reveal">{HOW.tag}</div>
      <h2 className="lead-h reveal d1" style={{ maxWidth: '22ch' }}>
        You know the price before we start.
      </h2>
      <p className="mani-p reveal d2">{HOW.lead}</p>
      <div className="eng-grid">
        {HOW.cards.map((c, i) => (
          <div key={c.n} className={`eng-card reveal d${i + 1}`}>
            <div className="n">{c.n}</div>
            <h4>{c.h4}</h4>
            <p>{c.p}</p>
          </div>
        ))}
      </div>
      <div className="proof-cta reveal">
        <a href="/services" className="btn btn-ghost" data-mag>
          Services &amp; how we charge <span className="arr">→</span>
        </a>
      </div>
    </section>
  )
}
