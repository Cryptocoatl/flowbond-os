'use client';
// LiveWorldStatus — WorldStatus, alive. Subscribes to the region and re-renders
// the ring + channel bars in realtime, with a gold bloom pulse each time the
// world heals (vitality rises from a validated action). This is the heartbeat.
import { useEffect, useState } from 'react';
import type { RegionState } from '@/lib/kai/types';
import { useLiveRegion } from '@/lib/kai/useLiveRegion';
import { WorldStatus } from './WorldStatus';

export function LiveWorldStatus({
  slug,
  initial,
  regionName,
}: {
  slug: string;
  initial: RegionState;
  regionName: string;
}) {
  const { state, bloomKey, connected } = useLiveRegion(slug, initial);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (bloomKey === 0) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1600);
    return () => clearTimeout(t);
  }, [bloomKey]);

  return (
    <div className="relative">
      <div
        className={`pointer-events-none absolute -inset-2 rounded-xl3 transition-opacity duration-700 ${
          flash ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ boxShadow: '0 0 40px 6px rgba(244,194,90,0.45)', background: 'radial-gradient(60% 60% at 50% 40%, rgba(111,207,151,0.14), transparent 70%)' }}
      />
      <div className="relative">
        <WorldStatus state={state} regionName={regionName} />
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-kai-faint">
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-breathe bg-kai-jade' : 'bg-kai-faint'}`} />
          {connected ? 'Live · the world updates as it heals' : 'Connecting…'}
        </div>
      </div>
    </div>
  );
}
