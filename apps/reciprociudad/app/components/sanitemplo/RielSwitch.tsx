'use client';

import { LEGAL, type Riel } from '@flowbond/sanitemplo-core';

/**
 * A/B cambia el contrato entero. Riel B solo se MUESTRA si la A.C. es donataria
 * verificada; si no, se oculta (no "próximamente" — oculto). Afuera se anuncia,
 * adentro se agradece.
 */
export default function RielSwitch({ riel, onChange }: { riel: Riel; onChange: (r: Riel) => void }) {
  const bAvailable = LEGAL.acDonataria.verified;
  return (
    <div>
      <div className="st-riel" role="tablist" aria-label="Riel de patrocinio">
        <button
          role="tab"
          aria-selected={riel === 'A'}
          data-on={riel === 'A'}
          onClick={() => onChange('A')}
        >
          Riel A · se anuncia
        </button>
        {bAvailable ? (
          <button
            role="tab"
            aria-selected={riel === 'B'}
            data-on={riel === 'B'}
            onClick={() => onChange('B')}
          >
            Riel B · se agradece
          </button>
        ) : null}
      </div>
      <p className="st-lead" style={{ fontSize: 12, marginTop: 8 }}>
        {riel === 'A'
          ? 'Exterior + interior comercial. Logo, CTA, campaña. Factura BrandMark, CFDI de publicidad, IVA.'
          : 'Interior sagrado. Solo el nombre grabado en la placa. Factura la A.C., CFDI de donativo, sin IVA.'}
      </p>
    </div>
  );
}
