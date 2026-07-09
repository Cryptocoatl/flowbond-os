import type { NearbyToilet } from '@/lib/types';
import { statusVisual, STATUS_COLOR } from '@/lib/status';

const GX = 10;
const GY = 10;
const SIZE = 400;
const CELL = SIZE / GX;

/** Project real lat/lng onto the 10×10 chinampa grid using the set's bounds. */
function project(
  toilets: NearbyToilet[],
  player: { lat: number; lng: number } | null,
) {
  const pts = [
    ...toilets.map((t) => ({ lat: t.lat, lng: t.lng })),
    ...(player ? [player] : []),
  ];
  if (pts.length === 0) return { cells: new Map<string, { x: number; y: number }>(), pp: { x: 2.5, y: 6.5 } };

  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;
  // pad to 1..GX-2 so nodes don't hug the edges
  const nx = (lng: number) => 1 + ((lng - minLng) / spanLng) * (GX - 3);
  const ny = (lat: number) => 1 + ((maxLat - lat) / spanLat) * (GY - 3);

  const cells = new Map<string, { x: number; y: number }>();
  toilets.forEach((t) => cells.set(t.id, { x: nx(t.lng), y: ny(t.lat) }));
  const pp = player ? { x: nx(player.lng), y: ny(player.lat) } : { x: 2.5, y: 6.5 };
  return { cells, pp };
}

export function ChinampaBoard({
  toilets,
  player,
  selectedId,
  onSelect,
}: {
  toilets: NearbyToilet[];
  player: { lat: number; lng: number } | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { cells, pp } = project(toilets, player);
  const occupied = new Set(
    [...cells.values()].map((c) => `${Math.round(c.x)},${Math.round(c.y)}`),
  );

  const plots = [];
  for (let y = 0; y < GY; y++) {
    for (let x = 0; x < GX; x++) {
      const live = occupied.has(`${x},${y}`);
      plots.push(
        <rect
          key={`p${x}-${y}`}
          className={`plot ${live ? 'live' : ''}`}
          x={x * CELL + 3}
          y={y * CELL + 3}
          width={CELL - 6}
          height={CELL - 6}
          rx={3}
        />,
      );
    }
  }

  const canals = [];
  for (let i = 0; i <= GX; i++) {
    canals.push(<line key={`cv${i}`} className="canal" x1={i * CELL} y1={0} x2={i * CELL} y2={SIZE} />);
    canals.push(<line key={`ch${i}`} className="canal" x1={0} y1={i * CELL} x2={SIZE} y2={i * CELL} />);
  }
  // acequia / calzada principal
  canals.push(<line key="glowh" className="canal glow" x1={0} y1={4 * CELL} x2={SIZE} y2={4 * CELL} />);
  canals.push(<line key="glowv" className="canal glow" x1={5 * CELL} y1={0} x2={5 * CELL} y2={SIZE} />);

  return (
    <svg className="chinampa" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-label="Tablero de chinampas con nodos BAÑOSECO">
      <g>{plots}</g>
      <g>{canals}</g>
      {/* territorio: halo de regeneración alrededor de nodos no llenos */}
      <g>
        {toilets
          .filter((t) => t.status !== 'full')
          .map((t) => {
            const c = cells.get(t.id);
            if (!c) return null;
            return (
              <circle
                key={`terr-${t.id}`}
                cx={c.x * CELL + CELL / 2}
                cy={c.y * CELL + CELL / 2}
                r={CELL * 1.4}
                fill="var(--bs-bio)"
                opacity="0.05"
              />
            );
          })}
      </g>
      {/* nodos */}
      <g>
        {toilets.map((t) => {
          const c = cells.get(t.id);
          if (!c) return null;
          const cx = c.x * CELL + CELL / 2;
          const cy = c.y * CELL + CELL / 2;
          const vis = statusVisual(t.status);
          const color = STATUS_COLOR[vis];
          const pulse = vis === 'full';
          const sel = t.id === selectedId;
          return (
            <g
              key={t.id}
              className="node"
              tabIndex={0}
              role="button"
              aria-label={`${t.name}`}
              onClick={() => onSelect(t.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(t.id);
                }
              }}
            >
              <circle className="ring" cx={cx} cy={cy} r={sel ? 18 : 15} fill={color} opacity={pulse ? 0.35 : 0.15}>
                {pulse && (
                  <>
                    <animate attributeName="r" values="13;21;13" dur="1.7s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values=".45;0;.45" dur="1.7s" repeatCount="indefinite" />
                  </>
                )}
              </circle>
              <circle cx={cx} cy={cy} r={7} fill={color} stroke="var(--bs-void)" strokeWidth={2} style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
            </g>
          );
        })}
      </g>
      {/* jugador */}
      <g>
        <circle cx={pp.x * CELL + CELL / 2} cy={pp.y * CELL + CELL / 2} r={18} fill="none" stroke="var(--bs-jade-hi)" strokeWidth={1.5} opacity={0.5}>
          <animate attributeName="r" values="14;22;14" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle className="you" cx={pp.x * CELL + CELL / 2} cy={pp.y * CELL + CELL / 2} r={6} style={{ filter: 'drop-shadow(0 0 6px var(--bs-jade-hi))' }} />
      </g>
    </svg>
  );
}
