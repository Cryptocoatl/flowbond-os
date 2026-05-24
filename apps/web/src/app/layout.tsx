import type { Metadata } from 'next'
import { FlowEditProvider } from '@flowbond/flowedit'
import './globals.css'

export const metadata: Metadata = {
  title: 'FlowBond OS',
  description: 'API-first multi-client ecosystem',
}

const FLOWEDIT_API = process.env.NEXT_PUBLIC_FLOWEDIT_API_URL ?? 'http://localhost:4000'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FlowEditProvider siteId="flowbond-life" apiUrl={FLOWEDIT_API}>
          {children}
        </FlowEditProvider>
      </body>
    </html>
  )
}
