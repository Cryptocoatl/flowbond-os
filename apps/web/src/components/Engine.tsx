import { ENGINE } from '@/content/site'

export function Engine() {
  return (
    <section className="engine">
      <div className="section-tag reveal">{ENGINE.tag}</div>
      <h2 className="lead-h reveal d1" style={{ maxWidth: '22ch' }}>
        Founder-led. Collaborator-powered. Investor-backed.
      </h2>
      <div className="eng-grid">
        {ENGINE.cards.map((c, i) => (
          <div key={c.n} className={`eng-card reveal d${i + 1}`}>
            <div className="n">{c.n}</div>
            <h4>{c.h4}</h4>
            <p>{c.p}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
