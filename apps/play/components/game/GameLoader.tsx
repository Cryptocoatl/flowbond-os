'use client';
// GameLoader — client boundary that loads the WebGL world without SSR (no server
// WebGL). Shows a calm loading veil while the scene mounts.
import dynamic from 'next/dynamic';
import type { RegionSummary } from '@/lib/kai/types';

const GameWorld = dynamic(() => import('./GameWorld').then((m) => m.GameWorld), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 grid place-items-center bg-[#0a0f0d] text-kai-muted">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-kai-gold" />
        <div className="text-sm">Entrando a los siete mundos…</div>
      </div>
    </div>
  ),
});

export function GameLoader({ region }: { region: RegionSummary }) {
  return <GameWorld region={region} />;
}
