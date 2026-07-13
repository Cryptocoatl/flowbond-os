import { Reveal } from './Reveal'

export function SectionHead({ eyebrow, heading }: { eyebrow: string; heading?: string }) {
  return (
    <Reveal className="head">
      <div className="eyebrow">{eyebrow}</div>
      {heading ? <h2>{heading}</h2> : null}
    </Reveal>
  )
}
