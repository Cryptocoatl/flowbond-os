import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Admin · Maya Transfers Turquesa',
  description: 'Panel de administración',
  robots: 'noindex, nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
