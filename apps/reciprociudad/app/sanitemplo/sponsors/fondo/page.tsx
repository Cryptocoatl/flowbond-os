import type { Metadata } from 'next';
import FondoClient from '@/app/components/sanitemplo/FondoClient';

export const metadata: Metadata = {
  title: 'Sani Templo · Fondo Reciprociudad',
  description: 'El 33% que sostiene la red, auditable sin login.',
  robots: { index: true, follow: true },
};

export default function FondoPage() {
  return <FondoClient />;
}
