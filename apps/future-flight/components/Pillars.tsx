import type { Pillar } from '@/lib/content'
import { Reveal } from './Reveal'

export function Pillars({ pillars, band }: { pillars: Pillar[]; band: string }) {
  return (
    <section>
      <Reveal className="wrap pillars">
        {pillars.map((p) => (
          <div className="pillar" key={p.label}>
            <span className="ring" aria-hidden="true">
              {p.icon}
            </span>
            <span>{p.label}</span>
          </div>
        ))}
      </Reveal>
      <hr className="hair" />
      <Reveal className="band">{band}</Reveal>
      <hr className="hair" />
    </section>
  )
}
