'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { browserClient } from '@/lib/supabase-browser';
import {
  GROUPS,
  DEFAULTS,
  MEDIA,
  MEDIA_DEFAULTS,
  INICIATIVAS_DEFAULT,
  type Field,
} from '@/lib/site-content';
import {
  whoAmI,
  loadOverrides,
  setCopy,
  resetCopy,
  history,
  loadMedia,
  setMedia,
  resetMedia,
  uploadImage,
  listIniciativas,
  saveIniciativa,
  deleteIniciativa,
  listNodes,
  setNodeStatus,
  listAdmins,
  grantAdmin,
  setAdminActive,
  pushLive,
  type Me,
  type HistoryRow,
  type AdminIniciativa,
  type AdminNodo,
  type AdminUser,
} from '@/lib/admin';
import { KIND_LABEL, NODE_KINDS } from '@/lib/nodos';
import './admin.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO = '/logo-512.png';

type Tab = 'copy' | 'media' | 'red' | 'inits' | 'hist' | 'team';

const TABS: { id: Tab; label: string; superOnly?: boolean }[] = [
  { id: 'copy', label: 'Textos' },
  { id: 'media', label: 'Imágenes' },
  { id: 'red', label: 'Red viva' },
  { id: 'inits', label: 'Iniciativas' },
  { id: 'hist', label: 'Historial' },
  { id: 'team', label: 'Equipo', superOnly: true },
];

