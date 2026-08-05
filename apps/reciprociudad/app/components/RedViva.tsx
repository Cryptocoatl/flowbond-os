'use client';

import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase-browser';
import { richKey } from '@/lib/rich';
import {
  publishedNodes,
  myNode,
  upsertNode,
  NODE_KINDS,
  KIND_LABEL,
  type Nodo,
  type NodeInput,
} from '@/lib/nodos';

const EMPTY: NodeInput = {
  name: '',
  kind: 'comunidad',
  description: '',
  offers: '',
  needs: '',
  contact: '',
  lat: null,
  lng: null,
};

export default function RedViva({ copy }: { copy: Record<string, string> }) {
  const [nodes, setNodes] = useState<Nodo[]>([]);
  const [authed, setAuthed] = useState(false);
  const [form, setForm] = useState<NodeInput>(EMPTY);
  const [hasNode, setHasNode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function refresh() {
    try {
      setNodes(await publishedNodes());
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    refresh();
    const sb = browserClient();
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      setAuthed(true);
      try {
        const mine = await myNode();
        if (mine) {
          setHasNode(true);
          setForm({
            name: mine.name,
            kind: mine.kind,
            description: mine.description ?? '',
            offers: mine.offers ?? '',
            needs: mine.needs ?? '',
            contact: mine.contact ?? '',
            lat: mine.lat,
            lng: mine.lng,
          });
        }
      } catch {
        /* ignore */
      }
    });
  }, []);

  function locate() {
    if (!navigator.geolocation) {
      setMsg({ kind: 'err', text: 'Tu navegador no comparte ubicación. Escríbela a mano abajo.' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        }));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setMsg({ kind: 'err', text: 'No pudimos leer tu ubicación. Escríbela a mano.' });
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function submit() {
    if (!form.name.trim()) {
      setMsg({ kind: 'err', text: 'Ponle nombre a tu nodo.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await upsertNode(form);
      setHasNode(true);
      setMsg({ kind: 'ok', text: '¡Tu nodo está en la red! Ya aparece en el mapa vivo.' });
      await refresh();
    } catch {
      setMsg({ kind: 'err', text: 'No se pudo guardar. Revisa que hayas iniciado sesión e inténtalo.' });
    }
    setBusy(false);
  }

  const set = (k: keyof NodeInput) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <section className="section" id="red">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">{copy['red.eyebrow']}</span>
          <h2 className="display-md">{richKey(copy, 'red.title')}</h2>
          <p className="sub">{richKey(copy, 'red.sub')}</p>
        </div>

        <div className="nodos-grid reveal">
          {nodes.map((n) => (
            <article className="nodo" key={n.id}>
              <span className={`nodo-kind k-${n.kind}`}>{KIND_LABEL[n.kind] ?? n.kind}</span>
              <h3>{n.name}</h3>
              {n.description && <p className="nodo-desc">{n.description}</p>}
              {n.offers && (
                <p className="nodo-line">
                  <b>Ofrece:</b> {n.offers}
                </p>
              )}
              {n.needs && (
                <p className="nodo-line">
                  <b>Necesita:</b> {n.needs}
                </p>
              )}
            </article>
          ))}
          {nodes.length === 0 && (
            <p className="nodo-empty">{copy['red.empty']}</p>
          )}
        </div>

        {/* Registration */}
        <div className="nodo-register reveal">
          {!authed ? (
            <div className="nodo-gate">
              <h3>{copy['red.gateTitle']}</h3>
              <p>{richKey(copy, 'red.gateBody')}</p>
              <a href="#unete" className="btn btn-sun">
                Entrar con FBID →
              </a>
            </div>
          ) : (
            <div className="nodo-form">
              <h3>{hasNode ? 'Tu nodo' : copy['red.gateTitle']}</h3>
              <p className="nodo-form-sub">
                {hasNode
                  ? 'Actualiza lo que tu nodo ofrece y necesita cuando quieras.'
                  : 'Ponte en el mapa: lo que das y lo que buscas.'}
              </p>
              <div className="nodo-fields">
                <input
                  placeholder="Nombre del nodo"
                  aria-label="Nombre del nodo"
                  value={form.name}
                  onChange={(e) => set('name')(e.target.value)}
                />
                <select
                  aria-label="Tipo de nodo"
                  value={form.kind}
                  onChange={(e) => set('kind')(e.target.value)}
                >
                  {NODE_KINDS.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                <textarea
                  placeholder="¿Qué es tu nodo? (breve)"
                  aria-label="Descripción"
                  rows={2}
                  value={form.description}
                  onChange={(e) => set('description')(e.target.value)}
                />
                <input
                  placeholder="Qué ofreces (ej. composta, talleres, espacio)"
                  aria-label="Qué ofreces"
                  value={form.offers}
                  onChange={(e) => set('offers')(e.target.value)}
                />
                <input
                  placeholder="Qué necesitas (ej. voluntarios, semillas)"
                  aria-label="Qué necesitas"
                  value={form.needs}
                  onChange={(e) => set('needs')(e.target.value)}
                />
                <input
                  placeholder="Contacto (opcional: correo, IG, tel)"
                  aria-label="Contacto"
                  value={form.contact}
                  onChange={(e) => set('contact')(e.target.value)}
                />
                <div className="nodo-loc">
                  <button
                    type="button"
                    className="btn btn-ghost-d"
                    onClick={locate}
                    disabled={locating}
                  >
                    {locating ? 'Ubicando…' : '📍 Usar mi ubicación'}
                  </button>
                  <input
                    placeholder="Lat"
                    aria-label="Latitud"
                    inputMode="decimal"
                    value={form.lat ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lat: e.target.value ? Number(e.target.value) : null }))
                    }
                  />
                  <input
                    placeholder="Lng"
                    aria-label="Longitud"
                    inputMode="decimal"
                    value={form.lng ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lng: e.target.value ? Number(e.target.value) : null }))
                    }
                  />
                </div>
              </div>
              <button className="btn btn-sun" onClick={submit} disabled={busy}>
                {busy ? 'Guardando…' : hasNode ? 'Actualizar mi nodo' : 'Poner mi nodo en el mapa →'}
              </button>
              {msg && (
                <p className={`nodo-msg ${msg.kind}`} role="status">
                  {msg.text}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
