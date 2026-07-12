import VideoSlot from "@/components/VideoSlot";

// Fest framing is locked: "De los creadores del Tulum Crypto Fest · llega ·
// TULUM INNOVATION FEST 2026" — never strikethrough.
export default function Fest() {
  return (
    <section id="fest">
      <div className="fest reveal">
        <VideoSlot src="/assets/fest-ambient.mp4" layer dim />
        <div className="from">
          De los creadores del <b>Tulum Crypto Fest</b> · From the creators of <b>Tulum Crypto Fest</b>
        </div>
        <span className="comes">llega · comes</span>
        <h2>TULUM INNOVATION FEST 2026</h2>
        <p>
          Estos códigos van más allá del cripto y de la tecnología: son vida, comunidades, nuevas
          formas de habitar. El Fest es la puerta — el Sello del Jaguar es la llave.
        </p>
        <a className="btn-oro" href="#verify">Obtener mi Sello para el Fest</a>
      </div>
    </section>
  );
}
