import { RVBL as RVBL_CONTENT } from '@/content/site'

export function RVBL() {
  return (
    <section className="rvbl" id="rvbl">
      <div className="rvbl-tag reveal">{RVBL_CONTENT.tag}</div>
      <h2 className="rvbl-h reveal d1">
        Value that compounds when <em>life flourishes</em>.
      </h2>
      <p className="rvbl-p reveal d2">{RVBL_CONTENT.body}</p>
      <div className="rvbl-stats">
        {RVBL_CONTENT.stats.map((s, i) => (
          <div key={s.l} className={`stat reveal d${i + 1}`}>
            <span className="n">{s.n}</span>
            <span className="l">{s.l}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
