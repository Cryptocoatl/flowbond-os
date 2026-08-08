import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Founder } from '@/components/Founder'
import { Engine } from '@/components/Engine'

export const metadata: Metadata = {
  title: 'Founder — FlowBond',
  description:
    'Steph Ferrera, founder of FlowBond — ecosystem builder, full-stack shipper, and the person behind every product on this site.',
  alternates: { canonical: '/founder' },
}

/** Moved off the landing page deliberately: the landing sells the work, this
 *  page is for people who want to know who is behind it before they sign. */
export default function FounderPage() {
  return (
    <div className="shell">
      <Nav />
      <main className="founder-page">
        <Founder />
        <Engine />
        <div className="page-cta">
          <h2>Work with us.</h2>
          <p>Tell us what your business does and where it is losing time or money.</p>
          <a href="/contact" className="btn btn-primary" data-mag>
            Start a project <span className="arr">→</span>
          </a>
        </div>
      </main>
      <Footer />
    </div>
  )
}
