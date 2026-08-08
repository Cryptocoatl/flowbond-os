'use client';

import { useState } from 'react';
import { validateRielBContent } from '@flowbond/sanitemplo-core';

/**
 * Subir logo, preview, valida riel. En Riel B un logo NO es un detalle: un
 * donativo con logo deja de ser donativo (ingreso por publicidad, IVA, pierde
 * deducibilidad). Por eso Riel B rechaza el logo aquí, antes que la base de datos.
 */
export default function LogoDrop({
  riel,
  dataUrl,
  onChange,
}: {
  riel: 'A' | 'B';
  dataUrl: string | null;
  onChange: (d: string | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  function read(file: File) {
    if (riel === 'B') {
      // el sistema lo impide antes de la DB
      const r = validateRielBContent({ nombre: 'x', logo: {} });
      setError(r.errors[0] ?? 'El Riel B no acepta logo.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  }

  if (riel === 'B') {
    return (
      <div className="st-drop" aria-live="polite">
        En Riel B no hay logo ni imagen. Solo el nombre grabado en la placa — eso es
        exactamente lo que lo hace deducible.
      </div>
    );
  }

  return (
    <div>
      <label className="st-drop" style={{ display: 'block', cursor: 'pointer' }}>
        {dataUrl ? (
          <img src={dataUrl} alt="Vista previa del logo" />
        ) : (
          <span>Arrastra o elige tu logo (SVG o PNG). Se previsualiza aquí.</span>
        )}
        <input
          type="file"
          accept="image/svg+xml,image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) read(f);
          }}
        />
      </label>
      {dataUrl ? (
        <button className="st-btn st-btn--ghost" style={{ marginTop: 10 }} onClick={() => onChange(null)}>
          Quitar
        </button>
      ) : null}
      {error ? <p className="st-err" style={{ marginTop: 10 }}>{error}</p> : null}
    </div>
  );
}
