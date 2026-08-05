'use client';

import { useEffect, useState } from 'react';
import { ECONOMICS, fmtMxn } from '@flowbond/sanitemplo-core';
import { sanitemploClient, sanitemploConfigured } from '@/lib/sanitemplo/client';

interface FundRow {
  periodo: string;
  base: string;
  monto: number;
  ordenes: number;
  transferido: number | null;
}

export default function FondoClient() {
  const [rows, setRows] = useState<FundRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!sanitemploConfigured) {
      setLoaded(true);
      return;
    }
    (async () => {
      // Vista pública: se lee SIN login, a propósito.
      const { data } = await sanitemploClient().from('sanitemplo_fund_public').select('*');
      setRows((data as FundRow[]) ?? []);
      setLoaded(true);
    })();
  }, []);

  const total = rows.reduce((a, r) => a + Number(r.monto), 0);

  return (
    <section className="st-section">
      <div className="st-wrap" style={{ maxWidth: 760 }}>
        <p className="st-eyebrow">Fondo Reciprociudad · sin login</p>
        <h1 style={{ marginTop: 10 }}>El {Math.round(ECONOMICS.fundPct * 100)}% que sostiene la red, a la vista</h1>
        <p className="st-lead" style={{ marginTop: 12 }}>
          Un fondo comunitario que no se puede auditar sin cuenta no es comunitario. Por eso esto
          se lee sin iniciar sesión — es lo que hace creíble el voto.
        </p>

        <div className="st-card st-card--gold" style={{ marginTop: 18 }}>
          <div className="st-line" style={{ borderBottom: 0 }}>
            <span className="st-line-label">Acumulado al fondo</span>
            <span className="st-num st-gold" style={{ fontSize: 24 }}>{fmtMxn(total)}</span>
          </div>
        </div>

        <div className="st-card" style={{ marginTop: 16 }}>
          {!loaded ? (
            <p className="st-lead">Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="st-lead">Aún no hay movimientos. Cada patrocinio pagado deja aquí su tercio.</p>
          ) : (
            rows.map((r, i) => (
              <div className="st-line" key={i}>
                <span>
                  <span className="st-num">{r.periodo}</span>
                  <span className="st-line-label" style={{ marginLeft: 8 }}>base {r.base} · {r.ordenes} órdenes</span>
                </span>
                <span className="st-num">
                  {fmtMxn(Number(r.monto))}
                  {r.transferido ? <span className="st-line-pct" style={{ marginLeft: 8 }}>{fmtMxn(Number(r.transferido))} transferido</span> : null}
                </span>
              </div>
            ))
          )}
        </div>

        <p className="st-lead" style={{ fontSize: 12, marginTop: 16 }}>
          Gobernanza del fondo: DAO en formación. El peso del voto todavía no se diseña — no se
          pone onchain una gobernanza sin diseñar.
        </p>
      </div>
    </section>
  );
}
