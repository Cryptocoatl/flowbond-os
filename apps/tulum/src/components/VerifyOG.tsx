"use client";
// ============================================================
// VerifyOG — three signatures, one jaguar.
// Badges and tier render ONLY from the SERVER status returned by
// tulumcoin_recompute_status (via the verify-og edge function).
// The client never decides who is OG.
//
// Flow is gated: you MUST be signed into your FBID first (Paso 1). Until then
// the three wallet cards are LOCKED — tapping one glides you to the login panel
// instead of throwing an error. Once signed in they unlock (Paso 2) and each
// connect → sign → scan binds that chain to your soulbound FBID.
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

  // Not signed in → don't error, guide. Glide to the login panel and flag it.
  const [nudge, setNudge] = useState(false);
  function goLogin() {
    const el = document.getElementById("fbid-login");
    if (el) {
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      el.classList.add("nudge");
      setTimeout(() => el.classList.remove("nudge"), 1400);
    }
    setNudge(true);
    setTimeout(() => setNudge(false), 1400);
  }

  // ---- NEAR · NEP-413 ----
  const near = useNear();
  async function onNear() {
    try {
      if (!uid) return goLogin();
      if (!near.selector) return;
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
  function connectEvm() {
    // Prefer an injected wallet (MetaMask/Rabbit/Brave) when one is present;
    // otherwise fall back to WalletConnect so mobile / no-extension users can
    // pair by QR. Without this, connectors[0]=injected silently no-ops on phones.
    const hasInjected = typeof window !== "undefined" && !!(window as { ethereum?: unknown }).ethereum;
    const injected = connectors.find((c) => c.type === "injected" || c.id === "injected");
    const wc = connectors.find((c) => c.id === "walletConnect");
    const connector = (hasInjected && injected) ? injected : (wc ?? connectors[0]);
    if (connector) connect({ connector });
  }
  async function onEvm() {
    try {
      if (!uid) return goLogin();
      if (!isConnected || !address) { connectEvm(); return; }
      set("evm", "signing");
      apply("evm", await verifyEvm(wagmi, address));
    } catch (e) { fail("evm", e); }
  }

  // ---- Solana · ed25519 ----
  const sol = useWallet();
  const solModal = useWalletModal();
  async function onSolana() {
    try {
      if (!uid) return goLogin();
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

  const locked = !uid;

  return (
    <>
      <FbidBar
        onSession={setUid}
        intro={{
          panelId: "fbid-login",
          eyebrow: "Paso 1 · Entra con tu FBID",
          title: "Tu identidad soulbound",
          blurb: (
            <>
              Tu FBID es la raíz a la que se atan tus firmas. Entra una vez y verifica todas tus wallets.
              <span className="en"> Sign in once — every wallet you verify binds to this one soulbound FBID.</span>
            </>
          ),
        }}
      />

      <div className={"wallet-step" + (locked ? " locked" : "")}>
        <div className="wallet-step-head">
          <span className="eyebrow">
            Paso 2 · Firma con cada wallet {locked && <span className="lock-pill">🔒 requiere FBID</span>}
          </span>
          {locked && (
            <button className={"unlock-cue" + (nudge ? " nudge" : "")} onClick={goLogin}>
              Entra arriba para desbloquear tus wallets ↑
            </button>
          )}
        </div>

        <div className="wallet-grid" aria-disabled={locked}>
          <Card title="NEAR" sub="Tulumcoin OG · NFTs fundacionales"
            state={cards.near} error={errors.near} holdings={holdings.near} locked={locked}
            cta={near.selector?.isSignedIn() ? "Firmar con NEAR" : "Conectar NEAR"} onClick={onNear} />
          <Card title="EVM" sub="TLMC (Optimism) · PetgasCoin (BNB) · ReFi NFTs"
            state={cards.evm} error={errors.evm} holdings={holdings.evm} locked={locked}
            cta={isConnected ? "Firmar · lee BNB + OP" : "Conectar EVM"} onClick={onEvm} />
          <Card title="SOLANA" sub="Xelvas · pases del Fest"
            state={cards.solana} error={errors.solana} holdings={holdings.solana} locked={locked}
            cta={sol.connected ? "Firmar con Solana" : "Conectar Solana"} onClick={onSolana} />
        </div>
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

function Card(p: { title: string; sub: string; state: CardState; error?: string; locked?: boolean;
  holdings?: VerifyResult["holdings"]; cta: string; onClick: () => void }) {
  return (
    <div className={`wallet-card ${p.state === "done" ? "verified" : ""} ${p.locked ? "is-locked" : ""}`}>
      {p.state === "done" && <div className="badge-ok">✓</div>}
      {p.locked && <div className="lock-badge" aria-hidden="true">🔒</div>}
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
          : p.state === "done" ? "Verificado ✓" : p.locked ? "🔒 " + p.cta : p.cta}
      </button>
      <div className={`sig-state ${p.state === "error" ? "err" : ""}`}>
        {p.state === "error" ? p.error
          : p.state === "done" ? "Vinculado a tu FBID soulbound"
          : p.locked ? "Entra con tu FBID para verificar"
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
