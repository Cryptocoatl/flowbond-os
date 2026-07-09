'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useGame } from '@/components/providers/GameProvider';
import { NodePicker } from '@/components/org/NodePicker';
import {
  addOrgMember,
  createNode,
  createOrg,
  myOrgs,
  orgMembers,
  orgMissions,
  orgNodes,
  setNodeStatus,
  slugify,
  verifyMission,
} from '@/lib/org';
import {
  CDMX_CENTER,
  NODE_KINDS,
  NODE_KIND_ICON,
  NODE_KIND_LABEL,
  ORG_KINDS,
  ORG_KIND_LABEL,
  KIND_LABEL,
} from '@/lib/game';
import type { MyOrg, NodeKind, OrgKind, OrgMember, OrgNode } from '@/lib/types';

type Mission = Awaited<ReturnType<typeof orgMissions>>[number];

export default function OrgPage() {
  const { user, toast } = useGame();
  const [orgs, setOrgs] = useState<MyOrg[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshOrgs = useCallback(async () => {
    try {
      const list = await myOrgs();
      setOrgs(list);
      setActiveId((prev) => prev ?? list[0]?.org_id ?? null);
    } catch {
      /* not signed in or no orgs */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void refreshOrgs();
    else setLoading(false);
  }, [user, refreshOrgs]);

  if (!user) {
    return (
      <section className="panel">
        <span className="eyebrow">Panel de organización</span>
        <h1 className="bs-h1">Administra tu <span className="jade">red de nodos</span></h1>
        <p className="lede">
          Las organizaciones —baños secos, centros de reciclaje, composta, huertos— crean y
          administran sus nodos aquí. Inicia sesión con tu FlowBond ID para continuar.
        </p>
        <Link className="primarybtn" href="/login?next=/org">
          Entrar con FlowBond ID
        </Link>
      </section>
    );
  }

  const active = orgs.find((o) => o.org_id === activeId) ?? null;

  return (
    <section className="panel">
      <span className="eyebrow">Panel de organización</span>
      <h1 className="bs-h1">
        Tu <span className="jade">red</span> de nodos
      </h1>

      {orgs.length > 0 && (
        <div className="orgtabs" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
          {orgs.map((o) => (
            <button
              key={o.org_id}
              className="ghostbtn"
              aria-pressed={o.org_id === activeId}
              onClick={() => setActiveId(o.org_id)}
              style={
                o.org_id === activeId
                  ? { borderColor: 'var(--bs-gold)', color: 'var(--bs-gold-hi)' }
                  : undefined
              }
            >
              {ORG_KIND_LABEL[o.kind]} · {o.name} {o.role === 'admin' ? '★' : ''}
              {!o.verified ? ' ·  sin verificar' : ''}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="empty">Cargando…</div>
      ) : active ? (
        <OrgDashboard org={active} onChanged={refreshOrgs} toast={toast} />
      ) : (
        <p className="lede">Aún no perteneces a ninguna organización. Crea una para empezar.</p>
      )}

      <CreateOrg
        onCreated={async () => {
          await refreshOrgs();
          toast('Organización creada · eres admin 🌱', 'jade');
        }}
        toast={toast}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
function OrgDashboard({
  org,
  onChanged,
  toast,
}: {
  org: MyOrg;
  onChanged: () => Promise<void>;
  toast: (t: string, k?: 'gold' | 'xp' | 'jade') => void;
}) {
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const isAdmin = org.role === 'admin';

  const load = useCallback(async () => {
    const [n, mi] = await Promise.allSettled([orgNodes(org.org_id), orgMissions(org.org_id)]);
    if (n.status === 'fulfilled') setNodes(n.value);
    if (mi.status === 'fulfilled') setMissions(mi.value);
    if (isAdmin) {
      try {
        setMembers(await orgMembers(org.org_id));
      } catch {
        /* ignore */
      }
    }
  }, [org.org_id, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const aiOpenMission = async (nodeId: string) => {
    try {
      const res = await fetch('/api/nodes/open-mission', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nodeId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'error');
      toast(`Misión IA: ${KIND_LABEL[j.kind as keyof typeof KIND_LABEL] ?? j.kind} · +${j.reward_xp} XP`, 'xp');
      await load();
    } catch {
      toast('No se pudo abrir la misión', 'jade');
    }
  };

  const markFull = async (nodeId: string) => {
    try {
      await setNodeStatus(nodeId, 'full');
      await load();
    } catch {
      toast('No se pudo actualizar el nodo', 'jade');
    }
  };

  const doVerify = async (missionId: string) => {
    try {
      await verifyMission(missionId);
      toast('Misión verificada ✓', 'jade');
      await load();
    } catch {
      toast('No se pudo verificar', 'jade');
    }
  };

  const verifyQueue = missions.filter((m) => m.status === 'done');

  return (
    <div className="orgdash" style={{ display: 'grid', gap: 18 }}>
      {/* nodes */}
      <div>
        <h2 className="bs-h2">Nodos ({nodes.length})</h2>
        {nodes.length === 0 ? (
          <div className="empty">Aún no tienes nodos. Crea el primero abajo.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {nodes.map((n) => (
              <div key={n.id} className="ncard" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 22 }}>{NODE_KIND_ICON[n.node_kind]}</span>
                <div style={{ flex: 1 }}>
                  <b>{n.name}</b> <span className="muted">· {n.code}</span>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {NODE_KIND_LABEL[n.node_kind]} · {n.neighborhood ?? 'CDMX'} · {n.status}
                    {!n.active ? ' · inactivo' : ''}
                  </div>
                </div>
                <button className="ghostbtn" onClick={() => markFull(n.id)}>
                  Marcar lleno
                </button>
                <button className="primarybtn" onClick={() => aiOpenMission(n.id)}>
                  ✦ Misión IA
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* verify queue */}
      <div>
        <h2 className="bs-h2">Por verificar ({verifyQueue.length})</h2>
        {verifyQueue.length === 0 ? (
          <div className="empty">Sin misiones completadas esperando verificación.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {verifyQueue.map((m) => (
              <div key={m.id} className="op" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <b>{KIND_LABEL[m.kind]}</b> <span className="muted">· {m.toilet?.name ?? ''}</span>
                </div>
                {m.proof_url && (
                  <a className="ghostbtn" href={m.proof_url} target="_blank" rel="noreferrer">
                    Ver prueba
                  </a>
                )}
                <button className="primarybtn" onClick={() => doVerify(m.id)}>
                  Verificar ✓
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* members (admin only) */}
      {isAdmin && <Members orgId={org.org_id} members={members} onChanged={load} toast={toast} />}

      {/* create node */}
      <CreateNode
        orgId={org.org_id}
        onCreated={async () => {
          await load();
          toast('Nodo creado y en el mapa 📍', 'gold');
        }}
        toast={toast}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
function Members({
  orgId,
  members,
  onChanged,
  toast,
}: {
  orgId: string;
  members: OrgMember[];
  onChanged: () => Promise<void>;
  toast: (t: string, k?: 'gold' | 'xp' | 'jade') => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'steward'>('steward');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      await addOrgMember(orgId, email.trim(), role);
      setEmail('');
      await onChanged();
      toast('Miembro agregado 🤝', 'jade');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo agregar', 'jade');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="bs-h2">Equipo ({members.length})</h2>
      <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
        {members.map((m) => (
          <div key={m.user_id} className="muted" style={{ fontSize: 13 }}>
            {m.email ?? m.user_id.slice(0, 8)} · <b>{m.role}</b>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="email"
          placeholder="email del miembro (FlowBond)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
        />
        <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'steward')}>
          <option value="steward">steward</option>
          <option value="admin">admin</option>
        </select>
        <button className="primarybtn" onClick={add} disabled={busy}>
          Agregar
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        La persona debe haber entrado al menos una vez a algún app FlowBond.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
function CreateNode({
  orgId,
  onCreated,
  toast,
}: {
  orgId: string;
  onCreated: () => Promise<void>;
  toast: (t: string, k?: 'gold' | 'xp' | 'jade') => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [nodeKind, setNodeKind] = useState<NodeKind>('dry_toilet');
  const [neighborhood, setNeighborhood] = useState('');
  const [donationUrl, setDonationUrl] = useState('');
  const [pos, setPos] = useState({ lat: CDMX_CENTER.lat, lng: CDMX_CENTER.lng });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !code.trim()) {
      toast('Nombre y código requeridos', 'jade');
      return;
    }
    setBusy(true);
    try {
      await createNode({
        orgId,
        code: code.trim(),
        name: name.trim(),
        nodeKind,
        lat: pos.lat,
        lng: pos.lng,
        neighborhood: neighborhood.trim() || undefined,
        donationUrl: donationUrl.trim() || undefined,
        hasRecycling: nodeKind === 'recycling_center',
      });
      setName('');
      setCode('');
      setNeighborhood('');
      setDonationUrl('');
      setOpen(false);
      await onCreated();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo crear el nodo', 'jade');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button className="primarybtn" onClick={() => setOpen(true)}>
        ＋ Crear nodo
      </button>
    );
  }

  return (
    <div className="ncard" style={{ display: 'grid', gap: 10 }}>
      <h2 className="bs-h2">Nuevo nodo</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label style={{ flex: 2, minWidth: 160 }}>
          <span className="fieldlabel">Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Baño Roma 14" />
        </label>
        <label style={{ flex: 1, minWidth: 120 }}>
          <span className="fieldlabel">Código / QR</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="BS-ROMA-14" />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label style={{ flex: 1, minWidth: 160 }}>
          <span className="fieldlabel">Tipo</span>
          <select value={nodeKind} onChange={(e) => setNodeKind(e.target.value as NodeKind)}>
            {NODE_KINDS.map((k) => (
              <option key={k} value={k}>
                {NODE_KIND_ICON[k]} {NODE_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1, minWidth: 160 }}>
          <span className="fieldlabel">Colonia</span>
          <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Roma Norte" />
        </label>
      </div>
      <label>
        <span className="fieldlabel">URL de donación (no-custodia, opcional)</span>
        <input value={donationUrl} onChange={(e) => setDonationUrl(e.target.value)} placeholder="https://mpago.la/..." />
      </label>
      <NodePicker value={pos} onChange={setPos} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="primarybtn" onClick={submit} disabled={busy}>
          {busy ? 'Creando…' : 'Crear nodo'}
        </button>
        <button className="ghostbtn" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function CreateOrg({
  onCreated,
  toast,
}: {
  onCreated: () => Promise<void>;
  toast: (t: string, k?: 'gold' | 'xp' | 'jade') => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<OrgKind>('banos_secos');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast('Nombre requerido', 'jade');
      return;
    }
    setBusy(true);
    try {
      await createOrg({ name: name.trim(), kind, slug: slugify(name), contactEmail: email.trim() || undefined });
      setName('');
      setEmail('');
      setOpen(false);
      await onCreated();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo crear', 'jade');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button className="ghostbtn" onClick={() => setOpen(true)} style={{ marginTop: 20 }}>
        ＋ Crear nueva organización
      </button>
    );
  }

  return (
    <div className="ncard" style={{ display: 'grid', gap: 10, marginTop: 20 }}>
      <h2 className="bs-h2">Nueva organización</h2>
      <label>
        <span className="fieldlabel">Nombre</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Baños Secos Roma" />
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label style={{ flex: 1, minWidth: 160 }}>
          <span className="fieldlabel">Tipo</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as OrgKind)}>
            {ORG_KINDS.map((k) => (
              <option key={k} value={k}>
                {ORG_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1, minWidth: 160 }}>
          <span className="fieldlabel">Email de contacto</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hola@org.mx" />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="primarybtn" onClick={submit} disabled={busy}>
          {busy ? 'Creando…' : 'Crear organización'}
        </button>
        <button className="ghostbtn" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
