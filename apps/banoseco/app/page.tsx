'use client';

import { useEffect, useState } from 'react';
import { useGame } from '@/components/providers/GameProvider';
import { ChinampaBoard } from '@/components/map/ChinampaBoard';
import { MapboxWorld } from '@/components/map/MapboxWorld';
import { MissionRouter } from '@/components/map/MissionRouter';
import { NodeCard } from '@/components/map/NodeCard';
import { DonateModal } from '@/components/donate/DonateModal';
import { fmt } from '@/lib/format';
import type { NearbyToilet } from '@/lib/types';

const HAS_MAPBOX = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

export default function MapaPage() {
  const { toilets, coords, impact, donate, loading } = useGame();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'mapbox' | 'chinampa'>(HAS_MAPBOX ? 'mapbox' : 'chinampa');
  const [donateToilet, setDonateToilet] = useState<NearbyToilet | null>(null);

  // auto-select the nearest node once data arrives
  useEffect(() => {
    if (!selectedId && toilets.length) setSelectedId(toilets[0].id);
  }, [toilets, selectedId]);

  const liveCount = toilets.filter((t) => t.status !== 'full').length;

  return (
    <section className="panel">
      <span className="eyebrow">Territorio vivo · CDMX</span>
      <h1 className="bs-h1">
        Cada baño es un <span className="gold">nodo</span>
        <br />
        que regenera la <span className="jade">tierra</span>.
      </h1>
      <p className="lede">
        Camina la ciudad, activa baños secos, completa misiones. Donde antes se contaminaba agua,
        ahora crece suelo vivo —y tu red de poder se expande sobre las chinampas.
      </p>

      <div className="worldgrid">
        <div className="board">
          {view === 'mapbox' && HAS_MAPBOX ? (
            <MapboxWorld
              toilets={toilets}
              player={coords}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : (
            <ChinampaBoard
              toilets={toilets}
              player={coords}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}

          <div className="hudtag">
            Red activa · <b>{liveCount}</b> nodos en línea
          </div>

          {HAS_MAPBOX && (
            <div className="toggle" role="group" aria-label="Vista del mundo">
              <button aria-pressed={view === 'mapbox'} onClick={() => setView('mapbox')}>
                Mapa
              </button>
              <button aria-pressed={view === 'chinampa'} onClick={() => setView('chinampa')}>
                Chinampa
              </button>
            </div>
          )}

          <div className="legend">
            <span style={{ color: 'var(--bs-gold)' }}>
              <i style={{ background: 'var(--bs-gold)' }} />
              Activo
            </span>
            <span style={{ color: 'var(--bs-clay)' }}>
              <i style={{ background: 'var(--bs-clay)' }} />
              Misión
            </span>
            <span style={{ color: 'var(--bs-jade)' }}>
              <i style={{ background: 'var(--bs-jade)' }} />
              En servicio
            </span>
          </div>
        </div>

        <div className="side">
          <div className="telemetry">
            <div className="tel">
              <div className="n">{impact ? fmt(impact.active_toilets) : '—'}</div>
              <div className="l">NODOS</div>
            </div>
            <div className="tel">
              <div className="n">{impact ? fmt(Math.round(impact.liters_water_saved)) : '—'}</div>
              <div className="l">L AGUA</div>
            </div>
            <div className="tel">
              <div className="n">{impact ? fmt(Math.round(impact.soil_kg)) : '—'}</div>
              <div className="l">KG TIERRA</div>
            </div>
          </div>

          <MissionRouter onSelectNode={setSelectedId} />

          <div>
            {toilets.length === 0 && !loading ? (
              <div className="empty">
                Aún no hay nodos cerca. Pronto se instalan los primeros baños del piloto en Huerto
                Roma Verde.
              </div>
            ) : (
              toilets.map((t) => (
                <NodeCard
                  key={t.id}
                  toilet={t}
                  selected={t.id === selectedId}
                  onSelect={() => setSelectedId(t.id)}
                  onDonate={() => setDonateToilet(t)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {donateToilet && (
        <DonateModal
          toilet={donateToilet}
          onClose={() => setDonateToilet(null)}
          onConfirm={async (amount) => {
            await donate(donateToilet.id, amount);
          }}
        />
      )}
    </section>
  );
}
