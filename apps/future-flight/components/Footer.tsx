import { Monogram } from './brand/Marks'
import { Reveal } from './Reveal'

export function Footer({ creed, poweredBy }: { creed: string[]; poweredBy: string }) {
  return (
    <footer className="footer">
      <div className="wrap">
        {/* Flat span sequence (word · word · …) so the `.creed span:nth-child(even)`
            rule tints the separators gold, exactly like the reference. */}
        <Reveal className="creed">
          {creed.flatMap((c, i) => {
            const nodes = [<span key={`w-${i}`}>{c}</span>]
            if (i < creed.length - 1) {
              nodes.push(
                <span key={`d-${i}`} aria-hidden="true">
                  ·
                </span>,
              )
            }
            return nodes
          })}
        </Reveal>
        <div className="foot-b">
          <Monogram size={26} />
          {poweredBy}
        </div>
      </div>
    </footer>
  )
}
