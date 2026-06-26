'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { saniClient, saniConfigured } from '@/lib/sani/client';

/* ── types (RPCs return jsonb) ─────────────────────────────────────────────── */
type Role = 'super_admin' | 'admin' | 'member';
type Status = 'invited' | 'active' | 'suspended';
type Feature = 'bookings' | 'audit' | 'logistics';
type NodeStatus = 'active' | 'paused' | 'retired';
type PickupStatus = 'requested' | 'scheduled' | 'picked_up' | 'dropped_off' | 'done' | 'canceled';
type BookingStatus = 'lead' | 'quoted' | 'confirmed' | 'deployed' | 'closed' | 'lost';

interface Me {
  member: { id: string; email: string; name: string | null; role: Role; status: Status; activated_at: string | null } | null;
  features: Feature[];
  can_manage_team: boolean;
  is_super: boolean;
}
interface TeamProfile {
  name?: string; phone?: string; city?: string; areas?: string[]; availability?: string;
  vehicle?: string; license?: string; experience?: string; motivation?: string;
}
interface Member {
  id: string; email: string; name: string | null; role: Role; status: Status;
  features: Feature[]; created_at: string; activated_at: string | null; invited_by_email: string | null;
  profile?: TeamProfile; suggested_role?: string | null; suggested_features?: Feature[]; applied_at?: string | null; is_applicant?: boolean;
}
const AREA_LABELS: Record<string, string> = {
  operacion: 'Operación', recoleccion: 'Recolección', ventas: 'Ventas/eventos',
  mantenimiento: 'Mantenimiento', comunidad: 'Comunidad', coordinacion: 'Coordinación',
};
const AVAIL_LABELS: Record<string, string> = {
  por_evento: 'Por evento', fines_de_semana: 'Fines de semana',
  entre_semana: 'Entre semana', tiempo_completo: 'Tiempo completo',
};
interface Booking {
  id: string; event_name: string; contact_name: string | null; contact_email: string | null;
  contact_phone: string | null; event_date: string | null; location: string | null;
  attendees: number | null; units: number; status: BookingStatus; amount_mxn: number | null;
  notes: string | null; source: string; assigned_to: string | null; assigned_name: string | null;
  created_at: string; updated_at: string;
}
interface AuditRow { id: string; actor_email: string | null; action: string; target: string | null; detail: Record<string, unknown>; created_at: string }
interface Node {
  id: string; name: string; address: string | null; lat: number | null; lng: number | null;
  units: number; buckets_capacity: number; status: NodeStatus; notes: string | null;
  created_at: string; open_pickups: number;
}
interface Pickup {
  id: string; node_id: string; node_name: string; node_address: string | null;
  buckets: number; status: PickupStatus; dropoff_label: string | null; dropoff_address: string | null;
  refirides_job_id: string | null; assigned_name: string | null; created_at: string; updated_at: string;
}

const FEATURES: { key: Feature; label: string }[] = [
  { key: 'bookings', label: 'Reservas' },
  { key: 'logistics', label: 'Logística' },
  { key: 'audit', label: 'Bitácora' },
];
const NODE_STATUSES: { key: NodeStatus; label: string }[] = [
  { key: 'active', label: 'Activo' },
  { key: 'paused', label: 'Pausado' },
  { key: 'retired', label: 'Retirado' },
];
const PICKUP_STATUSES: { key: PickupStatus; label: string }[] = [
  { key: 'requested', label: 'Solicitada' },
  { key: 'scheduled', label: 'Agendada' },
  { key: 'picked_up', label: 'Recogida' },
  { key: 'dropped_off', label: 'Entregada' },
  { key: 'done', label: 'Completada' },
  { key: 'canceled', label: 'Cancelada' },
];
const BOOKING_STATUSES: { key: BookingStatus; label: string }[] = [
  { key: 'lead', label: 'Lead' },
  { key: 'quoted', label: 'Cotizado' },
  { key: 'confirmed', label: 'Confirmado' },
  { key: 'deployed', label: 'Montado' },
  { key: 'closed', label: 'Cerrado' },
  { key: 'lost', label: 'Perdido' },
];
const ROLE_LABEL: Record<Role, string> = { super_admin: 'Super admin', admin: 'Admin', member: 'Miembro' };

type Phase = 'loading' | 'login' | 'noaccess' | 'suspended' | 'ready';

export default function TeamConsole() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [tab, setTab] = useState<'inicio' | 'bookings' | 'logistics' | 'team' | 'audit'>('inicio');
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const flash = useCallback((kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 4200);
  }, []);

  const sb = saniClient;

  const loadData = useCallback(async (m: Me) => {
    const c = sb();
    if (m.member && (m.features.includes('bookings') || m.can_manage_team)) {
      const { data } = await c.rpc('list_bookings');
      if (data) setBookings(data as Booking[]);
    }
    if (m.can_manage_team) {
      const { data } = await c.rpc('list_members');
      if (data) setMembers(data as Member[]);
    }
    if (m.features.includes('logistics') || m.can_manage_team) {
      const [n, p] = await Promise.all([c.rpc('list_nodes'), c.rpc('list_pickups')]);
      if (n.data) setNodes(n.data as Node[]);
      if (p.data) setPickups(p.data as Pickup[]);
    }
    if (m.features.includes('audit')) {
      const { data } = await c.rpc('list_audit', { p_limit: 200 });
      if (data) setAudit(data as AuditRow[]);
    }
  }, [sb]);

  const bootstrap = useCallback(async () => {
    const { data, error } = await sb().rpc('claim');
    if (error) { flash('err', 'No se pudo cargar tu sesión.'); setPhase('login'); return; }
    const m = data as Me;
    setMe(m);
    if (!m.member) { setPhase('noaccess'); return; }
    if (m.member.status === 'suspended') { setPhase('suspended'); return; }
    await loadData(m);
    setTab(m.features.includes('bookings') || m.can_manage_team ? 'bookings' : 'inicio');
    setPhase('ready');
  }, [sb, flash, loadData]);

  useEffect(() => {
    if (!saniConfigured) { setPhase('login'); return; }
    const c = sb();
    let done = false;
    c.auth.getSession().then(({ data }) => {
      if (done) return;
      if (data.session) bootstrap(); else setPhase('login');
    });
    const { data: sub } = c.auth.onAuthStateChange((_e, session) => {
      if (session && (phase === 'login' || phase === 'loading')) bootstrap();
    });
    return () => { done = true; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    await sb().auth.signOut();
    setMe(null); setMembers([]); setBookings([]); setAudit([]); setPhase('login');
  }, [sb]);

  return (
    <div className="st-root">
      <style>{CSS}</style>
      {toast && <div className={`st-toast ${toast.kind}`}>{toast.msg}</div>}
      {phase === 'loading' && <Splash text="Abriendo el templo…" />}
      {phase === 'login' && <Login />}
      {phase === 'noaccess' && <Gate
        title="Sin acceso todavía"
        body="Tu correo aún no está en el equipo de Sani Templo. Pide a un administrador que te invite y vuelve a entrar."
        onSignOut={signOut} />}
      {phase === 'suspended' && <Gate
        title="Cuenta suspendida"
        body="Tu acceso fue pausado por un administrador. Contáctalo para reactivarlo."
        onSignOut={signOut} />}
      {phase === 'ready' && me?.member && (
        <Console
          me={me} members={members} bookings={bookings} audit={audit} nodes={nodes} pickups={pickups}
          tab={tab} setTab={setTab}
          setMembers={setMembers} setBookings={setBookings} setAudit={setAudit}
          setNodes={setNodes} setPickups={setPickups}
          flash={flash} signOut={signOut}
        />
      )}
    </div>
  );
}

