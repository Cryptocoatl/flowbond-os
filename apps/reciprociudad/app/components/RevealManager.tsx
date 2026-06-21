'use client';

import { useEffect } from 'react';

/**
 * Lazy reveal — mirrors the reference's IntersectionObserver: any element with
 * the `reveal` class fades/slides in once it enters the viewport. Mounted once
 * at the page root so section components stay pure server markup.
 * Respects prefers-reduced-motion (CSS already shows `.reveal` statically).
 */
export default function RevealManager() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (reduce) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
