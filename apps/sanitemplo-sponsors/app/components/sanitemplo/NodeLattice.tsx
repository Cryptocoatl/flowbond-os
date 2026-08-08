'use client';

import { NODES, type NodeStatus } from '@flowbond/sanitemplo-core';

/**
 * La red crece por nodos, no por ciudades. Grafo, no mapa: las posiciones salen
 * de lat/lng normalizadas a un lienzo, y las aristas tejen los nodos abiertos.
 */
const W = 640;
const H = 360;
const PAD = 40;

const lats = NODES.map((n) => n.lat);
const lngs = NODES.map((n) => n.lng);
const latMin = Math.min(...lats), latMax = Math.max(...lats);
const lngMin = Math.min(...lngs), lngMax = Math.max(...lngs);
const px = (lng: number) => PAD + ((lng - lngMin) / (lngMax - lngMin || 1)) * (W - 2 * PAD);
const py = (lat: number) => PAD + ((latMax - lat) / (latMax - latMin || 1)) * (H - 2 * PAD);

const STATUS_LABEL: Record<NodeStatus, string> = {
  abierto: 'Abierto',
  apertura: 'En apertura',
  solicitud: 'Por solicitud',
};

export default function NodeLattice() {
  const abiertos = NODES.filter((n) => n.status === 'abierto');
  return (
    <section className="st-section">
      <div className="st-wrap">
        <p className="st-eyebrow">La red</p>
        <h2 style={{ marginTop: 10 }}>Nodos, no ciudades</h2>
        <p className="st-lead" style={{ marginTop: 10 }}>
          La reserva es de visitas, no de ubicación. Compras hoy y asignas después a los
          nodos abiertos, en las fechas que elijas.
        </p>
        <svg className="st-lattice" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Red de nodos Sani Templo" style={{ marginTop: 16 }}>
          {/* aristas entre nodos abiertos */}
          {abiertos.map((a, i) =>
            abiertos.slice(i + 1).map((b) => (
              <line
                key={`${a.id}-${b.id}`}
                className="st-lattice-edge"
                x1={px(a.lng)} y1={py(a.lat)} x2={px(b.lng)} y2={py(b.lat)}
              />
            )),
          )}
          {NODES.map((n) => (
            <g key={n.id} className="st-lattice-node" data-status={n.status} transform={`translate(${px(n.lng)},${py(n.lat)})`}>
              <circle r={n.status === 'abierto' ? 7 : 5} strokeWidth={1.5} />
              <text x={10} y={4}>{n.name}</text>
            </g>
          ))}
        </svg>
        <div className="st-seg" style={{ marginTop: 12 }}>
          {(['abierto', 'apertura', 'solicitud'] as NodeStatus[]).map((s) => (
            <span key={s} className="st-tag" style={{ opacity: 0.85 }}>
              {STATUS_LABEL[s]} · {NODES.filter((n) => n.status === s).length}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
