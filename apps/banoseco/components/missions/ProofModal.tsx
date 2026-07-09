'use client';

import { useEffect, useRef, useState } from 'react';
import type { Mission } from '@/lib/types';
import { uploadProof } from '@/lib/upload';

export function ProofModal({
  mission,
  userId,
  onClose,
  onConfirm,
}: {
  mission: Mission;
  userId: string;
  onClose: () => void;
  onConfirm: (proofUrl?: string) => Promise<void> | void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = useRef<string | null>(null);
  if (file && !preview.current) preview.current = URL.createObjectURL(file);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => {
      window.removeEventListener('keydown', h);
      if (preview.current) URL.revokeObjectURL(preview.current);
    };
  }, [onClose]);

  async function confirm() {
    setBusy(true);
    let url: string | undefined;
    if (file) url = (await uploadProof(file, userId)) ?? undefined;
    await onConfirm(url);
    setBusy(false);
    onClose();
  }

  const where = mission.toilet ? `${mission.toilet.code} · ${mission.toilet.name}` : 'el nodo';

  return (
    <div
      className="scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Completar misión"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <button className="x" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <div className="code">PRUEBA DE ENTREGA</div>
        <h3>Cierra la misión</h3>
        <div className="sub">Cubeta de {where} a composta.</div>

        {preview.current && (
          <div className="qr" style={{ background: 'var(--bs-void2)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.current} alt="Vista previa de la prueba" />
          </div>
        )}

        <label className="act gold" style={{ display: 'block', marginTop: 12, cursor: 'pointer' }}>
          {file ? 'Cambiar foto' : '📷 Tomar foto (opcional)'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (preview.current) {
                URL.revokeObjectURL(preview.current);
                preview.current = null;
              }
              setFile(e.target.files?.[0] ?? null);
            }}
          />
        </label>

        <button className="act gold" style={{ marginTop: 8 }} onClick={confirm} disabled={busy}>
          {busy ? 'Acreditando…' : 'Confirmar entrega'}
        </button>
        <div className="note">
          La foto documenta la entrega a compostaje. Acreditamos XP + oro al confirmar.
        </div>
      </div>
    </div>
  );
}
