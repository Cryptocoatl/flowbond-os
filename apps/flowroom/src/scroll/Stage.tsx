import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/motion';

/**
 * A pinned stage.
 *
 * The failure of the first scrolling build was that everything simply moved
 * up the page together, so no argument ever had a beginning or an end. Here a
 * chapter *pins* — the viewport holds still while scroll drives a timeline
 * inside it — and only releases once that chapter has finished saying its
 * piece. Scroll becomes the transport for a film rather than a way to move
 * paper past your eyes.
 *
 * `beats` is how many screen-heights of scroll the chapter consumes. More
 * beats means a slower, more deliberate chapter.
 */
export interface StageProps {
  id: string;
  /** Screen-heights of scroll this chapter consumes while pinned. */
  beats?: number;
  /** Rotated label on the right edge. */
  tab: string;
  accent: string;
  /** Build the scroll-scrubbed timeline. Receives the pinned stage element. */
  timeline?: (stage: HTMLElement, tl: gsap.core.Timeline) => void;
  /** Runs once on enter, for non-scrubbed effects. */
  onEnter?: (stage: HTMLElement) => void;
  /**
   * Raw 0→1 scroll progress for this chapter, every frame. Chapters that
   * lay out their own state machine (a card deck advancing, say) drive it
   * from here rather than from a pile of individually-tweened elements.
   */
  onProgress?: (p: number, stage: HTMLElement) => void;
  /**
   * Reading chapters set this. The whole timeline is compressed into the
   * first third of the chapter's scroll and the rest is dead air, so the
   * content arrives and then *holds perfectly still* while you read it.
   * Text that keeps moving under the eye is the thing that makes a scroll
   * site tiring, and it is why the last pass was still hard to read.
   */
  hold?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function Stage({
  id,
  beats = 2,
  tab,
  accent,
  timeline,
  onEnter,
  onProgress,
  hold = false,
  className = '',
  children,
}: StageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;

    // Reduced motion gets the finished state of every chapter, laid out and
    // readable, with no pinning at all. It is a document, not a broken film.
    if (prefersReducedMotion()) {
      gsap.set(stage.querySelectorAll('[data-in]'), { opacity: 1, y: 0, x: 0, scale: 1 });
      // Give a progress-driven chapter its resting state rather than frame zero.
      onProgress?.(0, stage);
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.65,
          onUpdate: onProgress ? (self) => onProgress(self.progress, stage) : undefined,
          pin: stage,
          pinSpacing: false,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      timeline?.(stage, tl);

      // Everything the chapter does happens in the first third; the remaining
      // two thirds of its scroll are deliberately empty so the reader gets a
      // still page to actually read.
      if (hold && tl.duration() > 0) tl.to({}, { duration: tl.duration() * 2 });

      if (onEnter) {
        ScrollTrigger.create({
          trigger: wrap,
          start: 'top 70%',
          once: true,
          onEnter: () => onEnter(stage),
        });
      }
    }, wrap);

    return () => ctx.revert();
  }, [timeline, onEnter, onProgress, hold]);

  return (
    <section
      ref={wrapRef}
      id={id}
      data-chapter={id}
      data-tab={tab}
      data-accent={accent}
      style={{ height: `${Math.max(1, beats) * 100}svh` }}
      className="relative"
    >
      <div
        ref={stageRef}
        className={`sticky top-0 h-[100svh] w-full overflow-hidden ${className}`}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * Full-bleed photography with scroll-driven movement.
 *
 * The image is always the thing that moves. Type never is — that was the
 * defect the first time, and this is the component that keeps the rule.
 */
export function PhotoLayer({
  src,
  position = 'center',
  dim = 0.55,
  scrim,
  className = '',
}: {
  src: string;
  position?: string;
  dim?: number;
  scrim?: 'left' | 'bottom' | 'full' | 'none';
  className?: string;
}) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <img
        data-photo
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover will-change-transform"
        style={{ objectPosition: position, transform: 'scale(1.18)' }}
        decoding="async"
      />
      {/* Flat dim first so a bright patch in the photograph can never eat a
          word, then the directional scrim on top of that. */}
      <div className="absolute inset-0" style={{ background: `rgb(11 11 12 / ${dim})` }} />
      {scrim && scrim !== 'none' && (
        <div
          className={`absolute inset-0 ${
            scrim === 'left' ? 'u-scrim-l' : scrim === 'bottom' ? 'u-scrim-b' : ''
          }`}
          style={scrim === 'full' ? { background: 'rgb(11 11 12 / 0.5)' } : undefined}
        />
      )}
    </div>
  );
}

/** The rotated chapter tab. Signature element lifted from their deck. */
export function Tab({ label, accent }: { label: string; accent: string }) {
  return (
    <div className="u-tab" style={{ background: accent }}>
      <span style={{ color: 'var(--ink)' }}>{label}</span>
    </div>
  );
}
