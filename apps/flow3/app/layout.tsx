import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'FLOW3 — Dream it. Prompt it. Make it real.',
  description:
    'The FlowBond creation engine. AI films, playable worlds, living dreams — powered by FlowCredits earned across the ecosystem.',
  metadataBase: new URL('https://video.flowme.one'),
  openGraph: {
    title: 'FLOW3 — The FlowBond Creation Engine',
    description: 'If you can dream it and know how to prompt it, you can make it real.',
    siteName: 'FLOW3',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#030014',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${grotesk.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
