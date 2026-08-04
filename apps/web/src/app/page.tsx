import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { ProofStrip } from '@/components/ProofStrip'
import { WhatWeDo } from '@/components/WhatWeDo'
import { Intelligence } from '@/components/Intelligence'
import { Payments } from '@/components/Payments'
import { Rewards } from '@/components/Rewards'
import { How } from '@/components/How'
import { Final } from '@/components/Final'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = { alternates: { canonical: '/' } }

/** The landing sells outcomes in plain language. Depth lives on /work,
 *  /services, /technology and /docs — progressive disclosure, not a wall. */
export default function Home() {
  return (
    <div className="shell">
      <Nav />
      <main>
        <Hero />
        <WhatWeDo />
        <Intelligence />
        <Payments />
        <Rewards />
        <How />
        {/* Examples land after the services — proof that closes the argument,
            not the opening pitch. */}
        <ProofStrip />
        <Final />
      </main>
      <Footer />
    </div>
  )
}
