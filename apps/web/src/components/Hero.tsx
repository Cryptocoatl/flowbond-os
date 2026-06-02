import { OctagonSeal } from '@flowbond/ui'
import { HERO, LINKS } from '@/content/site'

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="seal-wrap">
        <OctagonSeal />
      </div>
      <div className="hero-inner">
        <span className="eyebrow reveal in">
          <span className="dot"></span>
          {HERO.eyebrow}
        </span>
        <h1 className="hero-h">
          <span className="imagine">If you can imagine&nbsp;it,</span>
          <br />
          <span className="program">
            you can <span className="k">program</span> it<span className="k">.</span>
          </span>
        </h1>
        <p className="credit">
          {HERO.creditPrefix} <b>{HERO.creditName}</b> ✦
        </p>
        <p className="hero-sub">
          FlowBond is the living infrastructure for a regenerative internet — <b>identity, value, and intelligence</b> woven into one
          layer beneath every app you build. Technology, mastered in service of life.
        </p>
        <div className="cta-row">
          <a href="#pricing" className="btn btn-primary" data-mag>
            {HERO.ctaPrimary} <span className="arr">→</span>
          </a>
          <a href={LINKS.deck} className="btn btn-ghost" data-mag>
            {HERO.ctaGhost}
          </a>
        </div>
      </div>
      <div className="scrollcue">
        <span>scroll</span>
        <span className="line"></span>
      </div>
    </section>
  )
}
