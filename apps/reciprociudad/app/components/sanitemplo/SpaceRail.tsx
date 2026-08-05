'use client';

import { SPACES, fmtMxn, type Riel } from '@flowbond/sanitemplo-core';

/**
 * Inventario, dos rieles. Solo se muestran los espacios del riel activo. El
 * altar aparece pero NO se vende: al tocarlo, responde. Ese rechazo es parte de
 * la venta.
 */
export default function SpaceRail({
  riel,
  spaceIds,
  onToggle,
  onAltar,
}: {
  riel: Riel;
  spaceIds: string[];
  onToggle: (id: string) => void;
  onAltar: () => void;
}) {
  const visible = SPACES.filter((s) => s.riel === riel);
  return (
    <div>
      <p className="st-eyebrow" style={{ letterSpacing: '0.16em' }}>
        {riel === 'A' ? 'Espacios · exterior e interior comercial' : 'Interior sagrado'}
      </p>
      <div style={{ marginTop: 10 }}>
        {visible.map((s) => {
          const on = spaceIds.includes(s.id);
          return (
            <div
              key={s.id}
              className="st-space"
              data-sacred={!!s.sacred}
              data-on={on}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              onClick={() => (s.sacred ? onAltar() : onToggle(s.id))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  s.sacred ? onAltar() : onToggle(s.id);
                }
              }}
            >
              <span className="st-check" aria-hidden />
              <span>
                <span className="st-space-name">{s.name}</span>
                <span className="st-space-why" style={{ display: 'block' }}>
                  {s.why}
                </span>
              </span>
              <span className="st-space-price">
                {s.sacred ? 'no se vende' : s.price === 0 ? 'sin costo' : `${fmtMxn(s.price)}/mes`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
