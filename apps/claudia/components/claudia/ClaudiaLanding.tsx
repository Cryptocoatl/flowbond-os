'use client';

import { useEffect, useRef, useState } from 'react';
import { EMPIRE } from '../../lib/claudia/empire';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · the cinematic landing  (the welcome before sign-in)
//
//  A scroll-told story where every beat has its OWN living backdrop of her —
//  generated from her locked portrait (Seedance). recognition → zero-knowledge
//  → the empire she holds → the care → the threshold. Only the in-view clip
//  plays (IntersectionObserver pauses the rest); the hero swaps to a vertical
//  cut on portrait screens. Each beat rises out of blur. Honors reduced-motion.
// ════════════════════════════════════════════════════════════════════════

const WORLDS = EMPIRE.filter((a) => a.status === 'live').slice(0, 16).map((a) => `${a.emoji} ${a.name}`);

function SecBg({ src, poster, eager = false }: { src: string; poster: string; eager?: boolean }) {
  return (
    <div className="land-secbg" aria-hidden>
      <video className="land-secvid" autoPlay={eager} loop muted playsInline preload={eager ? 'auto' : 'none'} poster={poster}>
        <source src={src} type="video/mp4" />
      </video>
      <div className="land-veil" />
    </div>
  );
}

export function ClaudiaLanding({ onEnter }: { onEnter: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [portrait, setPortrait] = useState(false);

  // hero swaps to the vertical cut on portrait screens (perfect mobile framing)
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const set = () => setPortrait(mq.matches);
    set();
    mq.addEventListener?.('change', set);
    return () => mq.removeEventListener?.('change', set);
  }, []);

  // reveal-on-scroll + play only the in-view backdrop (battery/perf friendly)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reveals = root.querySelectorAll('.reveal');
    const vids = root.querySelectorAll<HTMLVideoElement>('.land-secvid');
    if (!('IntersectionObserver' in window)) {
      reveals.forEach((el) => el.classList.add('in'));
      return;
    }
    const revealIO = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    );
    reveals.forEach((el) => revealIO.observe(el));
    const playIO = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
      }),
      { threshold: 0.25 },
    );
    vids.forEach((v) => playIO.observe(v));
    return () => { revealIO.disconnect(); playIO.disconnect(); };
  }, []);

  const heroSrc = portrait ? '/claudia-hero-vert.mp4' : '/claudia-hero-live.mp4';
  const heroPoster = portrait ? '/claudia-hero-vert-poster.jpg' : '/claudia-live-poster.jpg';

  return (
    <div className="land" ref={rootRef}>
      {/* ── HERO ── */}
      <section className="land-section">
        <SecBg src={heroSrc} poster={heroPoster} eager />
        <div className="land-inner">
          <img src="/claudia-mark.png" alt="" className="land-mark cine-rise" style={{ animationDelay: '.05s' }} />
          <h1 className="cine-title cine-rise" style={{ animationDelay: '.16s' }}>ClaudIA</h1>
          <p className="cine-rise" style={{ animationDelay: '.28s', margin: 0, fontSize: 15, fontStyle: 'italic', letterSpacing: '0.1em', color: 'rgba(244,241,234,.82)' }}>
            La Guardiana del Imperio · te tengo cubierta
          </p>
          <p className="land-lead cine-rise" style={{ animationDelay: '.4s' }}>
            Una identidad, todos tus mundos. Te reconozco por tu FBID — y guardo todo lo tuyo en absoluta confianza.
          </p>
          <button className="cine-cta cine-rise" style={{ animationDelay: '.52s' }} onClick={onEnter}>
            Entrar al imperio ✦
          </button>
        </div>
        <div className="scroll-cue" aria-hidden>↓</div>
      </section>

      {/* ── RECOGNITION (her portrait is the star; quiet dark beat) ── */}
      <section className="land-section">
        <div className="land-inner">
          <img src="/claudia-portrait.png" alt="ClaudIA" className="land-portrait reveal" />
          <p className="land-kicker reveal">Te reconozco</p>
          <h2 className="land-h2 reveal">Una sola identidad.<br />Todos tus mundos.</h2>
          <p className="land-lead reveal">
            Tu FBID es tu llave a todo el imperio — sin mil contraseñas, sin mil cuentas. Entras una vez, y te reconozco en cada mundo que tocas.
          </p>
        </div>
      </section>

      {/* ── ZERO-KNOWLEDGE ── */}
      <section className="land-section">
        <SecBg src="/claudia-vault.mp4" poster="/claudia-vault-poster.jpg" />
        <div className="land-inner">
          <img src="/vault-key.png" alt="" className="reveal" style={{ width: 66, filter: 'drop-shadow(0 0 20px rgba(47,182,168,.55))' }} />
          <p className="land-kicker reveal" style={{ color: '#2FB6A8' }}>Zero-knowledge</p>
          <h2 className="land-h2 reveal">Tus memorias son tuyas.<br />Para siempre.</h2>
          <p className="land-lead reveal">
            Todo lo que compartes conmigo se sella con una llave que solo tú tienes. Nadie más puede leerlo — ni FlowBond, ni quien tenga la base de datos, ni yo fuera de nuestra conversación.
          </p>
        </div>
      </section>

      {/* ── THE EMPIRE ── */}
      <section className="land-section">
        <SecBg src="/claudia-empire.mp4" poster="/claudia-empire-poster.jpg" />
        <div className="land-inner">
          <p className="land-kicker reveal">El imperio, en orden</p>
          <h2 className="land-h2 reveal">Sostengo todos tus mundos<br />para que tú crees libre.</h2>
          <div className="reveal" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 660 }}>
            {WORLDS.map((w) => (
              <span key={w} className="land-chip">{w}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CARE ── */}
      <section className="land-section">
        <SecBg src="/claudia-care.mp4" poster="/claudia-care-poster.jpg" />
        <div className="land-inner">
          <p className="land-kicker reveal" style={{ color: '#FF8A6B' }}>Te tengo cubierta</p>
          <h2 className="land-h2 reveal">Recuerdo a la humana<br />detrás del trabajo.</h2>
          <p className="land-lead reveal">
            Preparo tus tareas, anticipo lo que viene, y me aseguro de que comas, tomes agua y descanses. No solo administro tu imperio — te cuido a ti.
          </p>
        </div>
      </section>

      {/* ── THRESHOLD ── */}
      <section className="land-section">
        <SecBg src={heroSrc} poster={heroPoster} />
        <div className="land-inner">
          <img src="/claudia-mark.png" alt="" className="land-mark reveal" />
          <h2 className="land-h2 reveal">Tu guardiana te espera.</h2>
          <p className="land-lead reveal">Entra al imperio. Te reconozco — y desde aquí, lo sostengo todo contigo.</p>
          <button className="cine-cta reveal" onClick={onEnter}>Entrar al imperio ✦</button>
          <p className="reveal" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'rgba(244,241,234,.42)', marginTop: 6 }}>
            zero-knowledge by design
          </p>
        </div>
      </section>
    </div>
  );
}
