'use client';

import { PROFILES, LEGAL, type Profile } from '@flowbond/sanitemplo-core';

/**
 * Un solo SKU, siete puertas de entrada. Un clic precarga visitas + nodos +
 * plazo + riel + espacios. "Beneficio de equipo" (id equipo) es el que nadie ha
 * visto — retención natural — así que lleva su propio tratamiento (hero).
 */
export default function ProfileDoors({
  activeId,
  onPick,
}: {
  activeId: string | null;
  onPick: (p: Profile) => void;
}) {
  // Si la A.C. no está verificada, no se ofrecen puertas de riel B.
  const doors = PROFILES.filter((p) => p.riel === 'A' || LEGAL.acDonataria.verified);
  return (
    <section className="st-section" style={{ paddingTop: 0 }}>
      <div className="st-wrap">
        <p className="st-eyebrow">Empieza por una intención</p>
        <div className="st-doors" style={{ marginTop: 16 }}>
          {doors.map((p) => {
            const hero = p.id === 'equipo';
            return (
              <button
                key={p.id}
                className="st-door"
                data-active={activeId === p.id}
                data-hero={hero}
                onClick={() => onPick(p)}
              >
                {hero ? <span className="st-tag">Retención natural</span> : null}
                <div className="st-door-name" style={{ marginTop: hero ? 8 : 0 }}>
                  {p.name}
                </div>
                <div className="st-door-blurb">{p.blurb}</div>
                <div className="st-num" style={{ fontSize: 12, marginTop: 10, color: 'var(--st-oro)' }}>
                  {p.visits.toLocaleString('es-MX')} visitas · Riel {p.riel}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
