import type { ExperienceStep } from '@/lib/content'
import { Reveal } from './Reveal'
import { SectionHead } from './SectionHead'

export function ExperienceTimeline({
  eyebrow,
  heading,
  steps,
}: {
  eyebrow: string
  heading: string
  steps: ExperienceStep[]
}) {
  return (
    <section className="sec" id="experience">
      <div className="wrap">
        <SectionHead eyebrow={eyebrow} heading={heading} />
        <div className="timeline">
          {steps.map((s, i) => (
            <Reveal className="step" key={s.n} delay={i * 0.05}>
              <div className="n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
