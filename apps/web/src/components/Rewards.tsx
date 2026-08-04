import { REWARDS } from '@/content/site'

export function Rewards() {
  return (
    <section className="layer0" id="rewards">
      <div className="l0-top">
        <h2 className="l0-h reveal">
          {REWARDS.h2}
          <span className="mono reveal d1">One account · earned by doing.</span>
        </h2>
        <div>
          <p className="l0-lead reveal d2">{REWARDS.body}</p>
          <p className="l0-lead reveal d3" style={{ marginTop: '16px' }}>
            {REWARDS.bodyB}
          </p>
        </div>
      </div>
      <div className="l0-grid">
        {REWARDS.cells.map((c, i) => (
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
