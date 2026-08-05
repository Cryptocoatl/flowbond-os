'use client';

import Image from 'next/image';
import CineCanvas from './cine/CineCanvas';
import GlobeThreads from './cine/GlobeThreads';

/**
 * De México al mundo — the zoom-out crescendo. The reborn Valle de México glows
 * as an origin point and its reciprocity pattern grows in threads of light to
 * every corner of the Earth (GlobeThreads), over a near-orbit vision layered with
 * twinkling city-lights (CineCanvas) and a kinetic title. Lands before the CTA.
 */
export default function Planeta() {
  return (
    <section className="cine cine--planeta" id="mundo" aria-labelledby="mundo-title">
      <div className="cine-media">
        <Image
          src="/vision/de-mexico-al-mundo.webp"
          alt="La Tierra vista desde el espacio al anochecer: el Valle de México brilla como origen dorado y su patrón regenerativo irradia en hilos de luz que conectan continentes y ciudades que despiertan en verde y oro."
          fill
          sizes="100vw"
          quality={88}
          className="cine-img"
        />
      </div>
      <GlobeThreads />
      <CineCanvas variant="cosmos" />
      <div className="cine-scrim cine-scrim--planeta" aria-hidden="true" />
      <div className="cine-grain" aria-hidden="true" />
      <div className="cine-vignette" aria-hidden="true" />

      <div className="wrap cine-wrap cine-wrap--planeta">
        <div className="cine-copy reveal">
          <span className="eyebrow">De México al mundo</span>
          <h2 id="mundo-title" className="display-md">
            Lo que renace aquí
            <br />
            <em className="oro cine-hero-word">se replica en cada esquina de la Tierra.</em>
          </h2>
          <p className="cine-lead">
            México encendió la primera chinampa. Desde este valle, el modelo de reciprocidad viaja
            como semilla: <b>cada ciudad que lo adopta se vuelve un nuevo punto de luz</b> — una red
            viva de territorios que se regeneran entre sí, hasta que el planeta entero recuerde cómo
            dar y recibir.
          </p>
        </div>
      </div>
    </section>
  );
}
