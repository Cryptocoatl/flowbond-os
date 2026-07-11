'use client';

import { useEffect, useRef } from 'react';

/**
 * Bioluminescent particle field (canvas, GPU-friendly: one rAF loop, no DOM churn).
 * mode 'drift' — slow ambient float; 'rush' — particles pulled to center
 * (the gate-opening "energy field parting"). Honors prefers-reduced-motion
 * by rendering a static sparse field once.
 */
export default function Particles({ mode = 'drift' }: { mode?: 'drift' | 'rush' }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const COLORS = ['46,139,110', '201,162,39', '14,75,77', '127,217,192'];
    const N = reduced ? 26 : Math.min(70, Math.floor((w * h) / 16000));
    const ps = Array.from({ length: N }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -0.04 - Math.random() * 0.14,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      tw: Math.random() * Math.PI * 2,
    }));

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        const a = 0.25 + 0.55 * Math.abs(Math.sin(p.tw + t / 1600));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.c},${a})`;
        ctx.shadowColor = `rgba(${p.c},0.8)`;
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    if (reduced) {
      draw(0);
      const onR = () => {
        resize();
        draw(0);
      };
      window.addEventListener('resize', onR);
      return () => window.removeEventListener('resize', onR);
    }

    let raf = 0;
    const step = (t: number) => {
      for (const p of ps) {
        if (modeRef.current === 'rush') {
          const dx = w / 2 - p.x;
          const dy = h * 0.46 - p.y;
          p.x += dx * 0.045;
          p.y += dy * 0.045;
        } else {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -6) {
            p.y = h + 6;
            p.x = Math.random() * w;
          }
          if (p.x < -6) p.x = w + 6;
          if (p.x > w + 6) p.x = -6;
        }
      }
      draw(t);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="of-particles" aria-hidden="true" />;
}
