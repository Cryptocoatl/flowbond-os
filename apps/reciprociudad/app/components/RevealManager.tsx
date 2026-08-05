'use client';

import { useEffect } from 'react';

/**
 * Lazy reveal — any `.reveal` element rises/fades in as it scrolls into view.
 * Bulletproof by design: a scroll/resize pass reveals every element whose top
 * has crossed 88% of the viewport, and it NEVER leaves text stuck invisible —
 * on reduced-motion, missing APIs, or any error it reveals everything at once,
 * and a safety timeout guarantees nothing stays hidden.
 * Respects prefers-reduced-motion (CSS shows `.reveal` statically too).
 */
export default function RevealManager() {
  useEffect(() => {
    let els: HTMLElement[] = [];
    try {
      els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    } catch {
      return;
    }

    const revealAll = () => els.forEach((el) => el.classList.add('in'));

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      revealAll();
      return;
    }

    const pass = () => {
      const h = window.innerHeight;
      els = els.filter((el) => {
        if (el.getBoundingClientRect().top < h * 0.88) {
          el.classList.add('in');
          return false;
        }
        return true;
      });
      if (!els.length) {
        window.removeEventListener('scroll', pass);
        window.removeEventListener('resize', pass);
      }
    };

    pass();
    window.addEventListener('scroll', pass, { passive: true });
    window.addEventListener('resize', pass);
    // Safety net: whatever happens, no copy stays invisible.
    const safety = setTimeout(revealAll, 2600);

    return () => {
      window.removeEventListener('scroll', pass);
      window.removeEventListener('resize', pass);
      clearTimeout(safety);
    };
  }, []);

  return null;
}
