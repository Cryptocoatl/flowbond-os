import { TRINITY } from '@/content/site'

export function Trinity() {
  return (
    <section className="trinity" id="trinity">
      <div className="section-tag reveal">{TRINITY.tag}</div>
      <h2 className="lead-h reveal d1" style={{ maxWidth: '22ch' }}>
        One layer. Three forces.
        <br />
        Woven into a single primitive.
      </h2>
      <div className="tri-grid">
        {TRINITY.cards.map((c, i) => (
          <article key={c.cls} className={`tri-card ${c.cls} reveal d${i + 1}`}>
            <span className="tri-num">{c.num}</span>
            <svg className="tri-octa" viewBox="0 0 100 100" fill="none" aria-hidden="true">
              <polygon points="50,6 78,20 94,50 78,80 50,94 22,80 6,50 22,20" stroke={c.stroke} strokeWidth="3" />
              <circle cx="50" cy="50" r="9" fill={c.stroke} opacity=".4" />
            </svg>
            <div className="tri-kicker">{c.kicker}</div>
            <h3>{c.h3}</h3>
            <p>{c.body}</p>
            <div className="feat">
              {c.feats.map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
