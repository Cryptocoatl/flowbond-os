import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Coarse pointer OR small viewport OR low core count — all get the light path. */
export const isLightDevice = () =>
  window.matchMedia('(max-width: 820px)').matches ||
  window.matchMedia('(pointer: coarse)').matches ||
  (navigator.hardwareConcurrency ?? 8) <= 4;

let lenis: Lenis | null = null;

export function initSmoothScroll(): Lenis | null {
  if (prefersReducedMotion() || lenis) return lenis;

  lenis = new Lenis({
    duration: 1.05,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    // Native momentum on touch beats anything we can fake, and it costs no frames.
    syncTouch: false,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function destroySmoothScroll() {
  lenis?.destroy();
  lenis = null;
  ScrollTrigger.getAll().forEach((t) => t.kill());
}

/**
 * The house reveal. One shape, used everywhere, so the room reads as composed
 * rather than as a pile of separately-animated components.
 */
export function revealOnScroll(el: Element, opts: { delay?: number; y?: number } = {}) {
  if (prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { opacity: 0, y: opts.y ?? 26 },
    {
      opacity: 1,
      y: 0,
      duration: 1.1,
      delay: opts.delay ?? 0,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    },
  );
}

export { gsap, ScrollTrigger };