/* ── splash / gates ────────────────────────────────────────────────────────── */
function Splash({ text }: { text: string }) {
  return <div className="st-center"><div className="st-mark">⚱</div><p className="st-muted">{text}</p></div>;
}
function Gate({ title, body, onSignOut }: { title: string; body: string; onSignOut: () => void }) {
  return (
    <div className="st-center">
      <div className="st-card st-narrow">
        <div className="st-wordmark">SANI TEMPLO</div>
        <h2 className="st-h2">{title}</h2>
        <p className="st-muted" style={{ marginTop: 10 }}>{body}</p>
        <button className="st-btn ghost" style={{ marginTop: 22 }} onClick={onSignOut}>Cerrar sesión</button>
      </div>
    </div>
  );
}

/* ── login — bounce to the FBID hub (one identity for every app) ────────────── */
function Login() {
  const FBID_HUB = process.env.NEXT_PUBLIC_FBID_URL || 'https://fbid.flowbond.life';
  const [busy, setBusy] = useState(false);

  if (!saniConfigured) {
    return <div className="st-center"><div className="st-card st-narrow">
      <div className="st-wordmark">SANI TEMPLO</div>
      <h2 className="st-h2">Consola no configurada</h2>
      <p className="st-muted" style={{ marginTop: 10 }}>Falta <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en el entorno.</p>
    </div></div>;
  }

  function go() {
    setBusy(true);
    // Bounce to the FBID hub; it authenticates (magic link / password / wallet)
    // and hands the session back to /auth/callback, which lands on /team.
    const cb = `${window.location.origin}/auth/callback?next=/team`;
    window.location.assign(`${FBID_HUB}/?app=reciprociudad&redirect=${encodeURIComponent(cb)}`);
  }

  return (
    <div className="st-center">
      <div className="st-card st-narrow">
        <div className="st-wordmark">SANI TEMPLO</div>
        <div className="st-eyebrow">Consola de operación</div>
        <h2 className="st-h2" style={{ marginTop: 8 }}>Entra al templo</h2>
        <p className="st-muted" style={{ marginTop: 8 }}>
          Acceso del equipo con tu <strong style={{ color: 'var(--cream)' }}>FlowBond ID</strong> — una sola
          identidad, segura, para todas las apps.
        </p>
        <button className="st-btn gold" disabled={busy} onClick={go} style={{ marginTop: 20, width: '100%' }}>
          {busy ? 'Abriendo…' : 'Entrar con FlowBond ID'}
        </button>
        <p className="st-muted" style={{ marginTop: 12, fontSize: 12.5 }}>
          Te llevamos a FlowBond ID para verificar tu identidad y regresar aquí automáticamente.
        </p>
      </div>
    </div>
  );
}

/* ── console shell ─────────────────────────────────────────────────────────── */
function Console(props: {
  me: Me; members: Member[]; bookings: Booking[]; audit: AuditRow[]; nodes: Node[]; pickups: Pickup[];
  tab: 'inicio' | 'bookings' | 'logistics' | 'team' | 'audit';
  setTab: (t: 'inicio' | 'bookings' | 'logistics' | 'team' | 'audit') => void;
  setMembers: (m: Member[]) => void; setBookings: (b: Booking[]) => void; setAudit: (a: AuditRow[]) => void;
  setNodes: (n: Node[]) => void; setPickups: (p: Pickup[]) => void;
  flash: (k: 'ok' | 'err', m: string) => void; signOut: () => void;
}) {
  const { me, members, bookings, audit, nodes, pickups, tab, setTab, setMembers, setBookings, setAudit, setNodes, setPickups, flash, signOut } = props;
  const canBookings = me.features.includes('bookings') || me.can_manage_team;
  const canLogistics = me.features.includes('logistics') || me.can_manage_team;
  const canAudit = me.features.includes('audit');
  const nav: { key: typeof tab; label: string; show: boolean }[] = [
    { key: 'inicio', label: 'Inicio', show: true },
    { key: 'bookings', label: 'Reservas', show: canBookings },
    { key: 'logistics', label: 'Nodos & cubetas', show: canLogistics },
    { key: 'team', label: 'Equipo', show: me.can_manage_team },
    { key: 'audit', label: 'Bitácora', show: canAudit },
  ];

  return (
    <div className="st-shell">
      <header className="st-top">
        <div className="st-brand"><span className="st-mark sm">⚱</span><span className="st-wordmark sm">SANI TEMPLO</span><span className="st-tag">Operación</span></div>
        <div className="st-user">
          <span className={`st-rolechip ${me.member!.role}`}>{ROLE_LABEL[me.member!.role]}</span>
          <span className="st-username">{me.member!.name || me.member!.email}</span>
          <button className="st-btn ghost xs" onClick={signOut}>Salir</button>
        </div>
      </header>

      <nav className="st-nav">
        {nav.filter((n) => n.show).map((n) => (
          <button key={n.key} className={`st-navbtn ${tab === n.key ? 'on' : ''}`} onClick={() => setTab(n.key)}>{n.label}</button>
        ))}
      </nav>

      <main className="st-main">
        {tab === 'inicio' && <Overview me={me} members={members} bookings={bookings} />}
        {tab === 'bookings' && canBookings && <Bookings me={me} bookings={bookings} members={members} setBookings={setBookings} flash={flash} />}
        {tab === 'logistics' && canLogistics && <Logistics nodes={nodes} pickups={pickups} setNodes={setNodes} setPickups={setPickups} flash={flash} />}
        {tab === 'team' && me.can_manage_team && <Team me={me} members={members} setMembers={setMembers} flash={flash} />}
        {tab === 'audit' && canAudit && <Audit audit={audit} setAudit={setAudit} flash={flash} />}
      </main>
    </div>
  );
}

