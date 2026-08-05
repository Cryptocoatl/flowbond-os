'use client';

import { LEGAL } from '@flowbond/sanitemplo-core';

/**
 * Sin un número al frente. El disclaimer se lee palabra por palabra. Reservar el
 * claim de origen cuesta cero, no promete cantidad y no promete fecha — y eso es
 * exactamente lo que hace que el legal del patrocinador lo apruebe.
 */
export default function CarbonLayer() {
  return (
    <section className="st-section">
      <div className="st-wrap">
        <p className="st-eyebrow">Carbono · la respuesta honesta</p>
        <h2 style={{ marginTop: 10, maxWidth: '20ch' }}>El claim de origen, reservado sin costo</h2>

        <div className="st-card" style={{ marginTop: 16, borderColor: 'var(--st-loto)' }}>
          <p style={{ margin: 0, color: 'var(--st-cal)' }}>{LEGAL.disclaimer}</p>
        </div>

        <div className="st-vs" style={{ marginTop: 20 }}>
          <div className="st-card">
            <p className="st-eyebrow" style={{ color: 'var(--st-jade)' }}>Sí se puede decir</p>
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--st-cal-dim)' }}>
              {LEGAL.allowedClaims.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div />
          <div className="st-card">
            <p className="st-eyebrow" style={{ color: 'var(--st-loto)' }}>Nunca, lo bloquea el sistema</p>
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--st-cal-dim)' }}>
              {LEGAL.forbiddenClaims.slice(0, 6).map((c) => (
                <li key={c} style={{ textDecoration: 'line-through' }}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
