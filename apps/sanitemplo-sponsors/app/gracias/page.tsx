import { Suspense } from 'react';
import GraciasClient from '@/app/components/sanitemplo/GraciasClient';

export default function GraciasPage() {
  return (
    <Suspense fallback={<div className="st-section st-wrap">Cargando…</div>}>
      <GraciasClient />
    </Suspense>
  );
}
