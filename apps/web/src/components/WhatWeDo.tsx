import { WHATWEDO } from '@/content/site'

export function WhatWeDo() {
  return (
    <section className="trinity" id="what-we-do">
      <div className="section-tag reveal">{WHATWEDO.tag}</div>
      <h2 className="lead-h reveal d1" style={{ maxWidth: '20ch' }}>
        Build it. <span className="g">Run it.</span> <em>Grow it.</em>
      </h2>
      <p className="mani-p reveal d2">{WHATWEDO.lead}</p>
      <div className="tri-grid">
        {WHATWEDO.cards.map((c, i) => (
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
