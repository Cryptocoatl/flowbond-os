import { FOOTER } from '@/content/site'

export function Footer() {
  return (
    <footer>
      <div className="foot-grid">
        <div className="foot-brand">
          <a href="#top" className="brand" data-mag>
            <span>
              <b>FLOW</b>BOND
            </span>
          </a>
          <p>{FOOTER.brandBlurb}</p>
          <p className="foot-credit">
            {FOOTER.credit} — <b>{FOOTER.creditName}</b>
          </p>
        </div>
        {FOOTER.cols.map((col) => (
          <div className="foot-col" key={col.h5}>
            <h5>{col.h5}</h5>
            {col.links.map((l) => (
              <a key={l.label} href={l.href}>
                {l.label}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div className="foot-bottom">
        <span>{FOOTER.copyright}</span>
        <span className="tag">{FOOTER.tagline}</span>
      </div>
    </footer>
  )
}
