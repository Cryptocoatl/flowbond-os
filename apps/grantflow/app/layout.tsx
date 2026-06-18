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
  title: 'GrantFlow — FlowBond funding engine',
  description:
    'Live grant intelligence for the FlowBond ecosystem — every open opportunity, scored against every project, across web3, ReFi, social, cultural and tech.',
};

export const viewport: Viewport = {
  themeColor: '#07100d',
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
