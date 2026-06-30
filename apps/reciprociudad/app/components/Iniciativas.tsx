import { INICIATIVAS } from '@/lib/data';

export default function Iniciativas() {
  return (
    <section className="section" id="iniciativas">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">Chinampas vivas</span>
          <h2 className="display-md">
            Lo que <em className="selva">ya está creciendo</em>.
          </h2>
          <p className="sub">
            Una muestra del tipo de iniciativas que viven dentro de la red. Cada una es una chinampa:
            abre una puerta para participar.
          </p>
        </div>
        <div className="inits">
          {INICIATIVAS.map((it) => (
            <div className={`plot k${it.slot} reveal`} key={it.id}>
              <span className="k">{it.k}</span>
              <div>
                <h3>{it.title}</h3>
                <p>{it.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
