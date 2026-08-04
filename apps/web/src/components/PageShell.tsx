import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'

/** Shell for every page that is not the landing. `wide` drops the 70ch reading
 *  measure for pages that lay out in grids (/work, /services, /technology). */
export function PageShell({
  eyebrow,
  title,
  lead,
  updated,
  wide = false,
  children,
}: {
  eyebrow: string
  title: React.ReactNode
  lead?: string
  updated?: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="shell">
      <Nav />
      <main>
        <section className="doc" id="top">
          <header className="doc-head">
            <p className="section-tag">{eyebrow}</p>
            <h1>{title}</h1>
            {lead && <p className="doc-lead">{lead}</p>}
            {updated && <p className="doc-updated">Last updated: {updated}</p>}
          </header>
          <div className={wide ? 'doc-wide' : 'doc-body'}>{children}</div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