/* ── overview ──────────────────────────────────────────────────────────────── */
function Overview({ me, members, bookings }: { me: Me; members: Member[]; bookings: Booking[] }) {
  const open = bookings.filter((b) => !['closed', 'lost'].includes(b.status));
  const leads = bookings.filter((b) => b.status === 'lead');
  const confirmed = bookings.filter((b) => ['confirmed', 'deployed'].includes(b.status));
  return (
    <section>
      <h1 className="st-h1">Hola, {me.member!.name?.split(' ')[0] || 'equipo'}.</h1>
      <p className="st-muted">Bienvenido a la operación de Sani Templo.</p>
      <div className="st-stats">
        <Stat n={open.length} l="Reservas abiertas" />
        <Stat n={leads.length} l="Leads por atender" />
        <Stat n={confirmed.length} l="Confirmadas / montadas" />
        {me.can_manage_team && <Stat n={members.filter((m) => m.status === 'active').length} l="Miembros activos" />}
      </div>
      <div className="st-access">
        <div className="st-eyebrow">Tus accesos</div>
        <div className="st-chips" style={{ marginTop: 10 }}>
          <span className="st-chip on">Inicio</span>
          {(me.features.includes('bookings') || me.can_manage_team) && <span className="st-chip on">Reservas</span>}
          {me.can_manage_team && <span className="st-chip on">Equipo</span>}
          {me.features.includes('audit') && <span className="st-chip on">Bitácora</span>}
        </div>
        {!me.can_manage_team && (
          <p className="st-muted" style={{ marginTop: 12, fontSize: 13 }}>
            Tus accesos los define un administrador. Si necesitas más, pídeselo.
          </p>
        )}
      </div>
    </section>
  );
}
function Stat({ n, l }: { n: number; l: string }) {
  return <div className="st-stat"><span className="st-statn">{n}</span><span className="st-statl">{l}</span></div>;
}

