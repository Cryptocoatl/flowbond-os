'use client';

import { ECONOMICS, fmtMxn, type Quote } from '@flowbond/sanitemplo-core';

/**
 * Cada descuento, renglón por renglón, con su porcentaje y su cifra. Arriba de
 * todo, inmóvil: "Visitas · $11 c/u · sin descuento". Que se vea que no se movió.
 * Esa negativa es el producto.
 */
export default function Desglose({ q, riel }: { q: Quote; riel: 'A' | 'B' }) {
  return (
    <aside className="st-card st-desglose" aria-label="Desglose del precio">
      {/* la visita, inmóvil */}
      <div className="st-line-visita">
        <div className="st-line" style={{ borderBottom: 0, padding: 0 }}>
          <span>
            <span style={{ color: 'var(--st-cal)' }}>Visitas</span>
            <span className="st-line-label" style={{ display: 'block' }}>
              {fmtMxn(ECONOMICS.visitPriceMxn)} c/u · sin descuento, nunca
            </span>
          </span>
          <span className="st-num">{fmtMxn(q.visitsSubtotal)}</span>
        </div>
        <div className="st-num" style={{ fontSize: 11, color: 'var(--st-cal-dim)', marginTop: 6 }}>
          {q.input.visits.toLocaleString('es-MX')} × {fmtMxn(ECONOMICS.visitPriceMxn)}
        </div>
      </div>

      {/* presencia — el único lugar donde hay negociación */}
      {q.presenceList > 0 ? (
        <div style={{ marginTop: 16 }}>
          <div className="st-line">
            <span className="st-line-label">Presencia · tarifa lista</span>
            <span className="st-num">{fmtMxn(q.presenceList)}/mes</span>
          </div>
          {q.discounts.map((d, i) => (
            <div className="st-line" key={i}>
              <span>
                <span className="st-line-label">{d.label}</span>
                {d.pct > 0 ? <span className="st-line-pct" style={{ marginLeft: 8 }}>−{d.pct}%</span> : null}
              </span>
              <span className="st-num">{fmtMxn(d.result)}/mes</span>
            </div>
          ))}
          <div className="st-line">
            <span className="st-line-label">
              Presencia · {q.input.templos.toLocaleString('es-MX')} templo(s), todo el plazo
            </span>
            <span className="st-num">{fmtMxn(q.presenceSubtotal)}</span>
          </div>
          {q.presenceSaved > 0 ? (
            <div className="st-line" style={{ borderBottom: 0 }}>
              <span className="st-line-pct">Ahorro sobre lista</span>
              <span className="st-line-pct">
                {fmtMxn(q.presenceSaved)} · {Math.round(q.presenceSavedPct * 100)}%
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* totales */}
      <div style={{ marginTop: 8 }}>
        <div className="st-line">
          <span className="st-line-label">Subtotal</span>
          <span className="st-num">{fmtMxn(q.subtotal)}</span>
        </div>
        {riel === 'A' ? (
          <div className="st-line">
            <span className="st-line-label">IVA {Math.round(ECONOMICS.ivaPct * 100)}%</span>
            <span className="st-num">{fmtMxn(q.iva)}</span>
          </div>
        ) : (
          <div className="st-line">
            <span className="st-line-label">Donativo · sin IVA</span>
            <span className="st-num">—</span>
          </div>
        )}
        <div className="st-total">
          <span style={{ fontFamily: 'var(--st-font-display)', letterSpacing: '0.05em' }}>Total</span>
          <span className="st-num st-gold">{fmtMxn(q.total)}</span>
        </div>
      </div>

      {/* impacto, derivado de visitas, no de dinero */}
      <div style={{ marginTop: 16, borderTop: '1px solid var(--st-linea)', paddingTop: 12 }}>
        <p className="st-eyebrow" style={{ letterSpacing: '0.16em' }}>Impacto auditable</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', fontSize: 13, color: 'var(--st-cal-dim)' }}>
          <li>{Math.round(q.impact.litros).toLocaleString('es-MX')} litros de agua no usados</li>
          <li>{Math.round(q.impact.compostaKg).toLocaleString('es-MX')} kg a compostaje</li>
          <li>{q.impact.visitas.toLocaleString('es-MX')} visitas dignas financiadas</li>
        </ul>
      </div>

      {q.errors.length ? (
        <div style={{ marginTop: 12 }}>
          {q.errors.map((e, i) => (
            <p className="st-err" key={i}>{e}</p>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
