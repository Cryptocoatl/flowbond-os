'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fmtMxn } from '@flowbond/sanitemplo-core';
import { sanitemploClient, sanitemploConfigured, sessionToken, SANITEMPLO_API } from '@/lib/sanitemplo/client';

interface OrderRow {
  id: string;
  visitas: number;
  total: number;
  status: string;
  cadencia: string;
  riel: string;
}
interface NodeRow {
  id: string;
  nombre: string;
  status: string;
  capacidad: number;
}

export default function GraciasClient() {
  const orderId = useSearchParams().get('order');
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [pending, setPending] = useState<number | null>(null);
  const [node, setNode] = useState('');
  const [visits, setVisits] = useState(0);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sanitemploConfigured || !orderId) return;
    const sb = sanitemploClient();
    (async () => {
      const { data: o } = await sb
        .from('sanitemplo_orders')
        .select('id, visitas, total, status, cadencia, riel')
        .eq('id', orderId)
        .maybeSingle();
      if (o) {
        setOrder(o as OrderRow);
        setPending((o as OrderRow).visitas);
        setVisits((o as OrderRow).visitas);
      }
      const { data: n } = await sb
        .from('sanitemplo_nodes')
        .select('id, nombre, status, capacidad')
        .eq('status', 'abierto')
        .order('nombre');
      setNodes((n as NodeRow[]) ?? []);
    })();
  }, [orderId]);

  async function allocate() {
    if (!orderId || !node || !start || !end || visits <= 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const token = await sessionToken();
      if (!SANITEMPLO_API || !token) throw new Error('Inicia sesión para asignar tus visitas.');
      const res = await fetch(`${SANITEMPLO_API}/allocate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, nodeId: node, visits, startDate: start, endDate: end }),
      });
      const data = (await res.json()) as { pendingVisits?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'No se pudo asignar.');
      setPending(data.pendingVisits ?? 0);
      setVisits(data.pendingVisits ?? 0);
      setMsg(`Asignadas. Quedan ${data.pendingVisits ?? 0} visitas por ubicar.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error.');
    } finally {
      setBusy(false);
    }
  }

  if (!orderId) {
    return (
      <section className="st-section">
        <div className="st-wrap">
          <h1>Gracias</h1>
          <p className="st-lead" style={{ marginTop: 12 }}>Falta el número de orden en el enlace.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="st-section">
      <div className="st-wrap" style={{ maxWidth: 720 }}>
        <p className="st-eyebrow">Reservaste visitas</p>
        <h1 style={{ marginTop: 10 }}>Ahora eliges dónde y cuándo</h1>
        <p className="st-lead" style={{ marginTop: 12 }}>
          La reserva es de visitas, no de ubicación. Repártelas entre los nodos abiertos, en las
          fechas que quieras. Nunca asignarás más de las que compraste.
        </p>

        {order ? (
          <div className="st-card" style={{ marginTop: 18 }}>
            <div className="st-line"><span className="st-line-label">Orden</span><span className="st-num">{order.id.slice(0, 8)}</span></div>
            <div className="st-line"><span className="st-line-label">Total · {order.cadencia === 'mensual' ? 'mensual' : 'única'}</span><span className="st-num">{fmtMxn(order.total)}</span></div>
            <div className="st-line"><span className="st-line-label">Estado</span><span className="st-num">{order.status}</span></div>
            <div className="st-line" style={{ borderBottom: 0 }}><span className="st-line-label">Visitas por asignar</span><span className="st-num st-gold">{pending ?? order.visitas}</span></div>
          </div>
        ) : (
          <p className="st-lead" style={{ marginTop: 16 }}>Cargando tu orden… (necesitas la sesión con la que compraste).</p>
        )}

        <div className="st-card" style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          <div className="st-field" style={{ margin: 0 }}>
            <label className="st-label" htmlFor="g-node"><span>Nodo abierto</span></label>
            <select id="g-node" className="st-input" value={node} onChange={(e) => setNode(e.target.value)}>
              <option value="">Elige un nodo…</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>{n.nombre} · cap {n.capacidad}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <label className="st-label" style={{ display: 'block' }}>
              Visitas
              <input className="st-input" type="number" min={1} value={visits} onChange={(e) => setVisits(Number(e.target.value))} />
            </label>
            <label className="st-label" style={{ display: 'block' }}>
              Desde
              <input className="st-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="st-label" style={{ display: 'block' }}>
              Hasta
              <input className="st-input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
          <button className="st-btn" disabled={busy || !node || !start || !end || visits <= 0} onClick={allocate}>
            {busy ? 'Asignando…' : 'Asignar a este nodo'}
          </button>
          {msg ? <p className={msg.startsWith('Asignadas') ? 'st-lead' : 'st-err'}>{msg}</p> : null}
        </div>
      </div>
    </section>
  );
}
