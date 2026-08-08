'use client';

import { useEffect, useState } from 'react';
import { ECONOMICS, fmtMxn } from '@flowbond/sanitemplo-core';
import { sanitemploClient, sanitemploConfigured } from '@/lib/sanitemplo/client';

interface Overview {
  ordenes: number;
  ordenes_pagadas: number;
  visitas: number;
  fondo_total: number;
  disb_pendiente: number;
  disb_enviado: number;
}
interface Settlement {
  periodo: string;
  node_id: string | null;
  bruto: number;
  fondo_33: number;
  brandmark_12: number;
  flowbond_8: number;
  costo_directo: number;
  neto_nodo: number;
  neto: number;
}

type State = 'loading' | 'denied' | 'ready' | 'unconfigured';

export default function AdminClient() {
  const [state, setState] = useState<State>('loading');
  const [ov, setOv] = useState<Overview | null>(null);
  const [rows, setRows] = useState<Settlement[]>([]);

  useEffect(() => {
    if (!sanitemploConfigured) {
      setState('unconfigured');
      return;
    }
    const sb = sanitemploClient();
    (async () => {
      const { data: isAdmin } = await sb.rpc('sanitemplo_is_admin');
      if (!isAdmin) {
        setState('denied');
        return;
      }
      const { data: overview } = await sb.rpc('sanitemplo_admin_overview');
      const { data: settlements } = await sb.rpc('sanitemplo_admin_settlements', { p_periodo: null });
      setOv(overview as Overview);
      setRows((settlements as Settlement[]) ?? []);
      setState('ready');
    })();
  }, []);

  if (state === 'loading') return <Wrap><p className="st-lead">Verificando…</p></Wrap>;
  if (state === 'unconfigured') return <Wrap><p className="st-lead">Falta configurar Supabase.</p></Wrap>;
  if (state === 'denied')
    return (
      <Wrap>
        <h1>Panel de Sani Templo</h1>
        <p className="st-lead" style={{ marginTop: 12 }}>
          Necesitas una sesión de administrador. Inicia sesión con tu FlowBond ID; si eres admin,
          el panel aparece.
        </p>
      </Wrap>
    );

  const cards: [string, string][] = [
    ['Órdenes', String(ov?.ordenes ?? 0)],
    ['Pagadas', String(ov?.ordenes_pagadas ?? 0)],
    ['Visitas vendidas', (ov?.visitas ?? 0).toLocaleString('es-MX')],
    [`Fondo (${Math.round(ECONOMICS.fundPct * 100)}%)`, fmtMxn(ov?.fondo_total ?? 0)],
    ['Dispersión pendiente', fmtMxn(ov?.disb_pendiente ?? 0)],
    ['Dispersión enviada', fmtMxn(ov?.disb_enviado ?? 0)],
  ];

  return (
    <Wrap>
      <p className="st-eyebrow">Panel · admin</p>
      <h1 style={{ marginTop: 8 }}>Sani Templo</h1>

      <div className="st-doors" style={{ marginTop: 18 }}>
        {cards.map(([k, v]) => (
          <div className="st-card" key={k}>
            <p className="st-line-label">{k}</p>
            <p className="st-num st-gold" style={{ fontSize: 22, marginTop: 6 }}>{v}</p>
          </div>
        ))}
      </div>

      <div className="st-card" style={{ marginTop: 20 }}>
        <p className="st-eyebrow" style={{ letterSpacing: '0.16em' }}>Liquidaciones por periodo y nodo</p>
        {rows.length === 0 ? (
          <p className="st-lead" style={{ marginTop: 10 }}>
            Sin liquidaciones aún. El Worker liquida cada mes (POST /settle) — bruto, 33% fondo, 12%
            BrandMark, 8% FlowBond, costo directo, neto.
          </p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'right', color: 'var(--st-cal-dim)' }}>
                  <th style={{ textAlign: 'left' }}>Periodo</th>
                  <th>Bruto</th><th>Fondo</th><th>BrandMark</th><th>FlowBond</th><th>Costo</th><th>Neto</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="st-num" style={{ textAlign: 'right' }}>
                    <td style={{ textAlign: 'left' }}>{r.periodo}</td>
                    <td>{fmtMxn(r.bruto)}</td>
                    <td>{fmtMxn(r.fondo_33)}</td>
                    <td>{fmtMxn(r.brandmark_12)}</td>
                    <td>{fmtMxn(r.flowbond_8)}</td>
                    <td>{fmtMxn(r.costo_directo)}</td>
                    <td className="st-gold">{fmtMxn(r.neto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="st-lead" style={{ fontSize: 12, marginTop: 16 }}>
        La “Dispersión pendiente” es la cola de pagos a fondo / BrandMark / FlowBond / nodo. Aquí se
        conectan los rieles de Mercado Pago cuando estén: cada fila ya existe como disbursement.
      </p>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <section className="st-section">
      <div className="st-wrap" style={{ maxWidth: 900 }}>{children}</div>
    </section>
  );
}
