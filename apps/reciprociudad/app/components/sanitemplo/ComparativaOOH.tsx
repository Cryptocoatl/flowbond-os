'use client';

import { OOH_BENCHMARK, ECONOMICS, fmtMxn, type Quote } from '@flowbond/sanitemplo-core';

/**
 * Comparativa viva contra el ticket mínimo de mobiliario urbano. Se calcula
 * solo. El mismo dinero: allá son caras sin una sola visita medida; aquí son
 * visitas dignas auditadas.
 */
export default function ComparativaOOH({ q }: { q: Quote }) {
  const oohVisitsIfMeasured = Math.floor(OOH_BENCHMARK.mensualMxn / ECONOMICS.visitPriceMxn);
  return (
    <section className="st-section">
      <div className="st-wrap">
        <p className="st-eyebrow">La comparación que nadie te hace</p>
        <div className="st-vs" style={{ marginTop: 16 }}>
          <div className="st-card">
            <p className="st-eyebrow">{OOH_BENCHMARK.label}</p>
            <p className="st-vs-figure" style={{ marginTop: 8 }}>{fmtMxn(OOH_BENCHMARK.mensualMxn)}/mes</p>
            <p className="st-lead" style={{ fontSize: 13, marginTop: 8 }}>
              {OOH_BENCHMARK.caras} caras · {OOH_BENCHMARK.m2} m² · sin medición.
            </p>
            <p className="st-num" style={{ marginTop: 10, color: 'var(--st-loto)' }}>
              0 visitas medidas
            </p>
          </div>

          <div className="st-eyebrow" style={{ textAlign: 'center' }}>vs</div>

          <div className="st-card st-card--gold">
            <p className="st-eyebrow" style={{ color: 'var(--st-oro)' }}>Sani Templo</p>
            <p className="st-vs-figure st-gold" style={{ marginTop: 8 }}>
              {q.impact.visitas.toLocaleString('es-MX')} visitas
            </p>
            <p className="st-lead" style={{ fontSize: 13, marginTop: 8 }}>
              Cada una medida y auditada, a {fmtMxn(ECONOMICS.visitPriceMxn)}. Tu cotización
              actual: <span className="st-num">{fmtMxn(q.total)}</span>.
            </p>
            <p className="st-num" style={{ marginTop: 10, color: 'var(--st-jade)' }}>
              Ese presupuesto de mupi = {oohVisitsIfMeasured.toLocaleString('es-MX')} visitas dignas
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
