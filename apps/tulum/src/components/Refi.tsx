import Image from "next/image";
import VideoSlot from "@/components/VideoSlot";

// ReFi Tulum — el mar. Logo mirrored locally (no hotlinks).
export default function Refi() {
  return (
    <div className="refi" id="refi">
      <VideoSlot src="/assets/refi-sea.mp4" layer dim />
      <div className="inner">
        <div className="reveal">
          <span className="eyebrow">El movimiento · ReFi Tulum</span>
          <div className="refi-head">
            <Image src="/refi-tulum.png" alt="ReFi Tulum" width={92} height={92} unoptimized />
            <div>
              <h2>Regenerando los lugares que amamos</h2>
              <p className="lead">
                Acelerando la transformación de Tulum: impacto verificado, comunidad activada,
                historias que viajan.{" "}
                <span className="en">
                  Accelerating Tulum&apos;s transformation — verified impact, activated community,
                  stories that travel.
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="pillars">
          <div className="pillar reveal">
            <div className="p-ic">I</div>
            <h3>Activación comunitaria</h3>
            <p>Limpiezas recurrentes, jornadas de restauración y educación ambiental que construyen custodia colectiva de los espacios naturales compartidos.</p>
          </div>
          <div className="pillar reveal d1">
            <div className="p-ic">II</div>
            <h3>Turismo regenerativo</h3>
            <p>Experiencias inmersivas que restauran ecosistemas: restauración de coral, siembra de manglar y aprendizaje ambiental de manos en la tierra.</p>
          </div>
          <div className="pillar reveal d2">
            <div className="p-ic">III</div>
            <h3>Narrativa e innovación</h3>
            <p>El impacto verificado se vuelve historia y laboratorio vivo: medios, narrativas culturales y scouting de soluciones regenerativas escalables.</p>
          </div>
        </div>
        <div className="earth-strip reveal">
          <div>
            <div className="disp">Cada día es el Día de la Tierra</div>
            <div className="sub">
              Visítalos en persona · NFT Boutique, Tulum · Cada NFT de ReFi multiplica ×1.5 tus
              beneficios en todo el ecosistema
            </div>
          </div>
          <a href="https://refitulum.io/" target="_blank" rel="noopener noreferrer">
            <button className="btn-mar">Conocer ReFi Tulum</button>
          </a>
        </div>
      </div>
    </div>
  );
}
