'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import JourneyScene from './JourneyScene';
import GlobeThreads from '../cine/GlobeThreads';
import { richKey } from '@/lib/rich';

type Props = { copy: Record<string, string>; media: Record<string, string> };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

/**
 * The immersive scroll-scrubbed journey — "un viaje al futuro ancestral".
 * A pinned WebGL scene (JourneyScene) whose camera flies through five acts as the
 * page scrolls over a tall container; HTML act-copy fades in sync, the globe
 * network ignites over the finale, and the whole thing hands off to the FBID CTA.
 */
export default function Journey({ copy, media }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [act, setAct] = useState(0);
  const [reduce, setReduce] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const r = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduce(r);
    const el = wrapRef.current;
    if (!el) return;

    const onScroll = () => {
      const total = el.offsetHeight - window.innerHeight;
      const top = el.getBoundingClientRect().top;
      const p = clamp01(-top / Math.max(1, total));
      progress.current = p;
      const a = p < 0.13 ? 0 : p < 0.38 ? 1 : p < 0.62 ? 2 : p < 0.86 ? 3 : 4;
      setAct((prev) => (prev === a ? prev : a));
      // Opening frame dissolves into the ancestral code as we descend to the lake.
      if (openRef.current) {
        const gone = smooth((p - 0.02) / 0.12);
        openRef.current.style.opacity = String(1 - gone);
        openRef.current.style.transform = `scale(${1 + gone * 0.22})`;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    const t = setTimeout(() => setReady(true), 700);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      clearTimeout(t);
    };
  }, []);

  return (
    <section className="odyssey" ref={wrapRef} aria-label="Viaje al futuro ancestral">
      <div className="journey-pin">
        <div className="journey-sky" aria-hidden="true" />

        <Canvas
          className="journey-canvas"
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true }}
          camera={{ fov: 52, near: 1, far: 4000, position: [0, 44, 214] }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <Suspense fallback={null}>
              <JourneyScene progress={progress} reduce={reduce} media={media} />
          </Suspense>
        </Canvas>

        {/* Opening frame — the over-built city sinking into the ancestral code,
            guided by the Aztec god toward Tenochtitlan. Dissolves as we descend. */}
        <div className="journey-open" ref={openRef} aria-hidden="true">
          <Image
            src={media['journey.open']}
            alt=""
            fill
            sizes="100vw"
            quality={88}
            priority
            className="journey-open-img"
          />
        </div>

        {/* Network threads ignite over the finale */}
        <div
          className="journey-threads"
          aria-hidden="true"
          style={{ opacity: act >= 3 ? 1 : 0 }}
        >
          <GlobeThreads />
        </div>

        <div className="journey-scrim" aria-hidden="true" />
        <div className="cine-grain" aria-hidden="true" />
        <div className="cine-vignette" aria-hidden="true" />

        {/* Act copy */}
        <div className="journey-acts">
          <Act show={act === 0}>
            <span className="eyebrow">{copy['journey.a0.eyebrow']}</span>
            <h1 className="display-lg">{richKey(copy, 'journey.a0.title')}</h1>
            <p className="journey-lead">{richKey(copy, 'journey.a0.body')}</p>
          </Act>

          <Act show={act === 1}>
            <span className="eyebrow">{copy['journey.a1.eyebrow']}</span>
            <h2 className="display-md">{richKey(copy, 'journey.a1.title')}</h2>
            <p className="journey-lead">{richKey(copy, 'journey.a1.body')}</p>
          </Act>

          <Act show={act === 2}>
            <span className="eyebrow">{copy['journey.a2.eyebrow']}</span>
            <h2 className="display-md">{richKey(copy, 'journey.a2.title')}</h2>
            <p className="journey-lead">{richKey(copy, 'journey.a2.body')}</p>
          </Act>

          <Act show={act === 3}>
            <span className="eyebrow">{copy['journey.a3.eyebrow']}</span>
            <h2 className="display-md">{richKey(copy, 'journey.a3.title')}</h2>
            <p className="journey-lead">{richKey(copy, 'journey.a3.body')}</p>
          </Act>

          <Act show={act === 4}>
            <span className="eyebrow">{copy['journey.a4.eyebrow']}</span>
            <h2 className="display-md">{richKey(copy, 'journey.a4.title')}</h2>
            <p className="journey-lead">{richKey(copy, 'journey.a4.body')}</p>
            <span className="journey-cue" aria-hidden="true">
              {copy['journey.a4.cue']}
            </span>
          </Act>
        </div>

        {/* Intro loader */}
        <div className={`journey-loader${ready ? ' gone' : ''}`} aria-hidden={ready}>
          <Image
            src={media['brand.logo']}
            alt=""
            width={78}
            height={78}
            className="logo-mark journey-seal"
            priority
          />
          <span className="journey-loader-word">{copy['journey.loader']}</span>
        </div>
      </div>
    </section>
  );
}

function Act({ show, children }: { show: boolean; children: React.ReactNode }) {
  return <div className={`act${show ? ' show' : ''}`}>{children}</div>;
}
