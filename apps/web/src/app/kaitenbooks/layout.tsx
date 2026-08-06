import type { Metadata } from 'next'
import { EB_Garamond, Source_Serif_4 } from 'next/font/google'
import './kaitenbooks.css'

// Self-hosted through next/font, like the rest of the site — no third-party
// request from a private page. Same two faces the trilogy engine sets the
// reader and the printed interior in, so what he writes looks like the book.
const garamond = EB_Garamond({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--kaiten-display',
})
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--kaiten-body',
})

export const metadata: Metadata = {
  title: 'Kaitenbooks',
  description: 'Private writing surface.',
  // Private by construction: unlisted, unlinked, and told not to be indexed.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
}

export default function KaitenLayout({ children }: { children: React.ReactNode }) {
  return <div className={`kaiten-fonts ${garamond.variable} ${sourceSerif.variable}`}>{children}</div>
}
