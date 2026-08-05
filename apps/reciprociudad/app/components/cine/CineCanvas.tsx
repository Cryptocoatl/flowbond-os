'use client';

import { useEffect, useRef } from 'react';

type Variant = 'embers' | 'cosmos';

/**
 * Cinematic particle field rendered on a <canvas>, sized to its parent.
 * - `embers`: warm golden pollen/embers drifting upward — the reborn city breathing.
 * - `cosmos`: twinkling city-lights + faint dust — the Earth at night.
 * Runs rAF only while on-screen (IntersectionObserver) and is fully disabled
 * under prefers-reduced-motion. Purely decorative (aria-hidden).
 */
export default function CineCanvas({ variant }: { variant: Variant }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parent = canvas.parentElement!;

    const resize = () => {
      const r = parent.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      a: number;
      tw: number;
      tp: number;
      hue: number;
    };

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const isEmber = variant === 'embers';
    const count = isEmber ? 90 : 150;
    let ps: P[] = [];

    const spawn = (initial: boolean): P => {
      if (isEmber) {
        return {
          x: rand(0, w),
          y: initial ? rand(0, h) : h + rand(0, 40),
          vx: rand(-0.12, 0.12),
          vy: rand(-0.55, -0.18),
          r: rand(0.6, 2.6),
          a: rand(0.15, 0.85),
          tw: rand(0.6, 1.6),
          tp: Math.random() * Math.PI * 2,
          hue: rand(38, 50),
        };
      }
      // cosmos: mostly static twinkling points, a few slow drifters
      return {
        x: rand(0, w),
        y: rand(0, h),
        vx: rand(-0.04, 0.04),
        vy: rand(-0.03, 0.03),
        r: rand(0.4, 1.7),
        a: rand(0.1, 0.9),
        tw: rand(0.4, 1.4),
        tp: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.5 ? rand(45, 55) : rand(140, 165),
      };
    };

    const seed = () => {
      ps = Array.from({ length: count }, () => spawn(true));
    };

    let raf = 0;
    let last = performance.now();
    let running = false;

    const tick = (now: number) => {
      const dt = Math.min(50, now - last) / 16.6667;
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of ps) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.tp += 0.03 * p.tw * dt;
        const flick = 0.55 + 0.45 * Math.sin(p.tp);
        if (isEmber) {
          p.x += Math.sin(p.tp * 0.4) * 0.12 * dt;
          if (p.y < -10 || p.x < -20 || p.x > w + 20) Object.assign(p, spawn(false));
        }
        const alpha = p.a * flick;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        const lum = isEmber ? '70%' : '75%';
        g.addColorStop(0, `hsla(${p.hue}, 95%, ${lum}, ${alpha})`);
        g.addColorStop(1, `hsla(${p.hue}, 95%, ${lum}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    seed();
    const ro = new ResizeObserver(() => {
      resize();
      seed();
    });
    ro.observe(parent);

    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? start() : stop()),
      { threshold: 0.01 },
    );
    io.observe(parent);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
    };
  }, [variant]);

  return <canvas ref={ref} className="cine-canvas" aria-hidden="true" />;
}
