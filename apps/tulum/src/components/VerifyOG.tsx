"use client";
// ============================================================
// VerifyOG — three signatures, one jaguar.
// Badges and tier render ONLY from the SERVER status returned by
// tulumcoin_recompute_status (via the verify-og edge function).
// The client never decides who is OG.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useConfig } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useNear } from "@/providers/Web3Providers";
import { verifyNear, verifyEvm, verifySolana, type VerifyResult } from "@/lib/verify";
import { humaneError } from "@/lib/errors";
import FbidBar from "@/components/FbidBar";

type CardState = "idle" | "signing" | "scanning" | "done" | "error";
type ServerStatus = NonNullable<VerifyResult["status"]>;

const ASSET_LABELS: Record<string, string> = {
  tulumcoin_near: "Tulumcoin (NEAR)",
  og_nft_near: "NFT fundacional",
  tlmc_op: "TLMC · Optimism",
  petgascoin_bnb: "PetgasCoin · BNB",
  refi_nft: "ReFi Tulum NFT",
  xelva_nft: "Xelva NFT",
};

export default function VerifyOG() {
  const [uid, setUid] = useState<string | null>(null);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [holdings, setHoldings] = useState<Record<string, VerifyResult["holdings"]>>({});
  const [cards, setCards] = useState<Record<string, CardState>>({ near: "idle", evm: "idle", solana: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selloRef = useRef<HTMLDivElement>(null);

  const set = (c: string, s: CardState) => setCards((p) => ({ ...p, [c]: s }));
  const fail = (chain: string, e: unknown) => {
    set(chain, "error");
    setErrors((p) => ({ ...p, [chain]: humaneError(e) }));
  };
  const apply = (chain: string, r: VerifyResult) => {
    if (!r.ok) { fail(chain, r.error ?? "verification failed"); return; }
    setHoldings((p) => ({ ...p, [chain]: r.holdings }));
    setStatus(r.status ?? null);
    set(chain, "done");
  };
  const needSession = (chain: string) => {
    if (uid) return false;
    fail(chain, "auth required");
    return true;
  };

  // ---- NEAR · NEP-413 ----
  const near = useNear();
  async function onNear() {
    try {
      if (needSession("near") || !near.selector) return;
      if (!near.selector.isSignedIn()) { near.modal?.show(); return; }
      set("near", "signing");
      const wallet = await near.selector.wallet();
      const accountId = near.selector.store.getState().accounts[0].accountId;
      set("near", "scanning");
      apply("near", await verifyNear(wallet, accountId));
    } catch (e) { fail("near", e); }
  }

  // ---- EVM · EIP-191 (one signature → BNB + Optimism reads) ----
  const wagmi = useConfig();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  async function onEvm() {
    try {
      if (needSession("evm")) return;
      if (!isConnected || !address) { connect({ connector: connectors[0] }); return; }
      set("evm", "signing");
      apply("evm", await verifyEvm(wagmi, address));
    } catch (e) { fail("evm", e); }
  }

  // ---- Solana · ed25519 ----
  const sol = useWallet();
  const solModal = useWalletModal();
  async function onSolana() {
    try {
      if (needSession("solana")) return;
      if (!sol.connected || !sol.publicKey || !sol.signMessage) { solModal.setVisible(true); return; }
      set("solana", "signing");
      apply("solana", await verifySolana(sol.signMessage, sol.publicKey.toBase58()));
    } catch (e) { fail("solana", e); }
  }

  // Tier copy — server flags only (prototype status() text, verbatim)
  const s = status;
  let tierName: string | null = null;
  let tierSub = "";
  if (s) {
    const og = s.og_jaguar, steward = s.tlmc_steward;
    if (og && steward) {
      tierName = "OG JAGUAR + TLMC STEWARD";
      tierSub = "La memoria de NEAR y el futuro en Optimism laten en un solo sello. Custodias el origen y siembras lo que viene.";
    } else if (og) {
      tierName = "OG JAGUAR";
      tierSub = "Guardas el origen: Tulumcoin y los NFTs fundacionales en NEAR. El territorio reconoce a los primeros.";
    } else if (steward) {
      tierName = "TLMC STEWARD";
      tierSub = "Sostienes el nuevo ciclo en Optimism. El jaguar camina contigo hacia el lanzamiento.";
    } else {
      tierName = "SEMILLA";
      tierSub = "Primera firma registrada. La semilla está plantada — sigue verificando para despertar al jaguar.";
    }
    if (s.refi_multiplier && (og || steward)) {
      tierSub += " Tus NFTs de ReFi Tulum multiplican ×1.5 cada beneficio.";
    }
  }

  useEffect(() => {
    if (tierName && Object.values(cards).every((c) => c === "done")) {
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      selloRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    }
  }, [tierName, cards]);

  return (
    <>
      <FbidBar onSession={setUid} />
      <div className="wallet-grid">
        <Card title="NEAR" sub="Tulumcoin OG · NFTs fundacionales"
          state={cards.near} error={errors.near} holdings={holdings.near}
          cta={near.selector?.isSignedIn() ? "Firmar con NEAR" : "Conectar NEAR"} onClick={onNear} />
        <Card title="EVM" sub="TLMC (Optimism) · PetgasCoin (BNB) · ReFi NFTs"
          state={cards.evm} error={errors.evm} holdings={holdings.evm}
          cta={isConnected ? "Firmar · lee BNB + OP" : "Conectar EVM"} onClick={onEvm} />
        <Card title="SOLANA" sub="Xelvas · pases del Fest"
          state={cards.solana} error={errors.solana} holdings={holdings.solana}
          cta={sol.connected ? "Firmar con Solana" : "Conectar Solana"} onClick={onSolana} />
      </div>

      {tierName && (
        <div className="sello show" ref={selloRef}>
          <SelloSeal />
          <div className="tier-name">{tierName}</div>
          <p className="tier-sub">{tierSub}</p>
          <div className="badges">
            <Badge on={!!s?.og_jaguar}>OG Jaguar</Badge>
            <Badge on={!!(s?.og_jaguar && s?.tlmc_steward)}>+ TLMC Steward</Badge>
            <Badge on={!!s?.petgas_ally} tone="green">Petgas Ally</Badge>
            <Badge on={!!s?.refi_multiplier} tone="blue">ReFi ×1.5 beneficios</Badge>
            <Badge on={!!s?.xelva_holder}>Xelva · Fest</Badge>
          </div>
        </div>
      )}
    </>
  );
}

// Sello seal — assets/sello-mint.webm plays ONCE over the coin when present;
// silently falls back to the static coin when the file is absent.
function SelloSeal() {
  const [mint, setMint] = useState(false);
  return (
    <div className={`sello-seal coin-el ${mint ? "mint" : ""}`} role="img" aria-label="Sello del Jaguar">
      <video
        muted playsInline preload="auto" autoPlay
        onLoadedData={() => setMint(true)}
        onEnded={() => setMint(false)}
        onError={(e) => { (e.target as HTMLVideoElement).remove(); }}
      >
        <source src="/assets/sello-mint.webm" type="video/webm" />
      </video>
    </div>
  );
}

function Card(p: { title: string; sub: string; state: CardState; error?: string;
  holdings?: VerifyResult["holdings"]; cta: string; onClick: () => void }) {
  return (
    <div className={`wallet-card ${p.state === "done" ? "verified" : ""}`}>
      {p.state === "done" && <div className="badge-ok">✓</div>}
      <h3>{p.title}</h3>
      <div className="w-chain">{p.sub}</div>
      <ul className="assets">
        {p.holdings?.length
          ? p.holdings.map((h) => (
              <li key={h.asset_key} className={h.balance_raw !== "0" ? "found" : ""}>
                <span>{ASSET_LABELS[h.asset_key] ?? h.asset_key}</span><b>{h.balance_raw}</b>
              </li>))
          : <li><span>Esperando firma…</span><b>—</b></li>}
      </ul>
      <button className="w-btn" disabled={p.state === "signing" || p.state === "scanning" || p.state === "done"}
        onClick={p.onClick}>
        {p.state === "signing" ? "Firmando…" : p.state === "scanning" ? "Escaneando…"
          : p.state === "done" ? "Verificado ✓" : p.cta}
      </button>
      <div className={`sig-state ${p.state === "error" ? "err" : ""}`}>
        {p.state === "error" ? p.error
          : p.state === "done" ? "Vinculado a tu FBID soulbound"
          : p.state === "signing" ? (p.title === "EVM" ? "Una firma · leyendo BNB + Optimism…" : "Mensaje enviado · firma sin gas, sin permisos")
          : p.state === "scanning" ? "Firma verificada · escaneando holdings…"
          : "Sin gas · sin permisos · sin mover fondos"}
      </div>
    </div>
  );
}

function Badge({ on, tone, children }: { on: boolean; tone?: string; children: React.ReactNode }) {
  return <span className={`badge ${tone ?? ""} ${on ? "on" : ""}`}>{children}</span>;
}
