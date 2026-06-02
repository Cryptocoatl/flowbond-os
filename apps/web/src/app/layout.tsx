import type { Metadata } from 'next'
import { Fraunces, Space_Mono, Hanken_Grotesk, Caveat } from 'next/font/google'
import { FlowEditProvider } from '@flowbond/flowedit'
import { LivingField, MagneticCursor } from '@flowbond/ui'
import { ScrollReveal } from '@/components/ScrollReveal'
import '@flowbond/ui/tokens.css'
import './globals.css'

// Self-hosted via next/font (no Google CDN <link>) — required for Lighthouse perf.
const fraunces = Fraunces({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', variable: '--font-fraunces' })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], display: 'swap', variable: '--font-space-mono' })
const hanken = Hanken_Grotesk({ subsets: ['latin'], display: 'swap', variable: '--font-hanken' })
const caveat = Caveat({ subsets: ['latin'], display: 'swap', variable: '--font-caveat' })

const TITLE = 'FlowBond — If you can imagine it, you can program it'
const DESCRIPTION =
  'FlowBond is the Layer 0 of Life — sovereign identity, native value, and FlowMe OS intelligence in one layer beneath every app you build. Technology, mastered in service of life.'

export const metadata: Metadata = {
  metadataBase: new URL('https://flowbond.life'),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://flowbond.life',
    siteName: 'FlowBond',
    type: 'website',
    // og:image is supplied by app/opengraph-image.tsx (file-based convention).
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const FLOWEDIT_API = process.env.NEXT_PUBLIC_FLOWEDIT_API_URL ?? 'http://localhost:4000'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${spaceMono.variable} ${hanken.variable} ${caveat.variable}`}>
      <body>
        <FlowEditProvider siteId="flowbond-life" apiUrl={FLOWEDIT_API}>
          {/* Ambient background layers, ported from the prototype */}
          <LivingField />
          <div className="atmos" aria-hidden="true"></div>
          <div className="vign" aria-hidden="true"></div>
          <svg className="grain" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <filter id="grain-n">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#grain-n)" />
          </svg>
          <MagneticCursor />
          <ScrollReveal />
          {children}
        </FlowEditProvider>
      </body>
    </html>
  )
}
