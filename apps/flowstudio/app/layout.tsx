import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'FlowStudio — AI Video Edit',
  description: 'Song + brief → beat-synced 9:16 reel, with honest provenance on Origo.',
};

export const viewport: Viewport = {
  themeColor: '#07060f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} dark`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
