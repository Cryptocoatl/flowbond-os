'use client';

import { useState } from 'react';
import { checkClaim, fmtMxn, type Quote, type Riel } from '@flowbond/sanitemplo-core';
import { SANITEMPLO_API } from '@/lib/sanitemplo/client';

interface Draft { templos: number; periodId: string; riel: Riel; spaceIds: string[]; cadence: 'unica' | 'mensual' }

/**
 * RESERVAR — pago con tarjeta por default, todos los métodos integrados vía
 * Mercado Pago Checkout Pro (tarjeta, OXXO, transferencia, wallet). Sin login:
 * el Worker /reservar arma la orden + la preferencia y devuelve el link de pago.
 * Si MP no está configurado aún, registra la reserva (lead) — casi listo para pagar.
 */
export default function Reservar({ draft, q }: { draft: Draft; q: Quote }) {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [razon, setRazon] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | 'lead' | 'error'>(null);
  const [errMsg, setErrMsg] = useState('');

  const claim = checkClaim(`${razon} ${nombre}`);
  const blocked = !email || q.errors.length > 0 || !claim.ok || q.presenceSubtotal <= 0;

  async function reservar() {
    if (blocked) return;
    setBusy(true); setDone(null);
    try {
      const res = await fetch(`${SANITEMPLO_API}/reservar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...draft, email, nombre, razonSocial: razon }),
      });
      const data = (await res.json()) as { checkoutUrl?: string | null; leadId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'No se pudo reservar.');
      if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; } // → Mercado Pago (tarjeta)
      setDone('lead');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Error.'); setDone('error');
    } finally { setBusy(false); }
  }

  if (done === 'lead') return (
    <div className="st-card st-card--gold" role="status">
      <h3 className="st-gold">Tu espacio quedó reservado.</h3>
      <p className="st-lead" style={{ marginTop: 10 }}>
        Te contactamos a {email} para cerrar el pago con tarjeta y emitir tu CFDI. {draft.templos} baños,
        {' '}{fmtMxn(q.total)}.
      </p>
    </div>
  );

  return (
    <div className="st-reservar">
      <div style={{ flex: '1 1 320px' }}>
        <span className="st-num st-reservar-fig st-money">{fmtMxn(q.total)}</span>
        <p className="st-num" style={{ fontSize: 12, color: 'var(--st-cal-dim)', marginTop: 8, letterSpacing: '0.1em' }}>
          MXN{draft.riel === 'A' ? ' + IVA' : ''} · {draft.templos} baños · {draft.cadence === 'mensual' ? 'mensual' : 'plazo elegido'}
        </p>
        <div style={{ display: 'grid', gap: 10, marginTop: 16, maxWidth: 420 }}>
          <input className="st-input" type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input className="st-input" placeholder="Nombre / contacto" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <input className="st-input" placeholder="Razón social (CFDI)" value={razon} onChange={(e) => setRazon(e.target.value)} />
          </div>
        </div>
        {!claim.ok ? <p className="st-err" style={{ marginTop: 10 }}>Ese texto incluye una claim que este patrocinio no sustenta ({claim.hits.join(', ')}).</p> : null}
        {done === 'error' ? <p className="st-err" style={{ marginTop: 10 }}>{errMsg}</p> : null}
      </div>
      <div style={{ textAlign: 'center' }}>
        <button className="st-btn" style={{ fontSize: 17, padding: '16px 30px' }} disabled={blocked || busy} onClick={reservar}>
          {busy ? 'Procesando…' : 'Reservar y pagar con tarjeta'}
        </button>
        <p className="st-lead" style={{ fontSize: 11, marginTop: 10, letterSpacing: '0.06em' }}>
          Tarjeta por default · también OXXO, transferencia y wallet
        </p>
      </div>
    </div>
  );
}
