import type { Metadata } from 'next';
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
