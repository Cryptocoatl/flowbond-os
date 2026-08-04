import type { Block } from '@/content/docs'

/** Renders the structured doc blocks. Typed content beats loose markdown here:
 *  the compiler catches a malformed table before a reader does. */
export function DocBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h':
            return <h2 key={i}>{b.c}</h2>
          case 'p':
            return <p key={i}>{b.c}</p>
          case 'ul':
            return (
              <ul key={i}>
                {b.c.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            )
          case 'note':
            return (
              <div className="doc-note" key={i}>
                <p>{b.c}</p>
              </div>
            )
          case 'steps':
            return (
              <div className="doc-steps" key={i}>
                {b.c.map((s, n) => (
                  <div className="doc-step" key={s.h}>
                    <span className="ds-n">{String(n + 1).padStart(2, '0')}</span>
                    <div>
                      <h4>{s.h}</h4>
                      <p>{s.p}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          case 'table':
            return (
              <div className="doc-table-wrap" key={i}>
                <table className="doc-table">
                  <thead>
                    <tr>
                      {b.head.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r) => (
                      <tr key={r.join('|')}>
                        {r.map((cell, ci) => (
                          <td key={ci}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      })}
    </>
  )
}
