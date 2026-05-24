import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FlowEdit · Dashboard',
  description: 'FlowBond content management',
  robots: 'noindex, nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-50 text-zinc-900 antialiased min-h-screen">
        <header className="bg-zinc-900 text-white px-6 py-3 flex items-center gap-3 sticky top-0 z-50">
          <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" />
          <span className="font-semibold tracking-tight">FlowEdit</span>
          <span className="text-zinc-500 text-sm">· Content Management</span>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