export default function AdminClient() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<Tab>('copy');

  const check = useCallback(async () => {
    const { data } = await browserClient().auth.getSession();
    if (!data.session) {
      setSession(false);
      setMe(null);
      setReady(true);
      return;
    }
    setSession(true);
    try {
      setMe(await whoAmI());
    } catch {
      setMe(null);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  async function signOut() {
    await browserClient().auth.signOut();
    setSession(false);
    setMe(null);
  }

  if (!ready) {
    return (
      <div className="rc-admin">
        <div className="a-gate">
          <p className="a-empty">Cargando…</p>
        </div>
      </div>
    );
  }

  if (!session) return <Gate onDone={check} />;

  if (!me) {
    return (
      <div className="rc-admin">
        <div className="a-gate">
          <div className="a-gate-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="" />
            <h1>Esta cuenta no edita el sitio</h1>
            <p>
              Tu identidad FBID está activa, pero todavía no tiene permiso de edición en
              reciprociudad.lat. Pídele a Steph que te dé acceso desde <b>Equipo</b>.
            </p>
            <button className="a-btn" onClick={signOut}>
              Salir
            </button>
          </div>
        </div>
      </div>
    );
  }

  const visible = TABS.filter((t) => !t.superOnly || me.is_super);

  return (
    <div className="rc-admin">
      <header className="a-top">
        <div className="a-top-in">
          <span className="a-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="" />
            Reciprociudad
          </span>
          <span className="a-tag">{me.is_super ? 'Super admin' : 'Editor'}</span>
          <div className="a-who">
            <span>{me.nombre || me.email}</span>
            <a className="a-btn sm" href="/" target="_blank" rel="noopener">
              Ver el sitio ↗
            </a>
            <button className="a-btn sm" onClick={signOut}>
              Salir
            </button>
          </div>
        </div>
        <div className="a-tabs">
          {visible.map((t) => (
            <button
              key={t.id}
              className={`a-tab${tab === t.id ? ' on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="a-wrap">
        {tab === 'copy' && <CopyTab />}
        {tab === 'media' && <MediaTab />}
        {tab === 'red' && <RedTab />}
        {tab === 'inits' && <IniciativasTab />}
        {tab === 'hist' && <HistoryTab />}
        {tab === 'team' && me.is_super && <TeamTab meFbid={me.fbid} />}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── Login gate ── */

function Gate({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function send() {
    const v = email.trim();
    if (!EMAIL_RE.test(v)) return setErr('Escribe un correo válido.');
    setErr('');
    setBusy(true);
    // shouldCreateUser:false — /admin never mints an identity, it only lets an
    // existing FBID in. Access is granted from the Equipo tab, not by logging in.
    const { error } = await browserClient().auth.signInWithOtp({
      email: v,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) return setErr('No pudimos enviar el código. ¿Es el correo con el que entras a la red?');
    setStep('code');
  }

  async function verify() {
    const token = code.replace(/\D/g, '');
    if (token.length < 4) return setErr('Escribe el código que te llegó.');
    setErr('');
    setBusy(true);
    const { error } = await browserClient().auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    });
    setBusy(false);
    if (error) return setErr('Código incorrecto o expirado. Pídelo de nuevo.');
    onDone();
  }

  return (
    <div className="rc-admin">
      <div className="a-gate">
        <div className="a-gate-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="" />
          <h1>Editar Reciprociudad</h1>
          <p>
            {step === 'email'
              ? 'Entra con tu correo. Te mandamos un código — no hay contraseña que recordar.'
              : `Escribe el código que llegó a ${email.trim()}.`}
          </p>

          {step === 'email' ? (
            <>
              <input
                type="email"
                placeholder="tu@correo.com"
                aria-label="Tu correo"
                autoComplete="email"
                value={email}
                disabled={busy}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErr('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <button className="a-btn aqua" onClick={send} disabled={busy}>
                {busy ? 'Enviando…' : 'Enviarme el código →'}
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="Código"
                aria-label="Código"
                value={code}
                autoFocus
                disabled={busy}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ''));
                  setErr('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && verify()}
              />
              <button className="a-btn aqua" onClick={verify} disabled={busy}>
                {busy ? 'Entrando…' : 'Entrar →'}
              </button>
              <button
                className="a-btn sm"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setErr('');
                }}
              >
                Cambiar correo
              </button>
            </>
          )}

          {err && <p className="a-msg err">{err}</p>}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── Textos ── */

function CopyTab() {
  const [saved, setSaved] = useState<Record<string, string>>(DEFAULTS);
  const [overridden, setOverridden] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<Record<string, string>>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ov = await loadOverrides();
      const merged = { ...DEFAULTS, ...ov };
      setSaved(merged);
      setDraft(merged);
      setOverridden(new Set(Object.keys(ov)));
    } catch {
      setMsg('No pudimos leer los textos guardados.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(
    () => Object.keys(draft).filter((k) => draft[k] !== saved[k]),
    [draft, saved],
  );

  async function saveAll() {
    setBusy(true);
    setMsg('');
    try {
      for (const k of dirty) await setCopy(k, draft[k]);
      await pushLive();
      setSaved({ ...draft });
      setOverridden((prev) => {
        const next = new Set(prev);
        for (const k of dirty) next.add(k);
        return next;
      });
      setMsg(`Guardado. ${dirty.length} ${dirty.length === 1 ? 'cambio' : 'cambios'} ya están en vivo.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
    setBusy(false);
  }

  async function restore(key: string) {
    setBusy(true);
    try {
      await resetCopy(key);
      await pushLive();
      setSaved((s) => ({ ...s, [key]: DEFAULTS[key] }));
      setDraft((d) => ({ ...d, [key]: DEFAULTS[key] }));
      setOverridden((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setMsg('Texto original restaurado.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo restaurar.');
    }
    setBusy(false);
  }

  if (loading) return <p className="a-empty">Cargando los textos…</p>;

  return (
    <>
      <div className="a-intro">
        <h1>Los textos del sitio</h1>
        <p>
          Cambia cualquier frase de reciprociudad.lat. Escribe <b>**así**</b> para resaltar una
          palabra (en los títulos sale con color; en los párrafos sale en negritas), y usa un salto
          de línea para partir un título en dos renglones. Nada se pierde: cada cambio queda en el
          historial y siempre puedes volver al texto original.
        </p>
        {msg && <p className={`a-msg ${msg.startsWith('Guardado') || msg.includes('restaurado') ? 'ok' : 'err'}`}>{msg}</p>}
      </div>

      {GROUPS.map((g, gi) => (
        <details className="a-group" key={g.id} open={gi === 0}>
          <summary>
            {g.title}
            {g.note && <span className="a-group-note">{g.note}</span>}
          </summary>
          <div className="a-group-body">
            {g.fields.map((f) => (
              <FieldRow
                key={f.key}
                field={f}
                value={draft[f.key] ?? ''}
                isDirty={draft[f.key] !== saved[f.key]}
                isOverridden={overridden.has(f.key)}
                busy={busy}
                onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                onRestore={() => restore(f.key)}
              />
            ))}
          </div>
        </details>
      ))}

      <div className={`a-bar${dirty.length ? ' show' : ''}`}>
        <span>
          {dirty.length} {dirty.length === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}
        </span>
        <button className="a-btn sm" onClick={() => setDraft({ ...saved })} disabled={busy}>
          Descartar
        </button>
        <button className="a-btn gold" onClick={saveAll} disabled={busy}>
          {busy ? 'Publicando…' : 'Publicar cambios'}
        </button>
      </div>
    </>
  );
}

function FieldRow({
  field,
  value,
  isDirty,
  isOverridden,
  busy,
  onChange,
  onRestore,
}: {
  field: Field;
  value: string;
  isDirty: boolean;
  isOverridden: boolean;
  busy: boolean;
  onChange: (v: string) => void;
  onRestore: () => void;
}) {
  return (
    <div className={`a-field${isDirty ? ' a-dirty' : ''}`}>
      <div className="a-field-head">
        <span className="a-label">{field.label}</span>
        {isOverridden && <span className="a-changed">editado</span>}
        {isOverridden && !busy && (
          <button className="a-btn sm" onClick={onRestore} type="button">
            Restaurar original
          </button>
        )}
      </div>
      {field.hint && <span className="a-hint">{field.hint}</span>}
      {field.type === 'textarea' ? (
        <textarea
          value={value}
          rows={Math.min(6, Math.max(2, Math.ceil(value.length / 70)))}
          aria-label={field.label}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={field.type === 'url' ? 'url' : 'text'}
          value={value}
          aria-label={field.label}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── Imágenes ── */

function MediaTab() {
  const [urls, setUrls] = useState<Record<string, string>>(MEDIA_DEFAULTS);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [custom, setCustom] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const rows = await loadMedia();
      setUrls({ ...MEDIA_DEFAULTS, ...rows });
      setCustom(new Set(Object.keys(rows)));
    } catch {
      setMsg('No pudimos leer las imágenes.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(slot: string, file: File) {
    setBusy(slot);
    setMsg('');
    try {
      const { url, path } = await uploadImage(slot, file);
      await setMedia(slot, url, path);
      await pushLive();
      setUrls((u) => ({ ...u, [slot]: url }));
      setCustom((c) => new Set(c).add(slot));
      setMsg('Imagen reemplazada y publicada.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo subir la imagen.');
    }
    setBusy('');
  }

  async function restore(slot: string) {
    setBusy(slot);
    try {
      await resetMedia(slot);
      await pushLive();
      setUrls((u) => ({ ...u, [slot]: MEDIA_DEFAULTS[slot] }));
      setCustom((c) => {
        const n = new Set(c);
        n.delete(slot);
        return n;
      });
      setMsg('Imagen original restaurada.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo restaurar.');
    }
    setBusy('');
  }

  return (
    <>
      <div className="a-intro">
        <h1>Las imágenes</h1>
        <p>
          Reemplaza las imágenes del viaje. Usa la mejor resolución que tengas —el sitio se encarga
          de servirlas optimizadas. Formatos: WebP, JPG, PNG o AVIF, hasta 10&nbsp;MB.
        </p>
        {msg && <p className={`a-msg ${msg.includes('No se') || msg.includes('No pudimos') ? 'err' : 'ok'}`}>{msg}</p>}
      </div>

      <div className="a-cards">
        {MEDIA.map((m) => (
          <div className="a-card" key={m.slot}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="a-shot" src={urls[m.slot]} alt={m.label} />
            <h3>{m.label}</h3>
            {m.hint && <span className="a-hint">{m.hint}</span>}
            <span className="a-pill">{custom.has(m.slot) ? 'reemplazada' : 'original'}</span>
            <input
              className="a-file"
              type="file"
              accept="image/webp,image/jpeg,image/png,image/avif"
              disabled={busy === m.slot}
              aria-label={`Reemplazar ${m.label}`}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(m.slot, f);
                e.target.value = '';
              }}
            />
            {busy === m.slot && <span className="a-hint">Subiendo…</span>}
            {custom.has(m.slot) && (
              <button className="a-btn sm" onClick={() => restore(m.slot)} disabled={busy === m.slot}>
                Restaurar original
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────── Red viva ── */

function RedTab() {
  const [nodes, setNodes] = useState<AdminNodo[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setNodes(await listNodes());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No pudimos leer los nodos.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function move(id: string, status: 'published' | 'draft') {
    setBusy(id);
    try {
      await setNodeStatus(id, status);
      await pushLive();
      setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, status } : n)));
      setMsg(status === 'published' ? 'Nodo publicado en el mapa.' : 'Nodo oculto del sitio.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo cambiar.');
    }
    setBusy('');
  }

  if (loading) return <p className="a-empty">Cargando la red…</p>;

  return (
    <>
      <div className="a-intro">
        <h1>La red viva</h1>
        <p>
          Cada nodo lo registra una persona desde el sitio. Aquí decides cuáles se ven en la
          sección &ldquo;La red viva&rdquo;. Ocultar un nodo no lo borra: su dueño sigue viéndolo y
          puede seguir editándolo.
        </p>
        {msg && <p className={`a-msg ${msg.startsWith('No') ? 'err' : 'ok'}`}>{msg}</p>}
      </div>

      {nodes.length === 0 && <p className="a-empty">Todavía nadie registra un nodo.</p>}

      <div className="a-cards">
        {nodes.map((n) => (
          <div className="a-card" key={n.id}>
            <span className="a-meta">{KIND_LABEL[n.kind] ?? n.kind}</span>
            <h3>{n.name}</h3>
            {n.description && <p className="a-hint">{n.description}</p>}
            {n.offers && (
              <p className="a-hint">
                <b>Ofrece:</b> {n.offers}
              </p>
            )}
            {n.needs && (
              <p className="a-hint">
                <b>Necesita:</b> {n.needs}
              </p>
            )}
            {n.contact && (
              <p className="a-hint">
                <b>Contacto:</b> {n.contact}
              </p>
            )}
            <span className="a-hint">
              {n.lat != null && n.lng != null
                ? `📍 ${n.lat.toFixed(4)}, ${n.lng.toFixed(4)}`
                : 'Sin ubicación'}
            </span>
            <span className={`a-pill ${n.status === 'published' ? 'ok' : 'off'}`}>
              {n.status === 'published' ? 'en el sitio' : 'oculto'}
            </span>
            <div className="a-actions">
              {n.status === 'published' ? (
                <button className="a-btn sm" onClick={() => move(n.id, 'draft')} disabled={busy === n.id}>
                  Ocultar
                </button>
              ) : (
                <button
                  className="a-btn sm aqua"
                  onClick={() => move(n.id, 'published')}
                  disabled={busy === n.id}
                >
                  Publicar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ───────────────────────────────────────────────────────────── Iniciativas ── */

const KINDS = ['tianguis', 'chinampa', 'tiempo', 'cultura', 'ciclo', 'causas'];

type Draft = Omit<AdminIniciativa, 'id'> & { id: string | null };

const BLANK: Draft = {
  id: null,
  kind: 'tianguis',
  k: '',
  title: '',
  description: '',
  slot: 1,
  published: true,
};

function IniciativasTab() {
  const [rows, setRows] = useState<AdminIniciativa[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listIniciativas());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No pudimos leer las iniciativas.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!editing) return;
    if (!editing.title.trim() || !editing.k.trim() || !editing.description.trim()) {
      return setMsg('Etiqueta, título y descripción son obligatorios.');
    }
    setBusy(true);
    setMsg('');
    try {
      await saveIniciativa(editing);
      await pushLive();
      setEditing(null);
      await load();
      setMsg('Iniciativa guardada y publicada.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm('¿Borrar esta iniciativa del sitio?')) return;
    setBusy(true);
    try {
      await deleteIniciativa(id);
      await pushLive();
      await load();
      setMsg('Iniciativa borrada.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo borrar.');
    }
    setBusy(false);
  }

  /** Copy the six designed cards into the database so they become editable. */
  async function seed() {
    setBusy(true);
    setMsg('');
    try {
      for (const d of INICIATIVAS_DEFAULT) {
        await saveIniciativa({
          id: null,
          kind: d.kind,
          k: d.k,
          title: d.title,
          description: d.description,
          slot: d.slot,
          published: true,
        });
      }
      await pushLive();
      await load();
      setMsg('Listo: las seis tarjetas actuales ya son editables.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo copiar.');
    }
    setBusy(false);
  }

  if (loading) return <p className="a-empty">Cargando iniciativas…</p>;

  return (
    <>
      <div className="a-intro">
        <h1>Iniciativas</h1>
        <p>
          Las seis tarjetas de la sección &ldquo;Chinampas vivas&rdquo;. El <b>lugar</b> (1 a 6)
          define su posición y su color en la cuadrícula.
        </p>
        {msg && <p className={`a-msg ${msg.startsWith('No') ? 'err' : 'ok'}`}>{msg}</p>}
      </div>

      {rows.length === 0 && (
        <div className="a-card" style={{ marginTop: 18 }}>
          <h3>Todavía se muestran las tarjetas de diseño</h3>
          <p className="a-hint">
            El sitio está mostrando las seis tarjetas originales. Cópialas a la base para poder
            editarlas, o crea las tuyas desde cero.
          </p>
          <div className="a-actions">
            <button className="a-btn aqua" onClick={seed} disabled={busy}>
              Copiar las seis actuales
            </button>
            <button className="a-btn" onClick={() => setEditing({ ...BLANK })} disabled={busy}>
              Crear una nueva
            </button>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="a-actions" style={{ marginTop: 18 }}>
          <button className="a-btn aqua" onClick={() => setEditing({ ...BLANK })} disabled={busy}>
            + Nueva iniciativa
          </button>
        </div>
      )}

      {editing && (
        <div className="a-card" style={{ marginTop: 18 }}>
          <h3>{editing.id ? 'Editar iniciativa' : 'Nueva iniciativa'}</h3>
          <div className="a-field">
            <span className="a-label">Etiqueta corta</span>
            <input
              type="text"
              value={editing.k}
              placeholder="Tianguis"
              onChange={(e) => setEditing({ ...editing, k: e.target.value })}
            />
          </div>
          <div className="a-field">
            <span className="a-label">Título</span>
            <input
              type="text"
              value={editing.title}
              placeholder="Mercadito de barrio"
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
          </div>
          <div className="a-field">
            <span className="a-label">Descripción</span>
            <textarea
              value={editing.description}
              rows={2}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
          </div>
          <div className="a-field">
            <span className="a-label">Tipo</span>
            <select
              value={editing.kind}
              onChange={(e) => setEditing({ ...editing, kind: e.target.value })}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="a-field">
            <span className="a-label">Lugar en la cuadrícula (1–6)</span>
            <select
              value={editing.slot}
              onChange={(e) => setEditing({ ...editing, slot: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="a-actions">
            <button className="a-btn gold" onClick={save} disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar y publicar'}
            </button>
            <button className="a-btn" onClick={() => setEditing(null)} disabled={busy}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="a-cards">
        {rows.map((r) => (
          <div className="a-card" key={r.id}>
            <span className="a-meta">
              Lugar {r.slot} · {r.kind}
            </span>
            <h3>{r.title}</h3>
            <span className="a-pill">{r.k}</span>
            <p className="a-hint">{r.description}</p>
            <span className={`a-pill ${r.published ? 'ok' : 'off'}`}>
              {r.published ? 'en el sitio' : 'oculta'}
            </span>
            <div className="a-actions">
              <button
                className="a-btn sm"
                onClick={() => setEditing({ ...r })}
                disabled={busy}
              >
                Editar
              </button>
              <button
                className="a-btn sm"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await saveIniciativa({ ...r, published: !r.published });
                    await pushLive();
                    await load();
                  } catch (e) {
                    setMsg(e instanceof Error ? e.message : 'No se pudo cambiar.');
                  }
                  setBusy(false);
                }}
                disabled={busy}
              >
                {r.published ? 'Ocultar' : 'Publicar'}
              </button>
              <button className="a-btn sm danger" onClick={() => remove(r.id)} disabled={busy}>
                Borrar
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ───────────────────────────────────────────────────────────── Historial ── */

function HistoryTab() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await history(undefined, 120));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No pudimos leer el historial.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function revert(row: HistoryRow) {
    setBusy(true);
    setMsg('');
    try {
      if (row.old_value == null) await resetCopy(row.key);
      else await setCopy(row.key, row.old_value);
      await pushLive();
      await load();
      setMsg('Listo, volvimos al texto anterior.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo revertir.');
    }
    setBusy(false);
  }

  if (loading) return <p className="a-empty">Cargando el historial…</p>;

  return (
    <>
      <div className="a-intro">
        <h1>Historial</h1>
        <p>Todo lo que ha cambiado en el sitio, con quién lo cambió y cuándo. Nada se borra.</p>
        {msg && <p className={`a-msg ${msg.startsWith('No') ? 'err' : 'ok'}`}>{msg}</p>}
      </div>

      {rows.length === 0 && <p className="a-empty">Todavía no hay cambios.</p>}

      <div className="a-hist">
        {rows.map((r) => {
          const isCopy = !r.key.startsWith('media:') && !r.key.startsWith('nodo:');
          return (
            <div className="a-hist-row" key={r.id}>
              <div className="a-hist-meta">
                <span>{new Date(r.at).toLocaleString('es-MX')}</span>
                <span>·</span>
                <span>{r.actor_email ?? 'alguien'}</span>
                <span>·</span>
                <span>{r.key}</span>
                {isCopy && (
                  <button className="a-btn sm" onClick={() => revert(r)} disabled={busy}>
                    Volver a este
                  </button>
                )}
              </div>
              <div className="a-diff">
                {r.old_value != null && <span className="was">{r.old_value}</span>}
                {r.old_value != null && r.new_value != null && ' → '}
                {r.new_value != null ? (
                  <span className="now">{r.new_value}</span>
                ) : (
                  <span className="now">(restaurado al texto original)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────── Equipo ── */

function TeamTab({ meFbid }: { meFbid: string }) {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<'editor' | 'super_admin'>('editor');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listAdmins());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No pudimos leer el equipo.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!EMAIL_RE.test(email.trim())) return setMsg('Escribe un correo válido.');
    setBusy(true);
    setMsg('');
    try {
      await grantAdmin(email.trim(), rol, nombre.trim() || undefined);
      setEmail('');
      setNombre('');
      await load();
      setMsg('Listo, ya puede editar el sitio.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo dar acceso.');
    }
    setBusy(false);
  }

  async function toggle(u: AdminUser) {
    setBusy(true);
    setMsg('');
    try {
      await setAdminActive(u.fbid, !u.activo);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo cambiar.');
    }
    setBusy(false);
  }

  if (loading) return <p className="a-empty">Cargando el equipo…</p>;

  return (
    <>
      <div className="a-intro">
        <h1>Quién puede editar</h1>
        <p>
          Sólo se puede dar acceso a alguien que <b>ya entró</b> a reciprociudad.lat con su correo —
          así el permiso siempre cuelga de una identidad FBID real, nunca de un correo suelto.
        </p>
        {msg && <p className={`a-msg ${msg.startsWith('No') ? 'err' : 'ok'}`}>{msg}</p>}
      </div>

      <div className="a-card" style={{ marginTop: 18 }}>
        <h3>Dar acceso</h3>
        <div className="a-field">
          <span className="a-label">Correo</span>
          <input
            type="email"
            value={email}
            placeholder="persona@correo.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="a-field">
          <span className="a-label">Nombre (opcional)</span>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="a-field">
          <span className="a-label">Rol</span>
          <select value={rol} onChange={(e) => setRol(e.target.value as 'editor' | 'super_admin')}>
            <option value="editor">Editor — edita textos, imágenes, nodos e iniciativas</option>
            <option value="super_admin">Super admin — además gestiona quién puede editar</option>
          </select>
        </div>
        <div className="a-actions">
          <button className="a-btn gold" onClick={add} disabled={busy}>
            {busy ? 'Guardando…' : 'Dar acceso'}
          </button>
        </div>
      </div>

      <div className="a-cards">
        {rows.map((u) => (
          <div className="a-card" key={u.fbid}>
            <span className="a-meta">{u.rol === 'super_admin' ? 'Super admin' : 'Editor'}</span>
            <h3>{u.nombre || u.email}</h3>
            <span className="a-hint">{u.email}</span>
            <span className={`a-pill ${u.activo ? 'ok' : 'off'}`}>
              {u.activo ? 'activo' : 'sin acceso'}
            </span>
            {u.fbid !== meFbid && (
              <div className="a-actions">
                <button className="a-btn sm" onClick={() => toggle(u)} disabled={busy}>
                  {u.activo ? 'Quitar acceso' : 'Reactivar'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
