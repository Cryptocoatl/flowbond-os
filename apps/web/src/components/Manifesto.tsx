import { MANIFESTO } from '@/content/site'

export function Manifesto() {
  return (
    <section className="manifesto reveal">
      <div className="section-tag">{MANIFESTO.tag}</div>
      <h2 className="lead-h" style={{ maxWidth: '18ch' }}>
        We are not here to extract.
        <br />
        We are here to <em>regenerate</em> — to put the <span className="v">mastery of technology</span> back in{' '}
        <span className="g">service of life</span>.
      </h2>
      <p className="mani-p">{MANIFESTO.body}</p>
    </section>
  )
}
