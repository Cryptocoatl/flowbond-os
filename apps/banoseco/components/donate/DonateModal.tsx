'use client';

import { useEffect, useState } from 'react';
import { QrCode } from './QrCode';
import type { NearbyToilet } from '@/lib/types';

const AMOUNTS = [5, 20, 50];
const DONATION_URL = process.env.NEXT_PUBLIC_BANOSECO_DONATION_URL ?? '';

/** Build the QR target. BAÑOSECO never holds funds — the QR points at the
 *  network's connected account (Mercado Pago / Stripe), tagged with the node. */
function donateTarget(toilet: NearbyToilet, amount: number) {
  if (DONATION_URL) {
    const sep = DONATION_URL.includes('?') ? '&' : '?';
    return `${DONATION_URL}${sep}ref=${encodeURIComponent(toilet.code)}&amount=${amount}`;
  }
  // No network account configured yet — encode an intent string so the QR still scans.
  return `banoseco:donate?node=${encodeURIComponent(toilet.code)}&amount=${amount}&mxn`;
}

export function DonateModal({
  toilet,
  onClose,
  onConfirm,
}: {
  toilet: NearbyToilet;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void> | void;
}) {
  const [amount, setAmount] = useState(5);
  const [busy, setBusy] = useState(false);

  // Esc to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  async function confirm() {
    setBusy(true);
    await onConfirm(amount);
    setBusy(false);
    onClose();
  }

  return (
    <div
      className="scrim"
      role="dialog"
      aria-modal="true"
      aria-label={`Activar nodo ${toilet.code}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <button className="x" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <div className="code">{toilet.code}</div>
        <h3>Activa el nodo</h3>
        <div className="sub">
          {toilet.name}
          {toilet.neighborhood ? ` · ${toilet.neighborhood}` : ''}
        </div>

        <QrCode value={donateTarget(toilet, amount)} />

        <div className="amounts" role="group" aria-label="Monto de donación">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              className={`amt${a === amount ? ' sel' : ''}`}
              aria-pressed={a === amount}
              onClick={() => setAmount(a)}
            >
              ${a}
            </button>
          ))}
        </div>

        <button className="act gold" style={{ marginTop: 8 }} onClick={confirm} disabled={busy}>
          {busy ? 'Registrando…' : `Donar $${amount} a la red`}
        </button>
        <div className="note">
          Escanea el QR o deja monedas en el bote del módulo. BAÑOSECO nunca retiene fondos: van
          directo a la cuenta de la red.
        </div>
      </div>
    </div>
  );
}
