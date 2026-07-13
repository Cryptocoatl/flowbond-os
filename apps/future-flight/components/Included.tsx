import type { IncludedItem } from '@/lib/content'
import { Reveal } from './Reveal'
import { SectionHead } from './SectionHead'

export function Included({ eyebrow, items }: { eyebrow: string; items: IncludedItem[] }) {
  return (
    <section className="sec" style={{ background: 'var(--charcoal)' }}>
      <div className="wrap">
        <SectionHead eyebrow={eyebrow} />
        <Reveal className="incl">
          {items.map((it) => (
            <div className="it" key={it.label}>
              <span className="c" aria-hidden="true">
                {it.icon}
              </span>
              <span>{it.label}</span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
