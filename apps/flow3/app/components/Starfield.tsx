'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number; // depth 0..1 — drives size, speed, brightness
  tw: number; // twinkle phase
}

interface Shooter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

// Full-viewport canvas starfield: parallax drift, twinkle, occasional
// shooting star. Sits fixed behind everything (z-index 0).
export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let stars: Star[] = [];
    let shooters: Shooter[] = [];
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(420, Math.floor((w * h) / 4200));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const frame = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        // slow parallax drift, deeper stars move slower
        s.x += 0.012 + s.z * 0.05;
        if (s.x > w + 2) s.x = -2;

        const twinkle = 0.55 + 0.45 * Math.sin(t / 900 + s.tw);
        const r = 0.3 + s.z * 1.3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${200 + s.z * 55}, ${205 + s.z * 40}, 255, ${
          (0.25 + s.z * 0.6) * twinkle
        })`;
        ctx.fill();
      }

      // occasional shooting star
      if (Math.random() < 0.0035 && shooters.length < 2) {
        shooters.push({
          x: Math.random() * w * 0.8,
          y: Math.random() * h * 0.35,
          vx: 7 + Math.random() * 5,
          vy: 2.5 + Math.random() * 2,
          life: 1,
        });
      }
      shooters = shooters.filter((sh) => sh.life > 0);
      for (const sh of shooters) {
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life -= 0.018;
        const grad = ctx.createLinearGradient(
          sh.x,
          sh.y,
          sh.x - sh.vx * 9,
          sh.y - sh.vy * 9,
        );
        grad.addColorStop(0, `rgba(255,255,255,${0.85 * sh.life})`);
        grad.addColorStop(1, 'rgba(139,92,246,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x - sh.vx * 9, sh.y - sh.vy * 9);
        ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden
    />
  );
}
