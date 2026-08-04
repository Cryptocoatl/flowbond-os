import { OctagonSeal } from '@flowbond/ui'
import { FINAL } from '@/content/site'
import { ContactForm } from './ContactForm'

export function Final() {
  return (
    <section className="final" id="contact">
      <div className="final-seal">
        <OctagonSeal />
      </div>
      <h2>
        {FINAL.h2a}
        <br />
        <em>{FINAL.h2b}.</em>
      </h2>
      <p>{FINAL.body}</p>
      <ContactForm />
      <div className="proof-cta reveal" style={{ marginTop: '34px' }}>
        <a href="/contact" className="btn btn-ghost" data-mag>
          Or write to us directly <span className="arr">→</span>
        </a>
      </div>
    </section>
  )
}
