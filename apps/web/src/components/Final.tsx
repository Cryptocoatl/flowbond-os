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
        Build life-serving
        <br />
        <em>technology.</em>
      </h2>
      <p>{FINAL.body}</p>
      <ContactForm />
    </section>
  )
}
