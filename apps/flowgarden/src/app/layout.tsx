import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FlowGarden',
  description: 'Regenerative garden intelligence — part of the FlowBond OS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
