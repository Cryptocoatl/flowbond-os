import type { EscrowNode } from '@/lib/content'
import { Reveal } from './Reveal'
import { SectionHead } from './SectionHead'

export function EscrowFlow({
  eyebrow,
  heading,
  nodes,
  trust,
  ctaHeading,
}: {
  eyebrow: string
  heading: string
  nodes: EscrowNode[]
  trust: string[]
  ctaHeading: string
}) {
  return (
    <section className="sec" id="apply">
      <div className="wrap">
        <SectionHead eyebrow={eyebrow} heading={heading} />
        <Reveal className="flow">
          {nodes.map((n, i) => (
            <div key={n.label} style={{ display: 'contents' }}>
              <div className={`node${n.highlight ? ' hl' : ''}`}>
                {n.label}
                <small>{n.sub}</small>
              </div>
              {i < nodes.length - 1 ? (
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
            </div>
          ))}
        </Reveal>
        <Reveal className="trust">
          {trust.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </Reveal>
        <Reveal className="cta-final">
          <h2>{ctaHeading}</h2>
          <a className="btn btn-solid" href="#tickets" style={{ padding: '16px 34px' }}>
            Secure your seat
          </a>
        </Reveal>
      </div>
    </section>
  )
}
