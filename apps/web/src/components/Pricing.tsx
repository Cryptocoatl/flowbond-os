'use client'

import { useState } from 'react'
import { TIERS, PRICE_NOTE } from '@/content/pricing'

export function Pricing() {
  const [annual, setAnnual] = useState(false)

  return (
    <section className="pricing" id="pricing">
      <div className="section-tag reveal">Pricing</div>
      <h2 className="lead-h reveal d1" style={{ maxWidth: '18ch' }}>
        Start at <span className="g">$14</span>. Scale to a network.
      </h2>
      <div className={`toggle reveal d1${annual ? ' annual' : ''}`} id="toggle" onClick={() => setAnnual((a) => !a)} role="switch" aria-checked={annual} aria-label="Toggle annual billing">
        <span className={`lblM${annual ? '' : ' on'}`}>Monthly</span>
        <div className="sw"></div>
        <span className={`lblA${annual ? ' on' : ''}`}>
          Annual <span className="save">· 2 months free</span>
        </span>
      </div>
      <div className="price-grid">
        {TIERS.map((t) => {
          const amount = t.monthly === null ? null : annual ? t.annual! : t.monthly
          return (
            <div key={t.name} className={`tier${t.featured ? ' feat' : ''} reveal d${TIERS.indexOf(t) + 1}`}>
              <div className="name">{t.name}</div>
              <div className="who">{t.who}</div>
              {amount === null ? (
                <div className="amt custom">{t.customLabel}</div>
              ) : (
                <div className="amt">
                  <span className="cur">$</span>
                  {amount.toLocaleString()}
                </div>
              )}
              <div className="per">{t.monthly === null ? t.perCustom : annual ? '/ year' : '/ month'}</div>
              <ul>
                {t.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <a href="#contact" className="pick" data-mag>
                {t.cta}
              </a>
            </div>
          )
        })}
      </div>
      <p className="price-note">{PRICE_NOTE}</p>
    </section>
  )
}
