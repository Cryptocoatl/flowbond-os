import type { Edition, RouteStop } from '@/lib/content'
import { HeroCrest } from './brand/Marks'
import { Reveal } from './Reveal'
import { Countdown } from './Countdown'

export function Hero({ edition, routeStrip }: { edition: Edition; routeStrip: RouteStop[] }) {
  return (
    <header className="hero">
      <div className="hero-bg" />
      <div className="hero-rays" aria-hidden="true" />
      <div className="hero-embers" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className={`ember ember-${i}`} />
        ))}
      </div>
      <div className="wrap">
        <Reveal className="route-strip">
          {routeStrip.map((s) => (
            <div key={s.label} className={s.highlight ? 'gold' : undefined}>
              {s.label}
              <small>{s.dates}</small>
            </div>
          ))}
        </Reveal>

        <div className="portal-wrap">
          <div className="portal" />
          <div className="portal-inner" />
          <HeroCrest />
        </div>

        <Reveal>
          <h1>
            {edition.wordmarkTop}
            <span className="fl">{edition.wordmarkBottom}</span>
          </h1>
        </Reveal>
        <Reveal className="sub">{edition.routeLabel}</Reveal>
        <Reveal className="date">{edition.dateLabel}</Reveal>
        <Reveal className="tag">{edition.tagline}</Reveal>

        <Reveal>
          <Countdown departISO={edition.departISO} />
        </Reveal>

        <Reveal>
          <a className="btn btn-solid" href="#tickets">
            Join the journey
          </a>
        </Reveal>
      </div>
    </header>
  )
}
