import { SERVICES } from '@/content/site'

export function Services() {
  return (
    <section className="svc" id="services">
      <div className="section-tag reveal">{SERVICES.tag}</div>
      <h2 className="lead-h reveal d1" style={{ maxWidth: '20ch' }}>
        Products to build on. Services to build with you.
      </h2>
      <div className="svc-grid">
        <div className="svc-col reveal d1">
          <h3>Products</h3>
          {SERVICES.products.map((s) => (
            <div className="svc-item" key={s.h4}>
              <span className="tag">{s.tag}</span>
              <div>
                <h4>{s.h4}</h4>
                <p>{s.p}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="svc-col reveal d2">
          <h3>Services</h3>
          {SERVICES.services.map((s) => (
            <div className="svc-item" key={s.h4}>
              <span className="tag">{s.tag}</span>
              <div>
                <h4>{s.h4}</h4>
                <p>{s.p}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
