import { useCallback, useRef } from 'react';
import Stage, { PhotoLayer, Tab } from './Stage';
import { B } from './RoomContext';

/**
 * A deck of cards advanced by scroll.
 *
 * One card, dead centre of the page, riding over full-bleed photography.
 * Scroll drives a continuous index so cards cross-dissolve into one another
 * instead of snapping.
 *
 * Two things this component has to get right, both learned the hard way:
 *
 *  1. Centering lives INSIDE the inline transform. `transform` is a single
 *     property, so writing translate3d() from JS silently destroys a
 *     `-translate-x-1/2` utility class and the card lands with its corner at
 *     the centre of the screen.
 *  2. Neighbours must fall off fast. Two cards at 50% opacity stacked on the
 *     same point is unreadable ghosting, not depth.
 */
export interface FocusDeckProps {
  id: string;
  tab: string;
  accent: string;
  kicker: string;
  title?: string;
  keys: string[];
  photo?: { src: string; position?: string; dim?: number };
  perCard?: number;
}

export default function FocusDeck({
  id,
  tab,
  accent,
  kicker,
  title,
  keys,
  photo,
  perCard = 0.9,
}: FocusDeckProps) {
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const countRef = useRef<HTMLSpanElement>(null);
  const dotsRef = useRef<HTMLSpanElement[]>([]);

  const onProgress = useCallback(
    (p: number) => {
      const n = keys.length;
      // Head and tail room: the first card is readable before it starts to
      // leave, and the last one lands squarely rather than half gone.
      const pos = Math.max(0, Math.min(n - 1, (p * 1.16 - 0.08) * (n - 1)));

      cardsRef.current.forEach((el, i) => {
        if (!el) return;
        const d = i - pos;
        const a = Math.abs(d);

        // Sharp falloff — only one card is ever legible at a time.
        const vis = Math.max(0, 1 - a * 1.9);
        el.style.opacity = String(vis);
        el.style.visibility = vis <= 0.01 ? 'hidden' : 'visible';
        // The -50%/-50% centering has to be part of this string.
        el.style.transform = `translate3d(calc(-50% + ${d * 3.5}rem), -50%, 0) scale(${1 - a * 0.06})`;
        el.style.zIndex = String(100 - Math.round(a * 10));
        el.style.pointerEvents = a < 0.5 ? 'auto' : 'none';
        el.setAttribute('aria-hidden', a < 0.5 ? 'false' : 'true');
      });

      const active = Math.round(pos);
      if (countRef.current) countRef.current.textContent = String(active + 1).padStart(2, '0');
      dotsRef.current.forEach((d, i) => {
        if (d) d.style.background = i === active ? accent : 'rgb(255 255 255 / 0.22)';
      });
    },
    [keys.length, accent],
  );

  return (
    <Stage
      id={id}
      tab={tab}
      accent={accent}
      beats={Math.max(2.4, keys.length * perCard)}
      onProgress={onProgress}
    >
      {photo ? (
        <PhotoLayer src={photo.src} position={photo.position} dim={photo.dim ?? 0.72} scrim="full" />
      ) : (
        <div className="absolute inset-0 bg-ink" />
      )}
      <Tab label={tab} accent={accent} />

      {/* Header and footer are overlays, so the card can be centred on the
          page itself rather than in whatever space they leave behind. */}
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-20 u-pad pb-0">
        <p className="t-tag mb-2" style={{ color: accent }}>
          {kicker}
        </p>
        {title && (
          <h2 className="t-display max-w-[16ch] text-[clamp(1.3rem,2vh+1vw,2.6rem)] text-white">
            {title}
          </h2>
        )}
      </header>

      {/* The card. Centred on the stage, sized from the frame. */}
      <div className="absolute inset-0 z-10">
        {keys.map((k, i) => (
          <div
            key={k}
            ref={(el) => {
              if (el) cardsRef.current[i] = el;
            }}
            className="focus-card absolute left-1/2 top-1/2"
            style={{
              width: 'min(92vw, 44rem)',
              transform: 'translate3d(-50%, -50%, 0)',
              opacity: i === 0 ? 1 : 0,
              visibility: i === 0 ? 'visible' : 'hidden',
            }}
          >
            <div
              className="overflow-hidden p-5 md:p-7"
              style={{
                background: 'rgb(13 7 22 / 0.94)',
                border: '1px solid var(--hair)',
                borderTop: `4px solid ${accent}`,
                boxShadow: '0 24px 80px rgb(0 0 0 / 0.55)',
                backdropFilter: 'blur(6px)',
                maxHeight: 'min(56svh, 30rem)',
              }}
            >
              <B k={k} accent={accent} anim={false} />
            </div>
          </div>
        ))}
      </div>

      <footer className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex items-center gap-3 u-pad pb-14 pt-0">
        <span className="t-display shrink-0 text-[1.05rem]" style={{ color: accent }}>
          <span ref={countRef}>01</span>
          <span className="opacity-45"> / {String(keys.length).padStart(2, '0')}</span>
        </span>
        <span className="flex flex-1 items-center gap-1.5">
          {keys.map((k, i) => (
            <span
              key={k}
              ref={(el) => {
                if (el) dotsRef.current[i] = el;
              }}
              className="h-[3px] flex-1 transition-colors duration-200"
              style={{ background: i === 0 ? accent : 'rgb(255 255 255 / 0.22)' }}
            />
          ))}
        </span>
      </footer>
    </Stage>
  );
}
