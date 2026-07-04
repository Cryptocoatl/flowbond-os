import type { Metadata, Viewport } from 'next';
import { Fraunces, Hanken_Grotesk, Space_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-fraunces',
  display: 'swap',
});
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hanken',
  display: 'swap',
});
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-space-mono',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://reciprociudad.lat';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Reciprociudad — La ciudad-lago que se alimenta a sí misma',
  description:
    'Una red viva inspirada en Tenochtitlan: chinampas que regeneran, canales que conectan, mercados donde todo se intercambia. Reciprociudad reactiva ese sistema ancestral para CDMX.',
  icons: { icon: '/logo-512.png', apple: '/logo-512.png' },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: SITE_URL,
    siteName: 'Reciprociudad',
    title: 'Reciprociudad — La ciudad-lago que se alimenta a sí misma',
    description:
      'Una red viva de reciprocidad para CDMX, anclada en la inteligencia regenerativa de la ciudad-lago.',
    images: [{ url: '/logo-512.png', width: 512, height: 512, alt: 'Sello de Reciprociudad' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reciprociudad',
    description: 'La ciudad-lago que se alimenta a sí misma.',
    images: ['/logo-512.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#062623',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${hanken.variable} ${spaceMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
