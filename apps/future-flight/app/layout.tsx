import type { Metadata, Viewport } from 'next'
import { Orbitron, Montserrat } from 'next/font/google'
import './globals.css'

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://futureflight.flowme.one'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Future Flight — Miami → Tulum',
  description:
    'A curated innovation journey. Miami → Tulum, December 8, 2026. The journey begins before we land.',
  openGraph: {
    title: 'Future Flight — Miami → Tulum',
    description: 'One flight. One community. Infinite impact. December 8, 2026.',
    url: siteUrl,
    siteName: 'Future Flight',
    images: ['/brand/og-image.jpg'],
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/brand/favicon.ico', sizes: 'any' },
      { url: '/brand/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/brand/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/brand/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0D0D0F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${montserrat.variable} dark`}>
      <body>{children}</body>
    </html>
  )
}
