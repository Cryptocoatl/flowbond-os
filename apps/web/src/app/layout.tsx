import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FlowBond OS',
  description: 'API-first multi-client ecosystem',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
