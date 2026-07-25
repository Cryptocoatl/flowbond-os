'use client';
// =============================================================================
// useLiveRegion — subscribes to kai_regions via Supabase Realtime and streams
// the region's five channels as they change. When a validated proof recomputes
// state, every open client blooms within the acceptance second. RLS still gates
// what anon receives (published region only). Falls back to the initial state.
// =============================================================================
import { useEffect, useRef, useState } from 'react';
import { browserSupabase } from '@/lib/supabase';
import type { RegionState } from './types';

type Row = {
  slug: string;
  vitality: number;
  canopy: number;
  water: number;
  biodiversity: number;
  community_pulse: number;
};

export function useLiveRegion(slug: string, initial: RegionState) {
  const [state, setState] = useState<RegionState>(initial);
  const [bloomKey, setBloomKey] = useState(0); // bumps when vitality rises → triggers flash
  const [connected, setConnected] = useState(false);
  const prev = useRef(initial.vitality);

  useEffect(() => {
    let sb;
    try {
      sb = browserSupabase();
    } catch {
      return; // env not configured — stay on initial state
    }
    const channel = sb
      .channel(`kai_region_${slug}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'kai_regions', filter: `slug=eq.${slug}` },
        (payload) => {
          const r = payload.new as Row;
          const next: RegionState = {
            vitality: r.vitality,
            canopy: r.canopy,
            water: r.water,
            biodiversity: r.biodiversity,
            communityPulse: r.community_pulse,
          };
          setState(next);
          if (next.vitality > prev.current + 1e-6) setBloomKey((k) => k + 1);
          prev.current = next.vitality;
        },
      )
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'));

    return () => {
      sb.removeChannel(channel);
    };
  }, [slug]);

  return { state, bloomKey, connected };
}
