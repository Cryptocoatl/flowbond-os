import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'FlowScrow — Conditional-Release Escrow',
  description:
    'A multi-task closing that releases its documents only when every task is completed and independently verified.',
};

export const viewport: Viewport = {
  themeColor: '#0f2e1f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} dark`}>
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
