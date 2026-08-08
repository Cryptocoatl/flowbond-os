import type { Metadata, Viewport } from 'next';
import { brand } from '@/lib/brand';
import './globals.css';

export const metadata: Metadata = {
  title: brand.productName,
  description: brand.promise,
  openGraph: {
    title: brand.productName,
    description: brand.promise,
    siteName: brand.productName,
  },
  // Added to an iPad's home screen this opens as an app, not a browser tab.
  appleWebApp: {
    capable: true,
    title: brand.productName,
    statusBarStyle: 'black-translucent',
  },
  // Next emits the standardised `mobile-web-app-capable`; iOS still keys its
  // fullscreen home-screen mode off the legacy name, so emit that one too.
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  themeColor: '#05070a',
  // The HUD is laid out for the whole screen, and a game where a stray
  // two-finger pinch zooms the page is unplayable on a tablet.
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
