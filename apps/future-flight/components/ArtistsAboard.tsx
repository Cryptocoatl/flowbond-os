/* eslint-disable @next/next/no-img-element */
import type { ArtistsSection } from '@/lib/content'
import { Reveal } from './Reveal'
import { SectionHead } from './SectionHead'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function ArtistsAboard({ eyebrow, heading, subtitle, members, collab }: ArtistsSection) {
  return (
    <section className="sec" id="artists">
      <div className="wrap">
        <SectionHead eyebrow={eyebrow} heading={heading} />
        <Reveal className="artists-sub">{subtitle}</Reveal>

        <div className="artists">
          {members.map((a, i) => (
            <Reveal className="artist" key={a.name} delay={i * 0.06}>
              <div className="artist-av">
                {a.photo ? (
                  <img src={a.photo} alt={a.name} />
                ) : (
                  <span aria-hidden="true">{initials(a.name)}</span>
                )}
              </div>
              <div className="artist-name">{a.name}</div>
              <div className="artist-tag">{a.tag}</div>
            </Reveal>
          ))}
        </div>

        <Reveal className="artists-collab">
          <span className="cc-label">{collab.label}</span>
          <span className="cc-name">{collab.name}</span>
          <span className="cc-note">{collab.note}</span>
        </Reveal>
      </div>
    </section>
  )
}
