import VideoSlot from "@/components/VideoSlot";

export default function Circula() {
  return (
    <section id="circula">
      <div className="sec-head reveal">
        <span className="eyebrow">Tulum Circula × Petgas</span>
        <h2>El primer centro de reciclaje con trazabilidad viva</h2>
        <p className="en">
          The first recycling center where every kilo is traceable — weighed on arrival, signed
          on-ledger, transformed by Petgas, returned as energy, TLMC and XP.
        </p>
      </div>
      <VideoSlot src="/assets/circula-trace.mp4" banner />
      <div className="trace reveal">
        <span className="eyebrow">Cadena de trazabilidad · append-only</span>
        <div className="trace-line">
          <div className="t-step"><div className="n">1</div><h4>Recolección</h4><p>Limpieza de playa o entrega directa al centro</p></div>
          <div className="t-step"><div className="n">2</div><h4>Pesaje verificado</h4><p>Kilo firmado en sitio · prueba MRV con foto y geo</p></div>
          <div className="t-step"><div className="n">3</div><h4>Reactor Petgas</h4><p>El plástico se convierte en combustible y energía</p></div>
          <div className="t-step"><div className="n">4</div><h4>Recompensa</h4><p>TLMC + PGC + XP acuñados a tu FBID soulbound</p></div>
          <div className="t-step"><div className="n">5</div><h4>Fondo DAO</h4><p>El impacto queda en el libro público · la comunidad vota su destino</p></div>
        </div>
      </div>
    </section>
  );
}
