"use client";
// Verify OG shell — the wallet stacks (wagmi, wallet-selector, wallet-adapter)
// live in a lazy chunk that only loads when the section approaches the
// viewport (or on tap). The landing route ships without a single wallet lib.
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const VerifyIsland = dynamic(() => import("@/components/VerifyIsland"), {
  ssr: false,
  loading: () => <SkeletonCards note="Despertando las tres cadenas…" />,
});

export default function VerifySection() {
  const [wake, setWake] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { setWake(true); io.disconnect(); } }),
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="verify" ref={ref}>
      <div className="verify-wrap">
        <div className="sec-head reveal" style={{ marginBottom: 10 }}>
          <span className="eyebrow">Verificar OG · Sello soulbound FBID</span>
          <h2>Tres firmas, un solo jaguar</h2>
          <p>
            Firma con cada wallet — sin gas, sin permisos, sin mover fondos. Una sola firma EVM lee
            tus holdings en BNB y Optimism a la vez.
            <span className="en" style={{ display: "block", marginTop: 6 }}>
              Sign with each wallet — gasless, no approvals, no funds moved. A single EVM signature
              reads your BNB and Optimism holdings at once.
            </span>
          </p>
        </div>
        {wake
          ? <VerifyIsland />
          : (
            <div onClick={() => setWake(true)}>
              <SkeletonCards note="" />
            </div>
          )}
      </div>
    </section>
  );
}

function SkeletonCards({ note }: { note: string }) {
  const cards = [
    ["NEAR", "Tulumcoin OG · NFTs fundacionales", "Conectar NEAR"],
    ["EVM", "TLMC (Optimism) · PetgasCoin (BNB) · ReFi NFTs", "Conectar EVM"],
    ["SOLANA", "Xelvas · pases del Fest", "Conectar Solana"],
  ] as const;
  return (
    <div className="wallet-grid" aria-busy={note ? true : undefined}>
      {cards.map(([title, sub, cta]) => (
        <div className="wallet-card" key={title}>
          <h3>{title}</h3>
          <div className="w-chain">{sub}</div>
          <ul className="assets"><li><span>Esperando firma…</span><b>—</b></li></ul>
          <button className="w-btn">{cta}</button>
          <div className="sig-state">{note || "Sin gas · sin permisos · sin mover fondos"}</div>
        </div>
      ))}
    </div>
  );
}
