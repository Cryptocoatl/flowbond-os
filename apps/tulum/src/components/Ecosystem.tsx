import type { CSSProperties } from "react";

const accent = (v: string): CSSProperties => ({ "--accent": v } as CSSProperties);

export default function Ecosystem() {
  return (
    <section id="ecosistema">
      <div className="sec-head reveal">
        <span className="eyebrow">Un territorio · tres firmas · una identidad</span>
        <h2>El ecosistema que ya vive en Tulum</h2>
        <p className="en">
          Each ally minted where it was born. Your soulbound FBID unites NEAR, EVM and Solana under
          one seal — and one EVM signature covers both BNB and Optimism.
        </p>
      </div>
      <div className="eco-grid">
        <div className="eco-card reveal" style={accent("var(--oro-hi)")}>
          <span className="chain-tag">NEAR</span>
          <div className="eco-ic">T</div>
          <h3>Tulumcoin OG</h3>
          <p>El token y los NFTs originales en NEAR. Quien los guarda es <b>OG Jaguar</b> — la memoria fundacional del proyecto.</p>
        </div>
        <div className="eco-card reveal d1" style={accent("var(--verde)")}>
          <span className="chain-tag">Optimism</span>
          <div className="eco-ic" style={{ color: "var(--verde)", borderColor: "var(--verde)" }}>S</div>
          <h3>TLMC Steward</h3>
          <p>El nuevo token en Optimism. Tenerlo junto al OG de NEAR te corona <b>OG Jaguar + TLMC Steward</b>.</p>
        </div>
        <div className="eco-card reveal d2" style={accent("#F0B90B")}>
          <span className="chain-tag">BNB Chain</span>
          <div className="eco-ic" style={{ color: "#F0B90B", borderColor: "#F0B90B" }}>P</div>
          <h3>Petgas</h3>
          <p>Plástico convertido en energía. PetgasCoin en BNB reconoce cada kilo que sale de la playa y entra al reactor.</p>
        </div>
        <div className="eco-card reveal" style={accent("var(--mar)")}>
          <span className="chain-tag">NFTs</span>
          <div className="eco-ic" style={{ color: "var(--mar)", borderColor: "var(--mar)" }}>R</div>
          <h3>ReFi Tulum</h3>
          <p>Sus NFTs son multiplicadores: beneficios extra en XP, quests y accesos para todo holder, en todo el ecosistema.</p>
        </div>
        <div className="eco-card reveal d1" style={accent("#B08CF0")}>
          <span className="chain-tag">Solana</span>
          <div className="eco-ic" style={{ color: "#B08CF0", borderColor: "#B08CF0" }}>X</div>
          <h3>Xelva</h3>
          <p>Arte, selva y comunidad. Los Xelvas viven en Solana y abren las puertas del Tulum Innovation Fest.</p>
        </div>
        <div className="eco-card reveal d2" style={accent("var(--niebla)")}>
          <span className="chain-tag">SmartWallet</span>
          <div className="eco-ic" style={{ color: "var(--niebla)", borderColor: "var(--niebla)" }}>G</div>
          <h3>TulumGo</h3>
          <p>La smartwallet del ecosistema — el punto de entrada sin fricción para quien llega por primera vez.</p>
        </div>
      </div>
    </section>
  );
}
