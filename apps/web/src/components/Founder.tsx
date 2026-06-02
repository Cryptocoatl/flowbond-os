import Image from 'next/image'
import { FOUNDER } from '@/content/site'
import steph from '../../public/steph_portrait.jpg'

export function Founder() {
  return (
    <section className="founder" id="founder">
      <div className="section-tag reveal">{FOUNDER.tag}</div>
      <div className="f-grid">
        <div className="f-portrait reveal">
          <Image
            className="f-photo"
            src={steph}
            alt={`${FOUNDER.name}, ${FOUNDER.role}`}
            fill
            sizes="(max-width: 920px) 100vw, 40vw"
            placeholder="blur"
            priority={false}
          />
          <div className="ovl"></div>
          <div className="ph">{FOUNDER.photoCaption}</div>
        </div>
        <div className="f-copy reveal d1">
          <div className="role">{FOUNDER.role}</div>
          <h2>{FOUNDER.name}</h2>
          {FOUNDER.paras.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="gk-line">{FOUNDER.gkLine}</p>
          <blockquote className="f-quote">
            {FOUNDER.quote}
            <span className="src">{FOUNDER.quoteSrc}</span>
          </blockquote>
          <div className="f-facets">
            {FOUNDER.facets.map((f) => (
              <div className="facet" key={f.fi}>
                <span className="fi">{f.fi}</span>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
          <div className="f-tags">
            {FOUNDER.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
