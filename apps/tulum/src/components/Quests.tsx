import VideoSlot from "@/components/VideoSlot";

export default function Quests() {
  return (
    <section id="regeneracion">
      <div className="sec-head reveal">
        <span className="eyebrow">Guardianes de la Naturaleza · XP</span>
        <h2>Jugar es regenerar</h2>
        <p className="en">
          Every verified action mints XP to your soulbound FBID. XP never transfers, never sells —
          it&apos;s the memory of what you gave to the territory. ReFi Tulum NFT holders earn ×1.5
          on everything.
        </p>
      </div>
      <div className="quest-grid">
        <div className="quest reveal"><div className="xp">+120 XP</div><h3>Limpieza de playa</h3><p>Jornada con ReFi Tulum. Peso verificado en sitio, TLMC de prelanzamiento a tu wallet.</p></div>
        <div className="quest reveal d1"><div className="xp">+80 XP</div><h3>Plástico a Petgas</h3><p>Cada kilo entregado en Tulum Circula se pesa, se firma y se convierte en energía, PGC y XP.</p></div>
        <div className="quest reveal d2"><div className="xp">+60 XP</div><h3>Coral y manglar</h3><p>Restauración con ReFi Tulum — el turismo que devuelve más de lo que toma.</p></div>
        <div className="quest reveal d3"><div className="xp">+200 XP</div><h3>Guardián del Fest</h3><p>Voluntariado verificado en el Tulum Innovation Fest 2026.</p></div>
      </div>
      <div className="reel reveal">
        <VideoSlot src="/assets/reel-limpiezas.mp4" className="reel-video">
          <div className="reel-empty">
            <span className="eyebrow">Reel · Higgsfield vía FlowStudio</span>
            <span className="disp">Limpiezas de playa · La visión de Tulum</span>
            <span>Coloca assets/reel-limpiezas.mp4 y este slot se enciende solo · 16:7 · autoplay muted loop</span>
          </div>
        </VideoSlot>
      </div>
    </section>
  );
}