/* ── bookings ──────────────────────────────────────────────────────────────── */
function Bookings({ me, bookings, members, setBookings, flash }: {
  me: Me; bookings: Booking[]; members: Member[]; setBookings: (b: Booking[]) => void;
  flash: (k: 'ok' | 'err', m: string) => void;
}) {
  const [editing, setEditing] = useState<Booking | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const assignable = members.filter((m) => m.status === 'active');
  const view = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <section>
      <div className="st-rowhead">
        <h1 className="st-h1">Reservas</h1>
        <button className="st-btn gold sm" onClick={() => setCreating(true)}>+ Nueva</button>
      </div>
      <div className="st-filters">
        <button className={`st-pill ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>Todas ({bookings.length})</button>
        {BOOKING_STATUSES.map((s) => (
          <button key={s.key} className={`st-pill ${filter === s.key ? 'on' : ''}`} onClick={() => setFilter(s.key)}>
            {s.label} ({bookings.filter((b) => b.status === s.key).length})
          </button>
        ))}
      </div>
      {view.length === 0 ? <p className="st-empty">Sin reservas en esta vista.</p> : (
        <div className="st-list">
          {view.map((b) => (
            <button key={b.id} className="st-bcard" onClick={() => setEditing(b)}>
              <div className="st-bmain">
                <span className="st-bname">{b.event_name}</span>
                <span className="st-bmeta">
                  {b.contact_name || '—'}{b.event_date ? ` · ${b.event_date}` : ''}{b.location ? ` · ${b.location}` : ''}
                  {b.source === 'web' ? ' · web' : ''}
                </span>
              </div>
              <div className="st-bside">
                {b.assigned_name && <span className="st-bassign">{b.assigned_name}</span>}
                {b.amount_mxn != null && <span className="st-bamount">${Number(b.amount_mxn).toLocaleString('es-MX')}</span>}
                <span className={`st-status ${b.status}`}>{BOOKING_STATUSES.find((s) => s.key === b.status)?.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      {(editing || creating) && (
        <BookingModal
          booking={editing} creating={creating} assignable={assignable}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={(list) => { setBookings(list); setEditing(null); setCreating(false); flash('ok', 'Reserva guardada.'); }}
          flash={flash}
        />
      )}
    </section>
  );
}

function BookingModal({ booking, creating, assignable, onClose, onSaved, flash }: {
  booking: Booking | null; creating: boolean; assignable: Member[];
  onClose: () => void; onSaved: (b: Booking[]) => void; flash: (k: 'ok' | 'err', m: string) => void;
}) {
  const [f, setF] = useState({
    event_name: booking?.event_name ?? '', contact_name: booking?.contact_name ?? '',
    contact_email: booking?.contact_email ?? '', contact_phone: booking?.contact_phone ?? '',
    event_date: booking?.event_date ?? '', location: booking?.location ?? '',
    attendees: booking?.attendees?.toString() ?? '', units: booking?.units?.toString() ?? '1',
    status: booking?.status ?? 'lead', amount_mxn: booking?.amount_mxn?.toString() ?? '',
    notes: booking?.notes ?? '', assigned_to: booking?.assigned_to ?? '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.event_name.trim()) { flash('err', 'El nombre del evento es obligatorio.'); return; }
    setBusy(true);
    const c = saniClient();
    const payload = { ...f };
    const { data, error } = creating
      ? await c.rpc('create_booking', { p: payload })
      : await c.rpc('update_booking', { p_id: booking!.id, p: payload });
    setBusy(false);
    if (error) { flash('err', error.message); return; }
    onSaved(data as Booking[]);
  }

  return (
    <div className="st-modal" onClick={onClose}>
      <div className="st-modalcard" onClick={(e) => e.stopPropagation()}>
        <div className="st-rowhead">
          <h2 className="st-h2">{creating ? 'Nueva reserva' : f.event_name || 'Reserva'}</h2>
          <button className="st-link" onClick={onClose}>Cerrar</button>
        </div>
        <div className="st-grid2">
          <Fld label="Evento *"><input value={f.event_name} onChange={(e) => set('event_name', e.target.value)} /></Fld>
          <Fld label="Estado">
            <select value={f.status} onChange={(e) => set('status', e.target.value)}>
              {BOOKING_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Fld>
          <Fld label="Contacto"><input value={f.contact_name} onChange={(e) => set('contact_name', e.target.value)} /></Fld>
          <Fld label="Teléfono"><input value={f.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} /></Fld>
          <Fld label="Correo"><input value={f.contact_email} onChange={(e) => set('contact_email', e.target.value)} /></Fld>
          <Fld label="Fecha"><input type="date" value={f.event_date} onChange={(e) => set('event_date', e.target.value)} /></Fld>
          <Fld label="Lugar"><input value={f.location} onChange={(e) => set('location', e.target.value)} /></Fld>
          <Fld label="Asistentes"><input inputMode="numeric" value={f.attendees} onChange={(e) => set('attendees', e.target.value.replace(/\D/g, ''))} /></Fld>
          <Fld label="Unidades"><input inputMode="numeric" value={f.units} onChange={(e) => set('units', e.target.value.replace(/\D/g, ''))} /></Fld>
          <Fld label="Monto (MXN)"><input inputMode="numeric" value={f.amount_mxn} onChange={(e) => set('amount_mxn', e.target.value.replace(/[^\d.]/g, ''))} /></Fld>
          <Fld label="Responsable">
            <select value={f.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}>
              <option value="">— Sin asignar —</option>
              {assignable.map((m) => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
            </select>
          </Fld>
        </div>
        <Fld label="Notas"><textarea rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Fld>
        <div className="st-rowend" style={{ marginTop: 16 }}>
          <button className="st-btn ghost" onClick={onClose}>Cancelar</button>
          <button className="st-btn gold" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── team / roles / grants ─────────────────────────────────────────────────── */
function Team({ me, members, setMembers, flash }: {
  me: Me; members: Member[]; setMembers: (m: Member[]) => void; flash: (k: 'ok' | 'err', m: string) => void;
}) {
  const [inv, setInv] = useState({ email: '', name: '', role: 'member' as Role });
  const [busy, setBusy] = useState(false);

  async function call(fn: string, args: Record<string, unknown>, okMsg: string) {
    const { data, error } = await saniClient().rpc(fn, args);
    if (error) { flash('err', error.message); return false; }
    setMembers(data as Member[]); flash('ok', okMsg); return true;
  }
  async function invite() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inv.email)) { flash('err', 'Correo inválido.'); return; }
    setBusy(true);
    const ok = await call('invite_member', { p_email: inv.email.trim(), p_name: inv.name.trim() || null, p_role: inv.role }, 'Invitación creada.');
    setBusy(false);
    if (ok) setInv({ email: '', name: '', role: 'member' });
  }
  async function approve(m: Member) {
    const role = m.suggested_role === 'admin' && me.is_super ? 'admin' : 'member';
    await call('approve_applicant', { p_member_id: m.id, p_role: role, p_features: m.suggested_features ?? [] }, 'Miembro aprobado.');
  }
  const applicants = members.filter((m) => m.is_applicant);
  const roster = members.filter((m) => !m.is_applicant);

  return (
    <section>
      <h1 className="st-h1">Equipo</h1>
      <p className="st-muted">Invita personas y define exactamente a qué tiene acceso cada quien.</p>

      {applicants.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="st-eyebrow">Solicitudes por revisar ({applicants.length})</div>
          <div className="st-list" style={{ marginTop: 10 }}>
            {applicants.map((m) => {
              const role: Role = m.suggested_role === 'admin' && me.is_super ? 'admin' : 'member';
              return (
                <div key={m.id} className="st-mcard invited">
                  <div className="st-mhead">
                    <div>
                      <span className="st-mname">{m.profile?.name || m.name || m.email}</span>
                      <span className="st-memail">{m.email}{m.profile?.phone ? ` · ${m.profile.phone}` : ''}{m.profile?.city ? ` · ${m.profile.city}` : ''}</span>
                    </div>
                    <span className="st-statuschip invited">Solicitud</span>
                  </div>
                  <div className="st-applicant">
                    {m.profile?.areas?.length ? <p><b>Áreas:</b> {m.profile.areas.map((a) => AREA_LABELS[a] || a).join(', ')}</p> : null}
                    {m.profile?.availability ? <p><b>Disponibilidad:</b> {AVAIL_LABELS[m.profile.availability] || m.profile.availability}</p> : null}
                    {m.profile?.vehicle ? <p><b>Vehículo:</b> {m.profile.vehicle}{m.profile?.license ? ` · Licencia: ${m.profile.license}` : ''}</p> : null}
                    {m.profile?.experience ? <p><b>Experiencia:</b> {m.profile.experience}</p> : null}
                    {m.profile?.motivation ? <p><b>Motivación:</b> {m.profile.motivation}</p> : null}
                  </div>
                  <div className="st-mctrl">
                    <span className="st-inline"><span>Sugerido</span>
                      <span className={`st-rolechip ${role}`}>{ROLE_LABEL[role]}</span>
                      {(m.suggested_features ?? []).map((fk) => (
                        <span key={fk} className="st-chip on">{FEATURES.find((x) => x.key === fk)?.label || fk}</span>
                      ))}
                    </span>
                    <button className="st-btn gold xs" onClick={() => approve(m)}>Aprobar</button>
                    <button className="st-btn ghost xs" onClick={() => call('set_status', { p_member_id: m.id, p_status: 'suspended' }, 'Solicitud archivada.')}>Archivar</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="st-card" style={{ marginTop: 18 }}>
        <div className="st-eyebrow">Invitar al equipo</div>
        <div className="st-invrow">
          <input placeholder="correo@persona.com" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} />
          <input placeholder="Nombre (opcional)" value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} />
          <select value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value as Role })}>
            <option value="member">Miembro</option>
            {me.is_super && <option value="admin">Admin</option>}
            {me.is_super && <option value="super_admin">Super admin</option>}
          </select>
          <button className="st-btn gold" disabled={busy} onClick={invite}>{busy ? '…' : 'Invitar'}</button>
        </div>
        <p className="st-muted" style={{ fontSize: 12.5, marginTop: 8 }}>
          La persona entra con su correo. {me.is_super ? 'Como super admin puedes asignar cualquier rol.' : 'Solo un super admin puede crear admins.'}
        </p>
      </div>

      <div className="st-list" style={{ marginTop: 18 }}>
        {roster.map((m) => {
          const isSelf = m.id === me.member!.id;
          const elevated = m.role === 'admin' || m.role === 'super_admin';
          return (
            <div key={m.id} className={`st-mcard ${m.status}`}>
              <div className="st-mhead">
                <div>
                  <span className="st-mname">{m.name || m.email}</span>
                  {m.name && <span className="st-memail">{m.email}</span>}
                </div>
                <div className="st-mtags">
                  <span className={`st-rolechip ${m.role}`}>{ROLE_LABEL[m.role]}</span>
                  <span className={`st-statuschip ${m.status}`}>
                    {m.status === 'active' ? 'Activo' : m.status === 'invited' ? 'Invitado' : 'Suspendido'}
                  </span>
                </div>
              </div>

              <div className="st-mctrl">
                {/* role (super_admin only) */}
                {me.is_super && !isSelf && (
                  <label className="st-inline">
                    <span>Rol</span>
                    <select value={m.role} onChange={(e) => call('set_role', { p_member_id: m.id, p_role: e.target.value }, 'Rol actualizado.')}>
                      <option value="member">Miembro</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super admin</option>
                    </select>
                  </label>
                )}

                {/* feature grants — only meaningful for plain members */}
                {!elevated ? (
                  <div className="st-inline">
                    <span>Accesos</span>
                    <div className="st-chips">
                      {FEATURES.map((ft) => {
                        const on = m.features.includes(ft.key);
                        return (
                          <button key={ft.key} className={`st-chip ${on ? 'on' : ''}`}
                            onClick={() => call('set_grant', { p_member_id: m.id, p_feature: ft.key, p_granted: !on }, on ? 'Acceso removido.' : 'Acceso otorgado.')}>
                            {on ? '✓ ' : ''}{ft.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <span className="st-allaccess">Acceso total (por rol)</span>
                )}

                {/* suspend / reactivate */}
                {!isSelf && (me.is_super || !elevated) && m.status !== 'invited' && (
                  <button className="st-btn ghost xs"
                    onClick={() => call('set_status', { p_member_id: m.id, p_status: m.status === 'active' ? 'suspended' : 'active' }, 'Estado actualizado.')}>
                    {m.status === 'active' ? 'Suspender' : 'Reactivar'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── logistics: fixed nodes + cubeta pickups (RefiRides) ─────────────────────── */
function Logistics({ nodes, pickups, setNodes, setPickups, flash }: {
  nodes: Node[]; pickups: Pickup[]; setNodes: (n: Node[]) => void; setPickups: (p: Pickup[]) => void;
  flash: (k: 'ok' | 'err', m: string) => void;
}) {
  const [nodeModal, setNodeModal] = useState<Node | 'new' | null>(null);
  const [pickupNode, setPickupNode] = useState<Node | null>(null);

  async function setPickupStatus(id: string, status: PickupStatus) {
    const { data, error } = await saniClient().rpc('update_pickup_status', { p_id: id, p_status: status });
    if (error) { flash('err', error.message); return; }
    setPickups(data as Pickup[]); flash('ok', 'Recolección actualizada.');
  }

  return (
    <section>
      <div className="st-rowhead">
        <h1 className="st-h1">Nodos & cubetas</h1>
        <button className="st-btn gold sm" onClick={() => setNodeModal('new')}>+ Crear nodo fijo</button>
      </div>
      <p className="st-muted">Estaciones permanentes de Sani Templo y la recolección de cubetas llenas vía RefiRides.</p>

      {nodes.length === 0 ? <p className="st-empty">Aún no hay nodos fijos. Crea el primero.</p> : (
        <div className="st-list" style={{ marginTop: 16 }}>
          {nodes.map((n) => (
            <div key={n.id} className="st-mcard">
              <div className="st-mhead">
                <div>
                  <span className="st-mname">{n.name}</span>
                  <span className="st-memail">{n.address || 'sin dirección'}</span>
                </div>
                <div className="st-mtags">
                  <span className="st-status">{NODE_STATUSES.find((s) => s.key === n.status)?.label}</span>
                  {n.open_pickups > 0 && <span className="st-statuschip invited">{n.open_pickups} en curso</span>}
                </div>
              </div>
              <div className="st-mctrl">
                <span className="st-inline"><span>Unidades</span>&nbsp;{n.units}</span>
                <span className="st-inline"><span>Cubetas</span>&nbsp;{n.buckets_capacity}</span>
                <button className="st-btn gold xs" onClick={() => setPickupNode(n)}>Solicitar recolección</button>
                <button className="st-btn ghost xs" onClick={() => setNodeModal(n)}>Editar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="st-h2" style={{ marginTop: 30 }}>Recolecciones</h2>
      {pickups.length === 0 ? <p className="st-empty">Sin recolecciones todavía.</p> : (
        <div className="st-list" style={{ marginTop: 12 }}>
          {pickups.map((p) => (
            <div key={p.id} className="st-bcard" style={{ cursor: 'default' }}>
              <div className="st-bmain">
                <span className="st-bname">{p.node_name} · {p.buckets} cubeta{p.buckets > 1 ? 's' : ''}</span>
                <span className="st-bmeta">
                  → {p.dropoff_label || p.dropoff_address || 'compostaje'}
                  {p.refirides_job_id ? ` · RefiRides ${p.refirides_job_id.slice(0, 8)}` : ''}
                </span>
              </div>
              <div className="st-bside">
                <select className="st-pickstatus" value={p.status}
                  onChange={(e) => setPickupStatus(p.id, e.target.value as PickupStatus)}>
                  {PICKUP_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {nodeModal && (
        <NodeModal node={nodeModal === 'new' ? null : nodeModal}
          onClose={() => setNodeModal(null)}
          onSaved={(list) => { setNodes(list); setNodeModal(null); flash('ok', 'Nodo guardado.'); }}
          flash={flash} />
      )}
      {pickupNode && (
        <PickupModal node={pickupNode}
          onClose={() => setPickupNode(null)}
          onDone={(list, msg, kind) => { setPickups(list); setPickupNode(null); flash(kind, msg); }}
          flash={flash} />
      )}
    </section>
  );
}

function NodeModal({ node, onClose, onSaved, flash }: {
  node: Node | null; onClose: () => void; onSaved: (n: Node[]) => void; flash: (k: 'ok' | 'err', m: string) => void;
}) {
  const [f, setF] = useState({
    name: node?.name ?? '', address: node?.address ?? '',
    lat: node?.lat?.toString() ?? '', lng: node?.lng?.toString() ?? '',
    units: node?.units?.toString() ?? '1', buckets_capacity: node?.buckets_capacity?.toString() ?? '0',
    status: node?.status ?? 'active', notes: node?.notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name.trim()) { flash('err', 'El nombre del nodo es obligatorio.'); return; }
    setBusy(true);
    const c = saniClient();
    const { data, error } = node
      ? await c.rpc('update_node', { p_id: node.id, p: f })
      : await c.rpc('create_node', { p: f });
    setBusy(false);
    if (error) { flash('err', error.message); return; }
    onSaved(data as Node[]);
  }

  return (
    <div className="st-modal" onClick={onClose}>
      <div className="st-modalcard" onClick={(e) => e.stopPropagation()}>
        <div className="st-rowhead">
          <h2 className="st-h2">{node ? f.name || 'Nodo' : 'Crear nodo fijo'}</h2>
          <button className="st-link" onClick={onClose}>Cerrar</button>
        </div>
        <div className="st-grid2">
          <Fld label="Nombre *"><input value={f.name} onChange={(e) => set('name', e.target.value)} /></Fld>
          <Fld label="Estado">
            <select value={f.status} onChange={(e) => set('status', e.target.value)}>
              {NODE_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Fld>
        </div>
        <Fld label="Dirección"><input value={f.address} placeholder="Calle, colonia, ciudad" onChange={(e) => set('address', e.target.value)} /></Fld>
        <div className="st-grid2">
          <Fld label="Lat (opcional)"><input inputMode="decimal" value={f.lat} onChange={(e) => set('lat', e.target.value.replace(/[^\d.-]/g, ''))} /></Fld>
          <Fld label="Lng (opcional)"><input inputMode="decimal" value={f.lng} onChange={(e) => set('lng', e.target.value.replace(/[^\d.-]/g, ''))} /></Fld>
          <Fld label="Unidades (baños)"><input inputMode="numeric" value={f.units} onChange={(e) => set('units', e.target.value.replace(/\D/g, ''))} /></Fld>
          <Fld label="Cubetas en servicio"><input inputMode="numeric" value={f.buckets_capacity} onChange={(e) => set('buckets_capacity', e.target.value.replace(/\D/g, ''))} /></Fld>
        </div>
        <Fld label="Notas"><textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Fld>
        <div className="st-rowend" style={{ marginTop: 16 }}>
          <button className="st-btn ghost" onClick={onClose}>Cancelar</button>
          <button className="st-btn gold" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

function PickupModal({ node, onClose, onDone, flash }: {
  node: Node; onClose: () => void;
  onDone: (p: Pickup[], msg: string, kind: 'ok' | 'err') => void; flash: (k: 'ok' | 'err', m: string) => void;
}) {
  const [buckets, setBuckets] = useState('1');
  const [dropoffLabel, setDropoffLabel] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [busy, setBusy] = useState(false);

  async function dispatch() {
    setBusy(true);
    try {
      const res = await fetch('/api/sani/pickup', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          node_id: node.id, buckets: Number(buckets) || 1,
          dropoff_label: dropoffLabel.trim() || null, dropoff_address: dropoffAddress.trim() || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) { flash('err', j?.error || 'No se pudo crear la recolección.'); setBusy(false); return; }
      const msg = j.dispatched
        ? 'Recolección enviada a RefiRides.'
        : j.reason === 'dropoff_required' ? 'Recolección registrada (agrega un destino para enviarla a RefiRides).'
        : j.reason === 'node_missing_location' ? 'Recolección registrada (el nodo necesita dirección para RefiRides).'
        : 'Recolección registrada (RefiRides reintentará).';
      onDone((j.pickups as Pickup[]) ?? [], msg, 'ok');
    } catch (e) {
      flash('err', String((e as Error)?.message ?? e)); setBusy(false);
    }
  }

  return (
    <div className="st-modal" onClick={onClose}>
      <div className="st-modalcard" onClick={(e) => e.stopPropagation()}>
        <div className="st-rowhead">
          <h2 className="st-h2">Recoger cubetas · {node.name}</h2>
          <button className="st-link" onClick={onClose}>Cerrar</button>
        </div>
        <p className="st-muted" style={{ fontSize: 13 }}>
          Pickup en <strong style={{ color: 'var(--cream)' }}>{node.address || 'el nodo'}</strong> → destino de compostaje, vía RefiRides.
        </p>
        <div className="st-grid2">
          <Fld label="Cubetas llenas"><input inputMode="numeric" value={buckets} onChange={(e) => setBuckets(e.target.value.replace(/\D/g, ''))} /></Fld>
          <Fld label="Sitio de compostaje"><input value={dropoffLabel} placeholder="p.ej. Composta CDMX" onChange={(e) => setDropoffLabel(e.target.value)} /></Fld>
        </div>
        <Fld label="Dirección de entrega"><input value={dropoffAddress} placeholder="Dirección del sitio de compostaje" onChange={(e) => setDropoffAddress(e.target.value)} /></Fld>
        <div className="st-rowend" style={{ marginTop: 16 }}>
          <button className="st-btn ghost" onClick={onClose}>Cancelar</button>
          <button className="st-btn gold" disabled={busy} onClick={dispatch}>{busy ? 'Enviando…' : 'Solicitar recolección'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── audit ─────────────────────────────────────────────────────────────────── */
function Audit({ audit, setAudit, flash }: {
  audit: AuditRow[]; setAudit: (a: AuditRow[]) => void; flash: (k: 'ok' | 'err', m: string) => void;
}) {
  const refresh = async () => {
    const { data, error } = await saniClient().rpc('list_audit', { p_limit: 200 });
    if (error) { flash('err', error.message); return; }
    setAudit(data as AuditRow[]); flash('ok', 'Bitácora actualizada.');
  };
  const label = (a: string) => ({
    login: 'Inició sesión', invite_member: 'Invitó a un miembro', set_role: 'Cambió un rol',
    grant: 'Otorgó acceso', revoke: 'Removió acceso', set_status: 'Cambió un estado',
    create_booking: 'Creó una reserva', update_booking: 'Actualizó una reserva', request_quote: 'Solicitud web',
  } as Record<string, string>)[a] || a;

  return (
    <section>
      <div className="st-rowhead"><h1 className="st-h1">Bitácora</h1><button className="st-btn ghost sm" onClick={refresh}>Actualizar</button></div>
      <p className="st-muted">Quién hizo qué, y cuándo.</p>
      {audit.length === 0 ? <p className="st-empty">Sin actividad registrada.</p> : (
        <div className="st-audit">
          {audit.map((a) => (
            <div key={a.id} className="st-arow">
              <span className="st-adot" />
              <div className="st-amain">
                <span className="st-aact">{label(a.action)}</span>
                <span className="st-ameta">{a.actor_email || 'sistema'}{a.detail && Object.keys(a.detail).length ? ` · ${JSON.stringify(a.detail)}` : ''}</span>
              </div>
              <time className="st-atime">{new Date(a.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</time>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── small field helpers ───────────────────────────────────────────────────── */
function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="st-field"><label>{label}</label>{children}</div>;
}

/* ── scoped styles (Sani Templo palette) ───────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Jost:wght@300;400;500&display=swap');
.st-root{--gold:#cfa85a;--gold-dp:#b2893a;--gold-line:rgba(207,168,90,.28);--cream:#f4ecdb;--mut:#b6a888;--ink:#0c0906;--card:#15110b;--card2:#1c1710;
  position:fixed;inset:0;overflow:auto;background:
  radial-gradient(120% 90% at 50% -10%,#2a2016,#120d08 55%,#0c0906);
  color:var(--cream);font-family:'Jost',system-ui,sans-serif;font-weight:300;z-index:0}
.st-root *{box-sizing:border-box}
.st-center{min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px}
.st-mark{font-size:46px;color:var(--gold);text-align:center}.st-mark.sm{font-size:22px}
.st-wordmark{font-family:'Cinzel',serif;letter-spacing:.34em;color:#f6eeda;font-weight:600;font-size:18px;text-align:center}
.st-wordmark.sm{font-size:14px;letter-spacing:.28em}
.st-eyebrow{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold)}
.st-h1{font-family:'Cinzel',serif;font-size:clamp(24px,4vw,34px);color:#f6eeda;font-weight:500}
.st-h2{font-family:'Cinzel',serif;font-size:22px;color:#f6eeda;font-weight:500}
.st-muted{color:var(--mut)}
.st-card{background:linear-gradient(180deg,var(--card2),var(--card));border:1px solid var(--gold-line);border-radius:12px;padding:22px}
.st-narrow{max-width:400px;width:100%;text-align:center}
.st-field{display:flex;flex-direction:column;gap:6px;text-align:left;margin-top:8px}
.st-field label{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut)}
.st-field input,.st-field select,.st-field textarea,.st-invrow input,.st-invrow select,.st-inline select{
  background:rgba(8,6,4,.6);border:1px solid var(--gold-line);border-radius:7px;color:var(--cream);
  padding:11px 12px;font-family:inherit;font-size:14px;outline:none}
.st-field input:focus,.st-field select:focus,.st-field textarea:focus{border-color:var(--gold)}
.st-btn{font-family:inherit;font-size:13px;letter-spacing:.06em;padding:11px 20px;border-radius:6px;cursor:pointer;border:1px solid transparent;transition:.18s;color:inherit}
.st-btn.gold{background:linear-gradient(180deg,var(--gold),var(--gold-dp));color:#1a140a;font-weight:500}
.st-btn.gold:hover{transform:translateY(-1px)}.st-btn:disabled{opacity:.55;cursor:default;transform:none}
.st-btn.ghost{background:transparent;border-color:var(--gold-line);color:var(--cream)}
.st-btn.ghost:hover{border-color:var(--gold)}.st-btn.sm{padding:8px 14px;font-size:12.5px}.st-btn.xs{padding:6px 11px;font-size:12px}
.st-link{background:none;border:none;color:var(--gold);cursor:pointer;font-family:inherit;font-size:13px}
.st-link:hover{color:var(--cream)}
.st-toast{position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:50;padding:11px 20px;border-radius:8px;font-size:13.5px;
  border:1px solid var(--gold-line);background:#15110b;box-shadow:0 12px 40px rgba(0,0,0,.5)}
.st-toast.ok{border-color:rgba(127,174,94,.5);color:#cfe6b8}.st-toast.err{border-color:rgba(255,111,94,.5);color:#ffc7bf}
/* shell */
.st-shell{max-width:1080px;margin:0 auto;padding:0 20px 80px;min-height:100%}
.st-top{display:flex;justify-content:space-between;align-items:center;padding:18px 0;border-bottom:1px solid var(--gold-line);position:sticky;top:0;
  background:linear-gradient(180deg,#120d08,rgba(18,13,8,.86));backdrop-filter:blur(6px);z-index:20}
.st-brand{display:flex;align-items:center;gap:10px}.st-tag{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--mut);border:1px solid var(--gold-line);border-radius:20px;padding:3px 9px}
.st-user{display:flex;align-items:center;gap:12px}.st-username{font-size:13px;color:var(--cream)}
.st-rolechip{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;padding:3px 9px;border-radius:20px;border:1px solid var(--gold-line)}
.st-rolechip.super_admin{background:rgba(207,168,90,.16);color:var(--gold);border-color:var(--gold)}
.st-rolechip.admin{color:var(--gold)}.st-rolechip.member{color:var(--mut)}
.st-nav{display:flex;gap:6px;padding:14px 0;flex-wrap:wrap}
.st-navbtn{background:none;border:1px solid transparent;color:var(--mut);padding:8px 16px;border-radius:7px;cursor:pointer;font-family:inherit;font-size:14px}
.st-navbtn:hover{color:var(--cream)}.st-navbtn.on{color:#1a140a;background:linear-gradient(180deg,var(--gold),var(--gold-dp));font-weight:500}
.st-main{padding-top:8px}
.st-rowhead{display:flex;justify-content:space-between;align-items:center;gap:12px}
.st-rowend{display:flex;justify-content:flex-end;gap:10px}
/* stats */
.st-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin:22px 0}
.st-stat{background:linear-gradient(180deg,var(--card2),var(--card));border:1px solid var(--gold-line);border-radius:10px;padding:18px}
.st-statn{font-family:'Cinzel',serif;font-size:34px;color:var(--gold);display:block}.st-statl{font-size:12px;color:var(--mut);letter-spacing:.06em}
.st-access{margin-top:14px}.st-chips{display:flex;gap:8px;flex-wrap:wrap}
.st-chip{font-size:12.5px;padding:6px 13px;border-radius:20px;border:1px solid var(--gold-line);background:transparent;color:var(--mut);cursor:pointer;font-family:inherit}
.st-chip.on{background:rgba(207,168,90,.16);color:var(--gold);border-color:var(--gold)}
/* filters / pills */
.st-filters{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0}
.st-pill{font-size:12.5px;padding:6px 13px;border-radius:20px;border:1px solid var(--gold-line);background:transparent;color:var(--mut);cursor:pointer;font-family:inherit}
.st-pill.on{color:#1a140a;background:var(--gold);border-color:var(--gold);font-weight:500}
/* lists */
.st-list{display:flex;flex-direction:column;gap:10px}
.st-empty{color:var(--mut);padding:30px 0;text-align:center}
.st-bcard{display:flex;justify-content:space-between;align-items:center;gap:14px;text-align:left;width:100%;cursor:pointer;
  background:linear-gradient(180deg,var(--card2),var(--card));border:1px solid var(--gold-line);border-radius:10px;padding:15px 16px;color:inherit;font-family:inherit}
.st-bcard:hover{border-color:var(--gold)}
.st-bname{font-size:15px;color:#f6eeda;display:block}.st-bmeta{font-size:12.5px;color:var(--mut)}
.st-bside{display:flex;align-items:center;gap:10px;flex-shrink:0}.st-bassign{font-size:12px;color:var(--mut)}.st-bamount{font-size:13px;color:var(--gold)}
.st-status{font-size:11px;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:20px;border:1px solid var(--gold-line);color:var(--mut)}
.st-status.lead{color:#cfe6b8;border-color:rgba(127,174,94,.4)}.st-status.quoted{color:var(--gold);border-color:var(--gold-line)}
.st-status.confirmed,.st-status.deployed{color:#1a140a;background:var(--gold);border-color:var(--gold)}
.st-status.closed{color:var(--mut)}.st-status.lost{color:#ffc7bf;border-color:rgba(255,111,94,.4)}
.st-pickstatus{background:rgba(8,6,4,.6);border:1px solid var(--gold-line);border-radius:6px;color:var(--cream);padding:6px 9px;font-family:inherit;font-size:12.5px}
/* member cards */
.st-mcard{background:linear-gradient(180deg,var(--card2),var(--card));border:1px solid var(--gold-line);border-radius:10px;padding:16px}
.st-mcard.suspended{opacity:.6}
.st-mhead{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.st-mname{font-size:15px;color:#f6eeda;display:block}.st-memail{font-size:12px;color:var(--mut)}
.st-mtags{display:flex;gap:7px;align-items:center}
.st-statuschip{font-size:10.5px;padding:3px 9px;border-radius:20px;border:1px solid var(--gold-line);color:var(--mut)}
.st-statuschip.active{color:#cfe6b8;border-color:rgba(127,174,94,.4)}.st-statuschip.invited{color:var(--gold)}.st-statuschip.suspended{color:#ffc7bf}
.st-mctrl{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid rgba(207,168,90,.12)}
.st-inline{display:flex;align-items:center;gap:9px}.st-inline>span{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}
.st-allaccess{font-size:12.5px;color:var(--gold)}
.st-applicant{margin-top:12px;font-size:13px;color:var(--mut);display:flex;flex-direction:column;gap:4px}
.st-applicant b{color:var(--cream);font-weight:500}.st-applicant p{margin:0}
.st-invrow{display:grid;grid-template-columns:1.4fr 1fr .8fr auto;gap:10px;margin-top:12px}
.st-invrow input,.st-invrow select{background:rgba(8,6,4,.6);border:1px solid var(--gold-line);border-radius:7px;color:var(--cream);padding:10px 12px;font-family:inherit;font-size:14px}
/* audit */
.st-audit{display:flex;flex-direction:column;margin-top:12px}
.st-arow{display:flex;align-items:center;gap:13px;padding:12px 0;border-bottom:1px solid rgba(207,168,90,.1)}
.st-adot{width:7px;height:7px;border-radius:50%;background:var(--gold);flex-shrink:0}
.st-amain{flex:1;min-width:0}.st-aact{font-size:14px;color:var(--cream);display:block}.st-ameta{font-size:12px;color:var(--mut);word-break:break-word}
.st-atime{font-size:11.5px;color:var(--mut);flex-shrink:0}
/* modal */
.st-modal{position:fixed;inset:0;background:rgba(8,6,4,.7);backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;z-index:40;overflow:auto}
.st-modalcard{background:linear-gradient(180deg,var(--card2),var(--card));border:1px solid var(--gold-line);border-radius:14px;padding:24px;max-width:620px;width:100%}
.st-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.st-modalcard textarea{width:100%}
@media(max-width:620px){.st-grid2{grid-template-columns:1fr}.st-invrow{grid-template-columns:1fr}}
`;
