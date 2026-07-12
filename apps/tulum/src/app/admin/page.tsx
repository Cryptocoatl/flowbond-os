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

type Role = "super_admin" | "admin" | null;
type Contract = { key: string; network: string; address: string; label: string | null; updated_at: string };
type Admin = { user_id: string; role: string; granted_by: string; granted_at: string; revoked_at: string | null };
type Audit = { id: string; actor: string; action: string; target: string | null; detail: unknown; created_at: string };

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

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setRole(null); setLoaded(true); return; }
    const { data: r } = await supabase.rpc("tulumcoin_my_admin_role");
    setRole((r as Role) ?? null);
    if (r) {
      const [{ data: c }, { data: a }, { data: au }] = await Promise.all([
        supabase.from("tulumcoin_contracts").select("*").order("key"),
        supabase.rpc("tulumcoin_list_admins"),
        supabase.rpc("tulumcoin_list_audit", { p_limit: 50 }),
      ]);
      setContracts((c as Contract[]) ?? []);
      setAdmins((a as Admin[]) ?? []);
      setAudit((au as Audit[]) ?? []);
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
