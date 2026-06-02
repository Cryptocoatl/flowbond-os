import type { Metadata } from 'next'
import { Fraunces, Space_Mono, Hanken_Grotesk, Caveat } from 'next/font/google'
import '@flowbond/ui/tokens.css'
import './globals.css'

// Self-hosted via next/font (no Google CDN <link>).
const fraunces = Fraunces({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', variable: '--font-fraunces' })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], display: 'swap', variable: '--font-space-mono' })
const hanken = Hanken_Grotesk({ subsets: ['latin'], display: 'swap', variable: '--font-hanken' })
const caveat = Caveat({ subsets: ['latin'], display: 'swap', variable: '--font-caveat' })

const TITLE = 'FlowBond — Investor Deck'
const DESCRIPTION =
  'FlowBond is the Layer 0 of Life — sovereign identity, native value, and FlowMe OS intelligence in one layer beneath every app. The investor deck.'

export const metadata: Metadata = {
  metadataBase: new URL('https://deck.flowbond.life'),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://deck.flowbond.life',
    siteName: 'FlowBond',
    type: 'website',
    // og:image is supplied by app/opengraph-image.tsx (file-based convention).
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${spaceMono.variable} ${hanken.variable} ${caveat.variable}`}>
      <body>{children}</body>
    </html>
  )
}
