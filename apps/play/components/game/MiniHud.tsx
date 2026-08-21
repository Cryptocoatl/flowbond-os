'use client';
// MiniHud — the navigation instruments from the old kai.flowbond.life, reborn in
// the new design: a live compass rose (heading + a needle to the nearest
// objective) and a north-up minimap (player + objective dots). Both read the
// shared runtime each frame via rAF and mutate the DOM directly (no re-renders).
import { useEffect, useRef } from 'react';
import { input, playerPos } from './runtime';

export interface HudTarget {
  x: number;
  z: number;
  done: boolean;
}

const DEG = 180 / Math.PI;
const clamp1 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function MiniHud({
  targets,
  color,
  lang,
  compact = false,
}: {
  targets: HudTarget[];
  color: string;
  lang: 'es' | 'en';
  /** phone / landscape: shrink the instruments and drop the caption. */
  compact?: boolean;
}) {
  const targetsRef = useRef<HudTarget[]>(targets);
  targetsRef.current = targets;

  const roseRef = useRef<SVGGElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const headingRef = useRef<SVGTextElement>(null);
  const playerRef = useRef<SVGGElement>(null);
  const dotsWrapRef = useRef<SVGGElement>(null);
  const dotEls = useRef<SVGCircleElement[]>([]);

  // (re)build minimap dots when the target count changes
  useEffect(() => {
    const wrap = dotsWrapRef.current;
    if (!wrap) return;
    wrap.replaceChildren();
    dotEls.current = targets.map(() => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', '2.6');
      wrap.appendChild(c);
      return c;
    });
  }, [targets.length]);

  useEffect(() => {
    let raf = 0;
    const R = 90; // world radius mapped onto the minimap
    const mm = 26; // minimap half-size in svg units
    const rose = ['N', 'E', 'S', 'O'];
    const tick = () => {
      const yaw = input.yaw;
      const yawDeg = yaw * DEG;

      // compass: rose counter-rotates so N stays true-north; heading readout
      if (roseRef.current) roseRef.current.setAttribute('transform', `rotate(${yawDeg})`);
      if (headingRef.current) {
        const h = ((-yawDeg % 360) + 360) % 360;
        const idx = Math.round(h / 90) % 4;
        headingRef.current.textContent = `${Math.round(h)}° ${rose[idx]}`;
      }

      // nearest uncollected objective → needle + minimap emphasis
      let best = -1;
      let bestD = Infinity;
      const ts = targetsRef.current;
      for (let i = 0; i < ts.length; i++) {
        if (ts[i].done) continue;
        const d = Math.hypot(ts[i].x - playerPos.x, ts[i].z - playerPos.z);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (needleRef.current) {
        if (best >= 0) {
          const ang = Math.atan2(ts[best].x - playerPos.x, -(ts[best].z - playerPos.z)) * DEG; // world → screen north-up
          needleRef.current.setAttribute('transform', `rotate(${ang})`);
          needleRef.current.style.opacity = '1';
        } else {
          needleRef.current.style.opacity = '0';
        }
      }

      // minimap: player fixed at center, facing = yaw; dots relative to player
      if (playerRef.current) playerRef.current.setAttribute('transform', `rotate(${yawDeg})`);
      for (let i = 0; i < dotEls.current.length; i++) {
        const t = ts[i];
        const el = dotEls.current[i];
        if (!t || !el) continue;
        const dx = clamp1((t.x - playerPos.x) / R) * mm;
        const dz = clamp1((t.z - playerPos.z) / R) * mm;
        el.setAttribute('cx', String(dx));
        el.setAttribute('cy', String(dz));
        el.setAttribute('fill', t.done ? '#ffffff33' : i === best ? '#ffffff' : color);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [color]);

  // The instruments used to be absolutely positioned at `right-3 top-24` —
  // exactly where the zoom buttons also sat, so on every screen the compass
  // and the 🔍 controls drew on top of each other. They are now a plain block
  // that the HUD's right rail stacks, and the rail owns the position.
  const dial = compact ? 'h-16 w-16' : 'h-24 w-24';
  const map = compact ? 'h-16 w-16' : 'h-28 w-28';

  return (
    <div className="pointer-events-none flex flex-col items-end gap-1.5">
      {/* compass */}
      <svg viewBox="-50 -50 100 100" className={`${dial} drop-shadow`}>
        <circle cx="0" cy="0" r="46" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        <g ref={roseRef}>
          <line x1="0" y1="-44" x2="0" y2="44" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <line x1="-44" y1="0" x2="44" y2="0" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <text x="0" y="-34" textAnchor="middle" fill="#F4C25A" fontSize="12" fontWeight="700">N</text>
          <text x="36" y="4" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10">E</text>
          <text x="0" y="42" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10">S</text>
          <text x="-36" y="4" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10">O</text>
        </g>
        {/* needle to nearest objective (screen-space, north-up) */}
        <g ref={needleRef}>
          <polygon points="0,-30 5,0 0,8 -5,0" fill={color} />
        </g>
        <circle cx="0" cy="0" r="3" fill="#fff" />
        <text ref={headingRef} x="0" y="30" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600">0° N</text>
      </svg>

      {/* minimap */}
      <svg viewBox="-30 -30 60 60" className={`${map} drop-shadow`}>
        <rect x="-29" y="-29" width="58" height="58" rx="8" fill="rgba(0,0,0,0.42)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <circle cx="0" cy="0" r="27" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <g ref={dotsWrapRef} />
        <g ref={playerRef}>
          <polygon points="0,-4 3,4 -3,4" fill="#F4C25A" />
        </g>
      </svg>
      {!compact && (
        <div className="rounded-full bg-black/40 px-2 py-0.5 text-[9px] text-kai-faint backdrop-blur-md">
          {lang === 'es' ? 'brújula · mapa' : 'compass · map'}
        </div>
      )}
    </div>
  );
}
