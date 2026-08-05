'use client';

import Image from 'next/image';
import CineCanvas from './cine/CineCanvas';

/**
 * El regreso — cinematic chapter. Photoreal vision of Tenochtitlan reborn as a
 * living solarpunk lake-city (Higgsfield, inspired by Thomas Kole's "Retrato de
 * Tenochtitlan"), brought to life with drifting golden embers, a volumetric light
 * sweep, film grain and a kinetic title reveal. Bridges Origen → Sistema.
 */
export default function Regreso() {
  return (
    <section className="cine cine--regreso" id="regreso" aria-labelledby="regreso-title">
      <div className="cine-media">
        <Image
          src="/vision/tenochtitlan-renace.webp"
          alt="Visión de Tenochtitlan renacida: la ciudad-lago viva sobre el agua, con el Templo Mayor y las pirámides al centro, calzadas cruzando canales turquesa, chinampas desbordadas de cultivos y flores, canoas, y el Popocatépetl e Iztaccíhuatl nevados al amanecer."
          fill
          sizes="100vw"
          quality={88}
          className="cine-img"
        />
      </div>
      <div className="cine-scrim" aria-hidden="true" />
      <div className="cine-rays" aria-hidden="true" />
      <CineCanvas variant="embers" />
      <div className="cine-grain" aria-hidden="true" />
      <div className="cine-vignette" aria-hidden="true" />

      <div className="wrap cine-wrap">
        <div className="cine-copy reveal">
          <span className="eyebrow">El regreso · capítulo vivo</span>
          <h2 id="regreso-title" className="display-md">
            Tenochtitlan no se fue.
            <br />
            <em className="agua cine-hero-word">Vuelve.</em>
          </h2>
          <p className="cine-lead">
            La ciudad que se alimentaba a sí misma sobre el agua sigue latiendo bajo el concreto.{' '}
            <b>Reciprociudad reenciende ese sistema ancestral</b> — chinampa por chinampa, barrio por
            barrio — para que la ciudad vuelva a dar, recibir y <b>regenerar el planeta</b> desde su
            propio corazón.
          </p>
          <span className="cine-credit">
            Visión inspirada en el <em>Retrato de Tenochtitlan</em> · reconstrucción 3D de la capital
            mexica
          </span>
        </div>
      </div>
    </section>
  );
}
