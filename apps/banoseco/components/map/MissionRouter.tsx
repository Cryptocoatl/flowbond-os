'use client';

import { useState } from 'react';
import { useGame } from '@/components/providers/GameProvider';
import { preciseOptIn, queryCoord, setPreciseOptIn } from '@/lib/geo';

interface Rec {
  mission_id: string;
  node_id: string;
  label: string;
  node: string;
  neighborhood: string | null;
  distance_km: number;
  reward_xp: number;
  reward_oro: number;
  reason?: string;
}

/** AI mission router + privacy control. Sends only the coarse cell to the server. */
export function MissionRouter({ onSelectNode }: { onSelectNode?: (nodeId: string) => void }) {
  const { coords, user } = useGame();
  const [busy, setBusy] = useState(false);
  const [headline, setHeadline] = useState<string | null>(null);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [precise, setPrecise] = useState(preciseOptIn());

  const route = async () => {
    if (!coords) return;
    setBusy(true);
    try {
      const q = queryCoord(coords); // coarse unless the user opted in
      const res = await fetch('/api/missions/route', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lat: q.lat, lng: q.lng, radiusKm: 8 }),
      });
      const j = await res.json();
      setHeadline(j.headline ?? null);
      setRecs((j.missions ?? []) as Rec[]);
    } catch {
      setHeadline('No se pudo rutear ahora. Intenta de nuevo.');
      setRecs([]);
    } finally {
      setBusy(false);
    }
  };

  const togglePrecise = () => {
    const next = !precise;
    setPreciseOptIn(next);
    setPrecise(next);
  };

  return (
    <div className="airoute">
      <button className="primarybtn" onClick={route} disabled={busy || !coords} style={{ width: '100%' }}>
        {busy ? 'Pensando…' : '✦ IA · rutéame a una misión'}
      </button>

      {!user && (
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Inicia sesión para aceptar la misión que te recomiende.
        </p>
      )}

      {headline && <div className="headline" style={{ marginTop: 12 }}>{headline}</div>}

      {recs.map((r) => (
        <div className="rec" key={r.mission_id}>
          <div style={{ flex: 1 }}>
            <b>{r.label}</b> · {r.node}
            <div className="why">
              {r.reason ?? `${r.neighborhood ?? 'CDMX'}`} · {r.distance_km} km · ✦{r.reward_xp} ◈{r.reward_oro}
            </div>
          </div>
          {onSelectNode && (
            <button className="ghostbtn" onClick={() => onSelectNode(r.node_id)}>
              Ver
            </button>
          )}
        </div>
      ))}

      <div className="privacy-row">
        <span className="dot" />
        <span>
          Tu ubicación se {precise ? 'envía exacta' : 'difumina (~550 m)'} ·{' '}
          <button onClick={togglePrecise}>{precise ? 'volver a difuminar' : 'usar precisión exacta'}</button>
        </span>
      </div>
    </div>
  );
}
