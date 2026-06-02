import { LAYER0 } from '@/content/site'

export function Layer0() {
  return (
    <section className="layer0" id="layer0">
      <div className="l0-top">
        <h2 className="l0-h reveal">
          One layer beneath everything you ship.
          <span className="mono reveal d1">FBID · the universal address for life.</span>
        </h2>
        <p className="l0-lead reveal d2">{LAYER0.lead}</p>
      </div>
      <div className="l0-grid">
        {LAYER0.cells.map((c, i) => (
          <div key={c.ic} className={`l0-cell reveal${i ? ` d${i}` : ''}`}>
            <div className="ic">{c.ic}</div>
            <h4>{c.h4}</h4>
            <p>{c.p}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
