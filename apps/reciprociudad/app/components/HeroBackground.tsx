'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

// WebGL water — client only, never server-rendered.
const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export default function HeroBackground() {
  const heroRef = useRef<HTMLElement>(null);
  const [reduce, setReduce] = useState(false);
  const [gl, setGl] = useState<boolean | null>(null); // null until checked (avoids hydration mismatch)

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(m.matches);
    setGl(webglOK());

    // Scroll + mouse parallax of the SVG depth layers (skipped when reduced).
    if (m.matches) return;
    const layers = Array.from(
      heroRef.current?.querySelectorAll<HTMLElement>('[data-depth]') ?? [],
    );
    let mx = 0;
    let my = 0;
    const apply = () => {
      const y = window.scrollY;
      layers.forEach((l) => {
        const d = Number(l.dataset.depth);
        const baseY = y * (d / 100);
        l.style.transform = `translate(${-mx * d * 0.6}px, ${baseY - my * d * 0.4}px)`;
      });
    };
    const onScroll = () => apply();
    const onMove = (e: MouseEvent) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
      apply();
    };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <section className="hero" ref={heroRef}>
      <div className="sky" />
      <div className="sun" data-depth="6" />

      {/* Far volcano ridges */}
      <div className="layer" data-depth="14" style={{ zIndex: 2 }}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" style={{ bottom: 0, height: '100%' }}>
          <defs>
            <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0e3f3e" />
              <stop offset="1" stopColor="#072523" />
            </linearGradient>
          </defs>
          <g style={{ opacity: 0.95 }}>
            <path d="M180,560 L430,300 L470,330 L520,290 L760,560 Z" fill="url(#v)" />
            <path d="M560,560 L820,250 L980,560 Z" fill="url(#v)" />
            <path d="M880,560 L1130,330 L1175,360 L1230,320 L1420,560 Z" fill="url(#v)" />
            <path d="M820,250 L880,330" stroke="#ffcf7d" strokeWidth="2" opacity=".5" fill="none" />
            <path d="M430,300 L500,400" stroke="#ffcf7d" strokeWidth="1.5" opacity=".35" fill="none" />
            <path d="M1130,330 L1190,420" stroke="#ffcf7d" strokeWidth="1.5" opacity=".35" fill="none" />
          </g>
        </svg>
      </div>

      {/* Chinampa / temple terrace */}
      <div className="layer" data-depth="22" style={{ zIndex: 4 }}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" style={{ bottom: 0, height: '100%' }}>
          <g transform="translate(720,560)">
            <path d="M-150,40 L150,40 L120,10 L-120,10 Z" fill="#0c3a37" />
            <path d="M-110,10 L110,10 L86,-18 L-86,-18 Z" fill="#0f463f" />
            <path d="M-78,-18 L78,-18 L56,-46 L-56,-46 Z" fill="#125248" />
            <path d="M-48,-46 L48,-46 L30,-78 L-30,-78 Z" fill="#155c4f" />
            <path d="M-30,-78 q15,-26 30,0" fill="none" stroke="#9fd356" strokeWidth="3" opacity=".8" />
            <circle cx="-12" cy="-82" r="5" fill="#9fd356" opacity=".8" />
            <circle cx="14" cy="-84" r="6" fill="#7ec24a" opacity=".8" />
            <g fill="#ffd98a">
              <rect x="-90" y="-8" width="5" height="9" rx="1" />
              <rect x="-60" y="-8" width="5" height="9" rx="1" />
              <rect x="48" y="-8" width="5" height="9" rx="1" />
              <rect x="78" y="-8" width="5" height="9" rx="1" />
              <rect x="-44" y="-38" width="4" height="8" rx="1" />
              <rect x="38" y="-38" width="4" height="8" rx="1" />
              <rect x="-6" y="-68" width="4" height="8" rx="1" fill="#fff2cf" />
            </g>
            <g opacity=".18" transform="scale(1,-0.5) translate(0,-86)">
              <path d="M-150,40 L150,40 L120,10 L-120,10 Z" fill="#22c4b2" />
              <path d="M-78,-18 L78,-18 L56,-46 L-56,-46 Z" fill="#22c4b2" />
            </g>
          </g>
        </svg>
      </div>

      {/* WebGL water (or CSS fallback) */}
      {gl === true && <HeroScene reduce={reduce} />}
      <div className={`water-fallback${gl === false ? ' show' : ''}`} aria-hidden="true" />

      <div className="mist a" />
      <div className="mist b" />

      {/* Foreground reeds */}
      <div className="layer" data-depth="48" style={{ zIndex: 6 }}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" style={{ bottom: 0, height: '100%' }}>
          <g fill="#06201d">
            <path
              d="M-40,900 C40,720 30,560 150,470 C120,560 170,600 210,560 C170,640 230,690 200,760 C260,720 280,790 250,860 C180,900 60,900 -40,900 Z"
              opacity=".96"
            />
            <g transform="translate(1330,900)">
              <path d="M0,0 L-30,-200 L-12,-208 L6,-30 Z" />
              <path d="M0,0 L40,-180 L58,-168 L18,-20 Z" />
              <path d="M0,0 L-70,-150 L-56,-134 L8,-10 Z" />
              <path d="M0,0 L90,-120 L100,-102 L20,-6 Z" />
              <path d="M0,0 L-110,-90 L-100,-72 L4,0 Z" />
            </g>
          </g>
        </svg>
      </div>

      <div className="wrap">
        <div className="hero-copy">
          <Image
            className="logo-mark hero-medallion"
            src="/logo-512.png"
            alt="Sello de Reciprociudad"
            width={84}
            height={84}
            priority
          />
          <span className="eyebrow">Tenochtitlan · sistema vivo · hoy</span>
          <h1 className="display-lg">
            Una ciudad que se
            <br />
            <em className="agua">alimenta</em> a sí misma.
          </h1>
          <p className="lead">
            Hace siglos, esta ciudad crecía sobre el agua: chinampas que regeneraban, canales que
            conectaban, mercados donde todo se intercambiaba.{' '}
            <b style={{ color: 'var(--miel)' }}>Reciprociudad reactiva ese sistema ancestral</b> como
            una red viva — para que la ciudad vuelva a dar, recibir y regenerar.
          </p>
          <div className="hero-cta">
            <a href="#unete" className="btn btn-sun">
              Entrar a la red →
            </a>
            <a href="#origen" className="btn btn-ghost-l">
              Descender al lago
            </a>
          </div>
        </div>
      </div>

      <div className="scrollcue">
        <span>Desciende</span>
        <span className="line" />
      </div>
    </section>
  );
}
