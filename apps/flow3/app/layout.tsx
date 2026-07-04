import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'FlowStudio — The AI film studio',
  description:
    'Generate, cut, and grade cinematic video from a sentence. A real editor, directed by words — powered by FlowCredits across the FlowBond ecosystem.',
  metadataBase: new URL('https://v3.flowme.one'),
  openGraph: {
    title: 'FlowStudio — Cinema, on command',
    description: 'The AI film studio. Direct it with words.',
    siteName: 'FlowStudio',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0b0d',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased bg-base`}>
        {children}
      </body>
    </html>
  );
}
