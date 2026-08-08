'use client';

import {
  ECONOMICS,
  BREAKEVEN_VISITS_DAY,
  DIRECT_COST_MONTHLY,
  fmtMxn,
} from '@flowbond/sanitemplo-core';

/**
 * El titular. "Un Sani Templo se paga solo con 15 visitas al día" — aritmética
 * sobre DIRECT_COST_MONTHLY, no proyección. El slot del templo 3D (fase 5) vive
 * aquí; hoy es un plano quieto que no bloquea la venta.
 */
export default function Hero({ canvasSlot }: { canvasSlot?: React.ReactNode }) {
  return (
    <header className="st-hero st-section">
      <div className="st-wrap">
        <p className="st-eyebrow">Sani Templo · baños que honran la Tierra</p>
        <h1 className="st-hero-h" style={{ marginTop: 14, maxWidth: '18ch' }}>
          No compras un panel. <span className="st-gold">Compras visitas.</span>
        </h1>
        <p className="st-lead" style={{ marginTop: 18, fontSize: 17 }}>
          {fmtMxn(ECONOMICS.visitPriceMxn)} cada una, para el gobierno y para la familia
          artesana. El precio de la visita no se negocia — lo único que se negocia es la
          presencia.
        </p>

        <div className="st-card st-card--gold" style={{ marginTop: 28, maxWidth: 560 }}>
          <p className="st-eyebrow" style={{ letterSpacing: '0.16em' }}>El titular</p>
          <p style={{ fontSize: 20, marginTop: 8, lineHeight: 1.35 }}>
            Un Sani Templo se paga solo con{' '}
            <span className="st-hero-figure st-gold">{BREAKEVEN_VISITS_DAY}</span>{' '}
            visitas al día.
          </p>
          <p className="st-lead" style={{ fontSize: 13, marginTop: 10 }}>
            Costo directo {fmtMxn(DIRECT_COST_MONTHLY)}/mes ÷ {fmtMxn(ECONOMICS.visitPriceMxn)}{' '}
            por visita. Es aritmética, no una promesa.
          </p>
        </div>

        {canvasSlot ? (
          <div style={{ marginTop: 32 }}>{canvasSlot}</div>
        ) : null}
      </div>
    </header>
  );
}
