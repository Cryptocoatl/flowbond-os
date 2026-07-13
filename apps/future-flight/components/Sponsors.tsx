import type { SponsorPackage } from '@/lib/content'
import { usd } from '@/lib/content'
import { Reveal } from './Reveal'
import { SectionHead } from './SectionHead'

export function Sponsors({
  eyebrow,
  heading,
  packages,
}: {
  eyebrow: string
  heading: string
  packages: SponsorPackage[]
}) {
  return (
    <section className="sec" id="sponsors">
      <div className="wrap">
        <SectionHead eyebrow={eyebrow} heading={heading} />
        <div className="spons">
          {packages.map((p, i) => (
            <Reveal className="spon" key={p.name} delay={i * 0.05}>
              <div>
                <h3>
                  {p.name} <span className="slot">({p.slots})</span>
                </h3>
                <ul>
                  {p.benefits.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
              <div className="amt">{usd(p.amountUSD)}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
