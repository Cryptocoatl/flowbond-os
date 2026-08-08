import type { Metadata } from 'next'
import { PageShell } from '@/components/PageShell'
import { LINKS } from '@/content/site'

export const metadata: Metadata = {
  title: 'Contact — FlowBond',
  description:
    'Reach FlowBond for product, integration, or billing questions. B2B infrastructure for independent consumer applications.',
  alternates: { canonical: '/contact' },
}

const CHANNELS = [
  { k: 'General & sales', email: 'hello@flowbond.life' },
  { k: 'Customer support', email: 'support@flowbond.life' },
]

export default function ContactPage() {
  return (
    <PageShell eyebrow="Company" title="Contact FlowBond">
      <p>
        FlowBond builds <b>B2B infrastructure for independent consumer applications</b>. For product, integration, or
        billing questions, reach us directly.
      </p>

      <div className="doc-contact">
        {CHANNELS.map((c) => (
          <div className="row" key={c.email}>
            <span className="k">{c.k}</span>
            <a href={`mailto:${c.email}`}>{c.email}</a>
          </div>
        ))}
      </div>

      <div className="doc-outro">
        <p>We respond to support requests within two business days.</p>
      </div>

      <p>
        <a href={LINKS.docs}>Documentation ↗</a>
      </p>
    </PageShell>
  )
}
