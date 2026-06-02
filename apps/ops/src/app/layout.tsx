import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FlowBond OPS',
  description: 'Command center — projects, tasks, people, contracts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ops-bg text-ops-text min-h-screen">{children}</body>
    </html>
  )
}
