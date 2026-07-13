import type { Stat } from '@/lib/content'
import { Reveal } from './Reveal'

export function Stats({ stats }: { stats: Stat[] }) {
  return (
    <section className="sec">
      <Reveal className="wrap stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <b>{s.value}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </Reveal>
    </section>
  )
}
