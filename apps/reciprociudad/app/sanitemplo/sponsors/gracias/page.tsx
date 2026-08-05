import { Suspense } from 'react';
import type { Metadata } from 'next';
import GraciasClient from '@/app/components/sanitemplo/GraciasClient';

export const metadata: Metadata = {
  title: 'Sani Templo · Asigna tus visitas',
  robots: { index: false, follow: false },
};

export default function GraciasPage() {
  // useSearchParams necesita un límite de Suspense en render estático.
  return (
    <Suspense fallback={<div className="st-section st-wrap">Cargando…</div>}>
      <GraciasClient />
    </Suspense>
  );
}
