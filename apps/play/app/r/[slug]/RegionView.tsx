'use client';

import { useEffect, useRef, useState } from 'react';
import type { RegionVisualState } from '@flowbond/state-engine';
import type { RegionData } from '@/lib/region';
import { flags } from '@/lib/flags';
import { DebugPanel } from '@/components/DebugPanel';

export function RegionView({ region }: { region: RegionData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{ applyVisualState(s: RegionVisualState): void; dispose(): void } | null>(
    null,
  );
  const [state, setState] = useState<RegionVisualState>(region.state);
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState(false);

  // Read ?debug=1 client-side (avoids a useSearchParams Suspense boundary).
  useEffect(() => {
    setDebug(flags.debugPanel && new URLSearchParams(window.location.search).get('debug') === '1');
  }, []);

  useEffect(() => {
    let disposed = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    (async () => {
      // Scene is DOM/WebGL-bound — imported client-side only.
      const { RegionScene } = await import('@flowbond/world-runtime/scene');
      if (disposed) return;
      const scene = new RegionScene({
        canvas,
        splatUrl: region.splatUrl,
        mapping: region.mapping,
        initialState: region.state,
      });
      sceneRef.current = scene;
      const resize = () =>
        scene.resize(canvas.clientWidth, canvas.clientHeight);
      resize();
      window.addEventListener('resize', resize);
      await scene.load().catch(() => {
        /* splat asset not in R2 yet (Phase 1) — shell still renders */
      });
      if (!disposed) setLoading(false);
      return () => window.removeEventListener('resize', resize);
    })();

    return () => {
      disposed = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [region]);

  // Push state to the scene whenever it changes (debug slider or realtime).
  useEffect(() => {
    sceneRef.current?.applyVisualState(state);
  }, [state]);

  return (
    <main style={{ position: 'fixed', inset: 0, background: '#0b0f0d' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            color: '#cfe3d8',
            fontFamily: 'system-ui, sans-serif',
            pointerEvents: 'none',
          }}
        >
          {region.name} despierta…
        </div>
      )}
      {debug && <DebugPanel state={state} onChange={setState} />}
    </main>
  );
}
