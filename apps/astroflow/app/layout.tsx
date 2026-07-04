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
  title: 'AstroFlow',
  description: 'Where your stars meet your people — a FlowBond constellation.',
};

export const viewport: Viewport = {
  themeColor: '#0b0a1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,        // prevent double-tap zoom fighting the map's pinch
  userScalable: false,
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
