'use client';

import { useState } from 'react';
import {
  checkClaim,
  validateRielBContent,
  fmtMxn,
  type Quote,
  type Riel,
} from '@flowbond/sanitemplo-core';
import {
  sanitemploClient,
  sanitemploConfigured,
  sessionToken,
  SANITEMPLO_API,
} from '@/lib/sanitemplo/client';

interface Draft {
  visits: number;
  templos: number;
  periodId: string;
  riel: Riel;
  spaceIds: string[];
}

type Result =
  | { kind: 'order'; orderId: string; total: number }
  | { kind: 'lead'; leadId: string }
  | { kind: 'error'; message: string };

export default function Checkout({ draft, q }: { draft: Draft; q: Quote }) {
  const [email, setEmail] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [rfc, setRfc] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [placa, setPlaca] = useState('');
  const [cadence, setCadence] = useState<'unica' | 'mensual'>('unica');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const claim = checkClaim(`${mensaje} ${razonSocial}`);
  const placaCheck = draft.riel === 'B' ? validateRielBContent({ nombre: placa }) : { ok: true, errors: [] };
  const blocked = q.errors.length > 0 || !claim.ok || (draft.riel === 'B' && !placaCheck.ok) || !email;

  async function submit() {
    if (blocked) return;
    setBusy(true);
    setResult(null);
    try {
      const token = sanitemploConfigured ? await sessionToken() : null;

      // Camino completo: Worker autoritativo (recotiza server-side) si hay sesión.
      if (SANITEMPLO_API && token) {
        const res = await fetch(`${SANITEMPLO_API}/order`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...draft, razonSocial, rfc, email, cadence }),
        });
        const data = (await res.json()) as { orderId?: string; total?: number; error?: string };
        if (!res.ok || !data.orderId) throw new Error(data.error ?? 'No se pudo crear la orden.');
        setResult({ kind: 'order', orderId: data.orderId, total: data.total ?? q.total });
        return;
      }

      // Camino de captura: registra el interés (RPC público). El equipo da seguimiento.
      if (!sanitemploConfigured) throw new Error('Falta configurar Supabase en el sitio.');
      const { data, error } = await sanitemploClient().rpc('sanitemplo_submit_lead', {
        p_email: email,
        p_nombre: null,
        p_razon_social: razonSocial || null,
        p_riel: draft.riel,
        p_visitas: draft.visits,
        p_templos: draft.templos,
        p_plazo_id: draft.periodId,
        p_space_tipos: draft.spaceIds,
        p_node_ids: null,
        p_mensaje: mensaje || (draft.riel === 'B' ? `Placa: ${placa}` : null),
      });
      if (error) throw new Error(error.message);
      setResult({ kind: 'lead', leadId: data as string });
    } catch (e) {
      setResult({ kind: 'error', message: e instanceof Error ? e.message : 'Error inesperado.' });
    } finally {
      setBusy(false);
    }
  }

  if (result?.kind === 'order') {
    return (
      <div className="st-card st-card--gold" role="status">
        <h3 className="st-gold">Reservaste {draft.visits.toLocaleString('es-MX')} visitas.</h3>
        <p className="st-lead" style={{ marginTop: 10 }}>
          Total {fmtMxn(result.total)}. La reserva es de visitas, no de ubicación: ahora eliges
          dónde y cuándo. Orden <span className="st-num">{result.orderId.slice(0, 8)}</span>.
        </p>
        <a className="st-btn" href={`/gracias?order=${result.orderId}`} style={{ marginTop: 14 }}>
          Asignar mis visitas →
        </a>
      </div>
    );
  }
  if (result?.kind === 'lead') {
    return (
      <div className="st-card" role="status">
        <h3>Recibimos tu intención.</h3>
        <p className="st-lead" style={{ marginTop: 10 }}>
          Te escribimos a {email} para cerrar la presencia y emitir tu CFDI
          {draft.riel === 'A' ? ' de publicidad' : ' de donativo'}.
        </p>
      </div>
    );
  }

  return (
    <div className="st-card">
      <p className="st-eyebrow">Cerrar</p>
      <h3 style={{ marginTop: 8 }}>
        {draft.riel === 'A' ? 'Patrocina esta presencia' : 'Deja tu nombre en la placa'}
      </h3>

      <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
        <input
          className="st-input"
          type="email"
          placeholder="Correo de contacto"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Correo"
        />
        {draft.riel === 'A' ? (
          <>
            <input
              className="st-input"
              placeholder="Razón social (para el CFDI)"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              aria-label="Razón social"
            />
            <input
              className="st-input"
              placeholder="RFC (opcional)"
              value={rfc}
              onChange={(e) => setRfc(e.target.value)}
              aria-label="RFC"
            />
            <textarea
              className="st-textarea"
              placeholder="Mensaje o brief de campaña (opcional)"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              aria-label="Mensaje"
            />
          </>
        ) : (
          <input
            className="st-input"
            placeholder="Nombre a grabar (máx. 48 caracteres)"
            maxLength={48}
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            aria-label="Nombre en la placa"
          />
        )}
      </div>

      {/* una exhibición vs mensual */}
      <div style={{ marginTop: 14 }}>
        <div className="st-label"><span>Cómo se cobra</span></div>
        <div className="st-seg">
          <button data-on={cadence === 'unica'} onClick={() => setCadence('unica')}>Una exhibición</button>
          <button data-on={cadence === 'mensual'} onClick={() => setCadence('mensual')}>
            Mensual · se renueva solo
          </button>
        </div>
        {cadence === 'mensual' ? (
          <p className="st-lead" style={{ fontSize: 12, marginTop: 6 }}>
            {fmtMxn(q.total)} cada mes hasta que lo canceles. Ideal para “Beneficio de equipo”.
          </p>
        ) : null}
      </div>

      {/* el sistema no deja pasar lo que no puede decir */}
      {!claim.ok ? (
        <p className="st-err" style={{ marginTop: 12 }}>
          Ese texto incluye una claim que este patrocinio no sustenta ({claim.hits.join(', ')}). La
          responsabilidad recaería en ti, y por eso no se puede.
        </p>
      ) : null}
      {draft.riel === 'B' && !placaCheck.ok ? (
        <p className="st-err" style={{ marginTop: 12 }}>{placaCheck.errors[0]}</p>
      ) : null}
      {result?.kind === 'error' ? (
        <p className="st-err" style={{ marginTop: 12 }}>{result.message}</p>
      ) : null}

      <button className="st-btn" style={{ marginTop: 16 }} disabled={blocked || busy} onClick={submit}>
        {busy
          ? 'Enviando…'
          : draft.riel === 'A'
            ? `Patrocinar · ${fmtMxn(q.total)}`
            : 'Reservar mi placa'}
      </button>
    </div>
  );
}
