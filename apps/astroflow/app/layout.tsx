import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import Nav from './components/Nav';
import FlowMeDock from './components/FlowMeDock';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'AstralFlow',
  description: 'Navigate the Invisible — degree-accurate astrology rendered as a living map of how you relate. A FlowBond constellation.',
  manifest: '/assets/site.webmanifest',
  icons: {
    icon: '/assets/favicon.svg',
    apple: '/assets/icons/apple-touch-180.png',
  },
  openGraph: {
    title: 'AstralFlow',
    description: 'Navigate the Invisible — the currents between us, made visible.',
    images: ['/assets/icons/apple-touch-512.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0a1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,        // prevent double-tap zoom fighting the map's pinch
  userScalable: false,
  viewportFit: 'cover',   // draw under the notch / home indicator (native feel)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} dark`}>
      <body className="font-sans">
        <Nav />
        {children}
        <FlowMeDock />
      </body>
    </html>
  );
}
