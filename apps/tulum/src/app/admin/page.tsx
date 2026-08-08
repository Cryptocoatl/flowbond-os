"use client";
// ============================================================
// /admin — El Templo · TulumCoin control room
// super_admin (Love): grant/revoke team admins + everything below
// admin (team):       edit contract addresses
// Every action writes to the append-only audit ledger.
// Gate is DB truth (tulumcoin_my_admin_role) — never client state.
// ============================================================
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import FbidBar from "@/components/FbidBar";

const WORKER_URL = (
  process.env.NEXT_PUBLIC_VERIFY_WORKER_URL ??
  "https://tulum-verify-worker.cryptocoatl101.workers.dev"
).replace(/\/$/, "");

type Role = "super_admin" | "admin" | null;
type Contract = { key: string; network: string; address: string; label: string | null; updated_at: string };
type Admin = { user_id: string; role: string; granted_by: string; granted_at: string; revoked_at: string | null };
type Audit = { id: string; actor: string; action: string; target: string | null; detail: unknown; created_at: string };
type Snapshot = { key: string; chain: string; kind: string; credential: string; holder_count: number | null; is_frozen: boolean; notes: string | null };
type RateRow = { credential: string; base_xp: number };
type NewCollection = { key: string; kind: "ft" | "nft"; contract: string; credential: string; label: string; base_xp: string };

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#132A1A", color: "#F5E5C0", fontFamily: "var(--font-sora), Sora, system-ui, sans-serif", padding: "48px 6vw" },
  h1: { fontFamily: "var(--font-marcellus), Marcellus, serif", fontWeight: 400, fontSize: 34, letterSpacing: ".04em" },
  sub: { color: "#9CBBA3", fontSize: 14, marginTop: 6 },
  card: { background: "rgba(28,59,37,.55)", border: "1px solid rgba(245,229,192,.15)", borderRadius: 10, padding: 28, marginTop: 28 },
  h2: { fontFamily: "var(--font-marcellus), Marcellus, serif", fontWeight: 400, fontSize: 22, marginBottom: 18 },
  row: { display: "grid", gridTemplateColumns: "180px 110px 1fr auto", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: "1px dashed rgba(156,187,163,.18)" },
  key: { fontSize: 13, color: "#E9C67A" },
  net: { fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase" as const, color: "#9CBBA3" },
  input: { background: "#0F2015", border: "1px solid rgba(245,229,192,.2)", borderRadius: 4, color: "#F5E5C0", padding: "9px 12px", fontSize: 13, width: "100%", fontFamily: "inherit" },
  btn: { background: "linear-gradient(165deg,#F6DC9E,#E9C67A 60%,#C9974C)", color: "#33210A", border: "none", borderRadius: 3, padding: "9px 18px", fontSize: 11, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase" as const, cursor: "pointer" },
  ghost: { background: "none", border: "1px solid rgba(245,229,192,.3)", color: "#9CBBA3", borderRadius: 3, padding: "9px 14px", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase" as const, cursor: "pointer" },
  tag: { fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase" as const, border: "1px solid rgba(233,198,122,.5)", color: "#F6DC9E", borderRadius: 20, padding: "3px 12px" },
  err: { color: "#F09595", fontSize: 13, marginTop: 10 },
  ok: { color: "#6FCF8E", fontSize: 13, marginTop: 10 },
  mono: { fontFamily: "monospace", fontSize: 12, color: "#9CBBA3", overflowWrap: "anywhere" as const },
};

export default function AdminPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loaded, setLoaded] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [grantId, setGrantId] = useState("");
  const [grantRole, setGrantRole] = useState<"admin" | "super_admin">("admin");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [rateCard, setRateCard] = useState<RateRow[]>([]);
  const [nc, setNc] = useState<NewCollection>({ key: "", kind: "nft", contract: "", credential: "", label: "", base_xp: "100" });
  const [freezing, setFreezing] = useState(false);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setRole(null); setLoaded(true); return; }
    const { data: r } = await supabase.rpc("tulumcoin_my_admin_role");
    setRole((r as Role) ?? null);
    if (r) {
      const [{ data: c }, { data: a }, { data: au }, { data: sn }, { data: rc }] = await Promise.all([
        supabase.from("tulumcoin_contracts").select("*").order("key"),
        supabase.rpc("tulumcoin_list_admins"),
        supabase.rpc("tulumcoin_list_audit", { p_limit: 50 }),
        supabase.from("tulum_snapshots").select("key,chain,kind,credential,holder_count,is_frozen,notes").order("credential"),
        supabase.from("tulum_xp_rate_card").select("credential,base_xp").order("base_xp", { ascending: false }),
      ]);
      setContracts((c as Contract[]) ?? []);
      setAdmins((a as Admin[]) ?? []);
      setAudit((au as Audit[]) ?? []);
      setSnapshots((sn as Snapshot[]) ?? []);
      setRateCard((rc as RateRow[]) ?? []);
    }
    setLoaded(true);
  }, []);
  useEffect(() => { refresh(); }, [refresh, uid]);

  async function act(fn: () => Promise<{ error: { message: string } | null }>, okMsg: string) {
    setMsg({});
    const { error } = await fn();
    if (error) setMsg({ err: error.message });
    else { setMsg({ ok: okMsg }); refresh(); }
  }

  const saveContract = (c: Contract) =>
    act(async () => supabase.rpc("tulumcoin_set_contract", {
      p_key: c.key, p_network: c.network, p_address: c.address, p_label: c.label,
    }), `${c.key} guardado — quedó en la bitácora`);

  const bootstrap = () =>
    act(async () => supabase.rpc("tulumcoin_bootstrap_super_admin"),
      "Eres super admin. El Templo es tuyo.");

  const grant = () =>
    act(async () => supabase.rpc("tulumcoin_grant_admin", { p_user_id: grantId, p_role: grantRole }),
      "Acceso otorgado");

  const revoke = (id: string) =>
    act(async () => supabase.rpc("tulumcoin_revoke_admin", { p_user_id: id }), "Acceso revocado");

  type WorkerResp = { error?: string; credential?: string; holder_count?: number; [k: string]: unknown };
  async function workerPost(path: string, body: unknown): Promise<{ error: { message: string } | null; data: WorkerResp }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: { message: "sesión requerida" }, data: {} };
    const r = await fetch(`${WORKER_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    const data = (await r.json().catch(() => ({}))) as WorkerResp;
    return { error: r.ok ? null : { message: data?.error ?? `HTTP ${r.status}` }, data };
  }

  async function addCollection() {
    if (!nc.key || !nc.contract || !nc.credential) { setMsg({ err: "faltan key, contract o credencial" }); return; }
    setFreezing(true); setMsg({});
    const { error, data } = await workerPost("/admin/snapshot", {
      key: nc.key.trim(), chain: "solana", kind: nc.kind, contract: nc.contract.trim(),
      credential: nc.credential.trim().toUpperCase(), label: nc.label.trim() || null,
      base_xp: Number(nc.base_xp) || 100,
    });
    setFreezing(false);
    if (error) { setMsg({ err: error.message }); return; }
    setMsg({ ok: `Congelado ${data.credential}: ${data.holder_count} holders reconocidos.` });
    setNc({ key: "", kind: "nft", contract: "", credential: "", label: "", base_xp: "100" });
    refresh();
  }

  const setXp = (credential: string, base_xp: number) =>
    act(async () => (await workerPost("/admin/xp", { credential, base_xp })), `XP de ${credential} actualizado`);

  if (!loaded) return <main style={S.page}><p style={S.sub}>Abriendo el Templo…</p></main>;

  if (!role) return (
    <main style={S.page}>
      <h1 style={S.h1}>El Templo</h1>
      <FbidBar onSession={setUid} />
      {uid && (
        <>
          <p style={S.sub}>
            No tienes acceso de administración. Si eres la primera guardiana y el sistema está
            recién desplegado, reclama el Templo:
          </p>
          <div style={{ marginTop: 20 }}>
            <button style={S.btn} onClick={bootstrap}>Reclamar super admin (solo funciona una vez)</button>
          </div>
        </>
      )}
      {msg.err && <p style={S.err}>{msg.err}</p>}
      {msg.ok && <p style={S.ok}>{msg.ok}</p>}
    </main>
  );

  return (
    <main style={S.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={S.h1}>El Templo · TulumCoin</h1>
          <p style={S.sub}>Contratos, equipo y bitácora — todo firmado, todo auditable.</p>
        </div>
        <span style={S.tag}>{role === "super_admin" ? "Super Admin 🐆" : "Admin"}</span>
      </div>
      <FbidBar onSession={setUid} />
      {msg.err && <p style={S.err}>{msg.err}</p>}
      {msg.ok && <p style={S.ok}>{msg.ok}</p>}

      {/* ---------------- contracts ---------------- */}
      <section style={S.card}>
        <h2 style={S.h2}>Contratos del ecosistema</h2>
        {contracts.map((c, i) => (
          <div key={c.key} style={S.row}>
            <div>
              <div style={S.key}>{c.key}</div>
              <div style={{ fontSize: 11.5, color: "#9CBBA3" }}>{c.label}</div>
            </div>
            <span style={S.net}>{c.network}</span>
            <input style={S.input} value={c.address} placeholder="dirección del contrato…"
              onChange={(e) => setContracts((p) => p.map((x, j) => j === i ? { ...x, address: e.target.value } : x))} />
            <button style={S.btn} onClick={() => saveContract(c)}>Guardar</button>
          </div>
        ))}
        <p style={{ ...S.sub, marginTop: 14 }}>
          El edge function lee estas direcciones en vivo (cache 60s). Sin redeploy, sin env vars.
        </p>
      </section>

      {/* ---------------- OG collections · benefits (frozen snapshots) ---------------- */}
      <section style={S.card}>
        <h2 style={S.h2}>Colecciones OG · Beneficios</h2>
        <p style={{ ...S.sub, marginTop: -8, marginBottom: 18 }}>
          Cada colección congelada otorga una credencial soulbound + XP al firmar la wallet.
          El reconocimiento se resuelve contra el snapshot congelado — nunca contra el saldo en vivo.
        </p>

        {snapshots.length === 0 && <p style={S.sub}>Aún no hay colecciones congeladas.</p>}
        {snapshots.map((s) => {
          const xp = rateCard.find((r) => r.credential === s.credential)?.base_xp ?? 0;
          return (
            <div key={s.key} style={{ ...S.row, gridTemplateColumns: "1fr 120px 110px 130px auto" }}>
              <div>
                <div style={S.key}>{s.credential}</div>
                <div style={{ fontSize: 11.5, color: "#9CBBA3" }}>{s.notes ?? s.key}</div>
              </div>
              <span style={S.net}>{s.chain} · {s.kind}</span>
              <span style={{ fontSize: 12.5, color: s.is_frozen ? "#6FCF8E" : "#F0C36F" }}>
                {s.is_frozen ? `${s.holder_count ?? 0} holders` : "sin congelar"}
              </span>
              <input style={{ ...S.input, width: 90 }} type="number" defaultValue={xp}
                onBlur={(e) => { const v = Number(e.target.value); if (v !== xp) setXp(s.credential, v); }} />
              <span style={{ ...S.net, color: "#E9C67A" }}>XP</span>
            </div>
          );
        })}

        <h2 style={{ ...S.h2, fontSize: 17, marginTop: 30 }}>Agregar colección de Solana</h2>
        <p style={{ ...S.sub, marginTop: -10, marginBottom: 16 }}>
          NFT (collection mint) o token SPL. Congela los holders actuales vía Helius DAS y crea la credencial.
          <span style={{ display: "block", marginTop: 4 }}>EVM / NEAR se congelan por CLI (snapshot revisado por humano).</span>
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 720 }}>
          <input style={S.input} placeholder="key (ej. gorillae_v2)" value={nc.key}
            onChange={(e) => setNc({ ...nc, key: e.target.value })} />
          <select style={S.input} value={nc.kind} onChange={(e) => setNc({ ...nc, kind: e.target.value as "ft" | "nft" })}>
            <option value="nft">NFT (collection mint)</option>
            <option value="ft">Token SPL (fungible)</option>
          </select>
          <input style={{ ...S.input, gridColumn: "1 / -1" }} placeholder="contract / collection mint address" value={nc.contract}
            onChange={(e) => setNc({ ...nc, contract: e.target.value })} />
          <input style={S.input} placeholder="CREDENCIAL (ej. GORILLAE_OG)" value={nc.credential}
            onChange={(e) => setNc({ ...nc, credential: e.target.value })} />
          <input style={S.input} type="number" placeholder="XP (ej. 200)" value={nc.base_xp}
            onChange={(e) => setNc({ ...nc, base_xp: e.target.value })} />
          <input style={{ ...S.input, gridColumn: "1 / -1" }} placeholder="etiqueta / nota (opcional)" value={nc.label}
            onChange={(e) => setNc({ ...nc, label: e.target.value })} />
        </div>
        <div style={{ marginTop: 16 }}>
          <button style={{ ...S.btn, opacity: freezing ? 0.6 : 1 }} onClick={addCollection} disabled={freezing}>
            {freezing ? "Congelando holders…" : "Congelar colección"}
          </button>
        </div>
      </section>

      {/* ---------------- team (super admin only) ---------------- */}
      {role === "super_admin" && (
        <section style={S.card}>
          <h2 style={S.h2}>Equipo · nueva fase TulumCoin</h2>
          {admins.map((a) => (
            <div key={a.user_id} style={{ ...S.row, gridTemplateColumns: "1fr 130px 160px auto" }}>
              <span style={S.mono}>{a.user_id}</span>
              <span style={S.tag}>{a.role}</span>
              <span style={{ fontSize: 12, color: a.revoked_at ? "#F09595" : "#6FCF8E" }}>
                {a.revoked_at ? "revocado" : "activo"}
              </span>
              {!a.revoked_at && <button style={S.ghost} onClick={() => revoke(a.user_id)}>Revocar</button>}
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <input style={{ ...S.input, maxWidth: 380 }} placeholder="FBID (uuid) del nuevo miembro…"
              value={grantId} onChange={(e) => setGrantId(e.target.value)} />
            <select style={{ ...S.input, maxWidth: 160 }} value={grantRole}
              onChange={(e) => setGrantRole(e.target.value as "admin" | "super_admin")}>
              <option value="admin">admin</option>
              <option value="super_admin">super_admin</option>
            </select>
            <button style={S.btn} onClick={grant} disabled={!grantId}>Otorgar acceso</button>
          </div>
        </section>
      )}

      {/* ---------------- audit ---------------- */}
      <section style={S.card}>
        <h2 style={S.h2}>Bitácora (append-only)</h2>
        {audit.map((a) => (
          <div key={a.id} style={{ ...S.row, gridTemplateColumns: "170px 130px 1fr" }}>
            <span style={S.mono}>{new Date(a.created_at).toLocaleString()}</span>
            <span style={S.key}>{a.action}</span>
            <span style={S.mono}>{a.target} {a.detail ? JSON.stringify(a.detail) : ""}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
