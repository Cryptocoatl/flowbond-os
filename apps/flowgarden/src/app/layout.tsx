import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'FlowGarden',
  description: 'A living ecosystem where growth is effortless, connected and abundant.',
  icons: {
    icon: [
      { url: '/favicon/favicon.ico', sizes: 'any' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'FlowGarden',
    statusBarStyle: 'black-translucent',
  },
  applicationName: 'FlowGarden',
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2EDE3' },
    { media: '(prefers-color-scheme: dark)', color: '#0A1A0C' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <head>
        {/* Prevent theme flash before hydration */}
        {/* Also syncs <meta name="theme-color"> to the RESOLVED theme. The
            viewport export below can only key off prefers-color-scheme, so a
            user who picks light on a dark-OS phone got a dark status bar over
            a cream app. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('fg-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d){document.documentElement.classList.add('dark')}var m=document.createElement('meta');m.name='theme-color';m.content=d?'#0A1A0C':'#F2EDE3';document.head.appendChild(m)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="bg-fg-bg text-fg min-h-screen">{children}</body>
    </html>
  )
}
