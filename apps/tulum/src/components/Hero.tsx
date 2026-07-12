"use client";
// Hero — fireflies canvas + coin3d tilt with live specular, ported 1:1.
// Optional hero-ambient.mp4 layer lights itself when the file exists.
import { useEffect, useRef } from "react";
import VideoSlot from "@/components/VideoSlot";

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coinRef = useRef<HTMLDivElement>(null);
  const specRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---------- fireflies ----------
    const cv = canvasRef.current;
    const cx = cv?.getContext("2d");
    let raf = 0;
    let W = 0;
    let H = 0;
    const rs = () => {
      if (!cv) return;
      W = cv.width = cv.offsetWidth;
      H = cv.height = cv.offsetHeight;
    };
    const P = Array.from({ length: 46 }, () => ({
      x: Math.random() * 1600, y: Math.random() * 1000,
      r: Math.random() * 1.8 + 0.5, a: Math.random() * Math.PI * 2,
      s: Math.random() * 0.3 + 0.08, tw: Math.random() * Math.PI * 2,
      gold: Math.random() > 0.15,
    }));
    const draw = () => {
      if (!cx) return;
      cx.clearRect(0, 0, W, H);
      for (const p of P) {
        p.a += 0.004; p.tw += 0.03;
        p.x += Math.cos(p.a) * p.s;
        p.y += Math.sin(p.a * 1.3) * p.s * 0.8;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        const o = 0.25 + 0.45 * Math.abs(Math.sin(p.tw));
        cx.beginPath();
        cx.arc(p.x, p.y, p.r, 0, 7);
        cx.fillStyle = p.gold ? `rgba(246,220,158,${o})` : `rgba(127,219,255,${o * 0.8})`;
        cx.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    addEventListener("resize", rs);
    rs();
    draw();

    // ---------- coin 3D tilt + live specular ----------
    const c3 = coinRef.current;
    const spec = specRef.current;
    const hv = c3?.parentElement;
    const move = (e: PointerEvent) => {
      if (!c3 || !spec) return;
      const b = c3.getBoundingClientRect();
      const px = (e.clientX - b.left) / b.width;
      const py = (e.clientY - b.top) / b.height;
      const rx = (py - 0.5) * -14;
      const ry = (px - 0.5) * 16;
      c3.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      spec.style.setProperty("--sx", px * 100 + "%");
      spec.style.setProperty("--sy", py * 100 + "%");
    };
    const leave = () => {
      if (!c3 || !spec) return;
      c3.style.transform = "rotateX(0) rotateY(0)";
      spec.style.setProperty("--sx", "30%");
      spec.style.setProperty("--sy", "25%");
    };
    if (!reduced && hv) {
      hv.addEventListener("pointermove", move);
      hv.addEventListener("pointerleave", leave);
    }
    return () => {
      removeEventListener("resize", rs);
      cancelAnimationFrame(raf);
      hv?.removeEventListener("pointermove", move);
      hv?.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <header className="hero" id="top">
      <VideoSlot src="/assets/hero-ambient.mp4" layer dim />
      <canvas id="fireflies" ref={canvasRef} aria-hidden="true" />
      <div>
        <h1>
          EL JAGUAR<br /><span className="au">DESPIERTA</span>
        </h1>
        <div className="tagline">Tulumcoin DAO · El token regenerativo</div>
        <p className="thesis">
          Una moneda comunitaria que hace circular el valor dentro de Tulum y convierte cada
          acción restaurativa en fondo regenerativo — propuesto y votado por la misma comunidad.
          <span className="en">
            A community currency that circulates value inside Tulum and turns every restorative
            action into a regenerative fund — proposed and voted by the community itself.
          </span>
        </p>
        <div className="hero-ctas">
          <a className="btn-oro" href="#verify">Verificar mi OG</a>
          <a className="btn-ghost" href="#refi">El movimiento ReFi</a>
        </div>
      </div>
      <div className="hero-visual">
        <div className="halo" aria-hidden="true" />
        <div className="aro" aria-hidden="true" />
        <div
          className="coin3d float"
          ref={coinRef}
          role="img"
          aria-label="La moneda Tulum Coin — jaguar maya en oro"
        >
          <div className="c coin-el" />
          <div className="spec" ref={specRef} />
          <div className="eye-spark" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
