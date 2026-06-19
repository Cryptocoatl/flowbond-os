import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import Nav from './components/Nav';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ClaudIA — steward of FlowBond funding',
  description:
    'Unalienable technology, made and followed by love. ClaudIA finds the grants, writes the applications, and keeps every funder, partner, and conversation in one structured place.',
  icons: { icon: '/claudia-logo.png', apple: '/claudia-logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#0a1410',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} dark`}>
      <body className="font-sans">
        <Nav />
        {children}
      </body>
    </html>
  );
}
