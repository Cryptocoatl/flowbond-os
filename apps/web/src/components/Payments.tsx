import { PAYMENTS } from '@/content/site'

export function Payments() {
  return (
    <section className="layer0" id="payments">
      <div className="l0-top">
        <h2 className="l0-h reveal">
          {PAYMENTS.h2}
          <span className="mono reveal d1">In where they are · out where you are.</span>
        </h2>
        <p className="l0-lead reveal d2">{PAYMENTS.body}</p>
      </div>
      <div className="l0-grid">
        {PAYMENTS.cells.map((c, i) => (
          <div key={c.ic} className={`l0-cell reveal${i ? ` d${i}` : ''}`}>
            <div className="ic">{c.ic}</div>
            <h4>{c.h4}</h4>
            <p>{c.p}</p>
          </div>
        ))}
      </div>
      {/* Load-bearing. This is the sentence that keeps the business correctly
          classified — do not soften it into marketing language. */}
      <p className="disclosure reveal">{PAYMENTS.disclosure}</p>
    </section>
  )
}
