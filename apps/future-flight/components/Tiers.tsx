import type { Membership, TicketTier } from '@/lib/content'
import { usd } from '@/lib/content'
import { Reveal } from './Reveal'
import { SectionHead } from './SectionHead'

/** The four reference tier glyphs, indexed to match the tier order. */
const TIER_ICONS = [
  <g key="explorer">
    <circle cx="20" cy="20" r="15" />
    <path d="M20 8v24M8 20h24" />
  </g>,
  <g key="founder">
    <path d="M20 4c6 4 8 12 8 18l-4 8h-8l-4-8c0-6 2-14 8-18Z" />
    <circle cx="20" cy="16" r="3" />
    <path d="M12 30l-3 6M28 30l3 6" />
  </g>,
  <g key="visionary">
    <path d="M8 15l6-8h12l6 8-12 18Z" />
    <path d="M8 15h24M14 7l6 8 6-8M20 15v18" />
  </g>,
  <path key="legacy" d="M6 14l7 6 7-12 7 12 7-6-3 18H9Z" />,
]

function TierIcon({ index }: { index: number }) {
  return (
    <svg className="ico" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
      {TIER_ICONS[index % TIER_ICONS.length]}
    </svg>
  )
}

export function Tiers({
  eyebrow,
  heading,
  tiers,
  membershipLabel,
  memberships,
  membershipNote,
}: {
  eyebrow: string
  heading: string
  tiers: TicketTier[]
  membershipLabel: string
  memberships: Membership[]
  membershipNote: string
}) {
  return (
    <section
      className="sec"
      id="tickets"
      style={{ background: 'linear-gradient(180deg,transparent,rgba(10,61,58,.10),transparent)' }}
    >
      <div className="wrap">
        <SectionHead eyebrow={eyebrow} heading={heading} />
        <div className="tiers">
          {tiers.map((t, i) => (
            <Reveal className={`tier${t.featured ? ' feat' : ''}`} key={t.name} delay={i * 0.05}>
              <TierIcon index={i} />
              <div className="name">{t.name}</div>
              <div className="seats">{t.seats} Seats</div>
              <ul>
                {t.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <div className="price">
                {usd(t.priceUSD)}
                <small>USD</small>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mem">
          <div className="lbl">
            {membershipLabel.split(' (').map((part, i) => (
              <span key={i} style={{ display: 'block' }}>
                {i === 0 ? part : `(${part}`}
              </span>
            ))}
          </div>
          <div className="cols">
            {memberships.map((m) => (
              <div className="c" key={m.name}>
                <b>{usd(m.priceUSD)}</b>
                <span>{m.name}</span>
              </div>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 12, maxWidth: 280 }}>
            {membershipNote}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
