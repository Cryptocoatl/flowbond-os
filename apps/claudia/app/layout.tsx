import type { Metadata, Viewport } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'ClaudIA · La Guardiana',
  description: 'Te veo, te escucho, y construyo contigo. The steward of the FlowBond empire — zero-knowledge by design.',
};

export const viewport: Viewport = {
  themeColor: '#0E1A2B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} dark`}>
      <body className="font-display">{children}</body>
    </html>
  );
}
