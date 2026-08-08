import { INTELLIGENCE } from '@/content/site'
import { Terminal } from './Terminal'

export function Intelligence() {
  return (
    <section className="flowme" id="intelligence">
      <div className="section-tag reveal">{INTELLIGENCE.tag}</div>
      <div className="fm-grid">
        <div className="fm-copy reveal">
          <h2>
            Not a chatbot <span className="v">bolted on the side.</span>
          </h2>
          <p>{INTELLIGENCE.body}</p>
          <p style={{ marginTop: '18px' }}>
            <b>{INTELLIGENCE.bodyB}</b>
          </p>
          <div className="fm-list">
            {INTELLIGENCE.list.map((item) => (
              <div key={item.ic}>
                <span className="ic">{item.ic}</span>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="term reveal d1">
          <div className="term-bar">
            <span className="d"></span>
            <span className="d"></span>
            <span className="d"></span>
            <span>flowme&nbsp;os&nbsp;·&nbsp;live</span>
          </div>
          <Terminal />
        </div>
      </div>
    </section>
  )
}
