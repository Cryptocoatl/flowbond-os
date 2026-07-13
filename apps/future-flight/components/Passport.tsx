import type { PassportPreview, PassportFeature } from '@/lib/content'
import { Reveal } from './Reveal'

export function Passport({
  eyebrow,
  heading,
  preview,
  features,
}: {
  eyebrow: string
  heading: string
  preview: PassportPreview
  features: PassportFeature[]
}) {
  return (
    <section className="sec" id="passport">
      <div className="wrap pass">
        <Reveal>
          <div className="phone">
            <div className="top">
              <span>9:41</span>
              <span aria-hidden="true">▮▮▮ ⌁ ▮</span>
            </div>
            <div className="who">
              <b>{preview.name}</b>
              <span>{preview.role}</span>
            </div>
            <div className="rt">
              {preview.route}
              <small>{preview.date}</small>
            </div>
            <div className="rows">
              {preview.rows.map((r) => (
                <div className="row" key={r.label}>
                  <span>{r.label}</span>
                  <b className={r.gold ? 'gold' : undefined}>{r.value}</b>
                </div>
              ))}
            </div>
            <div className="qr" aria-label="QR code" />
          </div>
        </Reveal>

        <Reveal>
          <div className="eyebrow">{eyebrow}</div>
          <h2 style={{ fontSize: 32, letterSpacing: '.08em', margin: '12px 0 22px' }}>{heading}</h2>
          <ul className="pass-feat">
            {features.map((f) => (
              <li key={f.title}>
                <span className="fi" aria-hidden="true">
                  {f.icon}
                </span>
                <div>
                  <b>{f.title}</b>
                  <p>{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
