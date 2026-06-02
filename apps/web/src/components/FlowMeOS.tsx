import { FLOWME } from '@/content/site'
import { Terminal } from './Terminal'

export function FlowMeOS() {
  return (
    <section className="flowme" id="flowme">
      <div className="section-tag reveal">{FLOWME.tag}</div>
      <div className="fm-grid">
        <div className="fm-copy reveal">
          <h2>
            The OS that <span className="v">thinks with you.</span>
          </h2>
          <p>
            <b>FlowMe OS</b> is the agentic intelligence woven through the FlowBond stack — a Claude-powered operating layer that
            reasons over identity, presence, and value, so your product can act, not just store.
          </p>
          <div className="fm-list">
            {FLOWME.list.map((item) => (
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
