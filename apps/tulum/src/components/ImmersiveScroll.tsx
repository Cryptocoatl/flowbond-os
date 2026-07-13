"use client";
// ImmersiveScroll — the regenerative-Tulum film as a scroll-driven experience.
// Steph's CapCut footage, cleaned (audio + burned-in subtitles removed), plays
// as a pinned full-bleed background whose currentTime is driven by scroll, so
// each caption lands on exactly the scene it describes. Reduced-motion / iOS
// where seek stutters falls back to a muted autoplay loop with cross-fading
// captions. Text is ours — Spanish first, matching the site's voice.
import { useEffect, useRef, useState } from "react";

type Cap = { start: number; end: number; es: string; en: string };

// windows aligned to the re-cut film (nature/cleanup full pace, developments 2×, 30fps)
const CAPS: Cap[] = [
  { start: 0.0, end: 2.5, es: "Proteger y rescatar la vida", en: "Protecting and rescuing life" },
  { start: 2.5, end: 5.6, es: "Cuidar el agua, cerrar el ciclo de los residuos", en: "Caring for water, closing the waste loop" },
  { start: 5.6, end: 8.8, es: "Devolverle su valor a la naturaleza", en: "Restoring the value of nature" },
  { start: 8.8, end: 12.83, es: "Una comunidad organizada y descentralizada", en: "An organized, decentralized community" },
  { start: 12.83, end: 16.83, es: "puede ser la punta de flecha que inspire al mundo", en: "can be the arrowhead that inspires the world" },
  { start: 16.83, end: 22.5, es: "Donde la naturaleza encuentra la tecnología", en: "Where nature meets technology" },
  { start: 22.5, end: 99, es: "TulumCoin le da voz a los proyectos que regeneran", en: "TulumCoin gives voice to the projects that regenerate" },
];

const DUR = 26.7; // seconds of footage (re-cut)

export default function ImmersiveScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    // Only true reduced-motion falls back — the blob load below makes seeking
    // fully local, so scroll-scrubbing is smooth on phones too (portrait rendition).
    const fallback = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(fallback);

    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const isMobile = window.innerWidth <= 760;
    const rendition = isMobile ? "/assets/tulum-scroll-sm.mp4" : "/assets/tulum-scroll.mp4";
    video.poster = isMobile ? "/assets/tulum-scroll-poster-sm.webp" : "/assets/tulum-scroll-poster.webp";
    let objectUrl: string | null = null;

    // ---- caption index from a time (shared by both modes) ----
    const capAt = (t: number) => {
      for (let i = CAPS.length - 1; i >= 0; i--) if (t >= CAPS[i].start) return i;
      return 0;
    };

    // ---- FALLBACK: muted autoplay loop, captions cross-fade on scroll ----
    if (fallback) {
      video.src = rendition;
      video.load();
      video.muted = true;
      video.loop = true;
      video.play().catch(() => {});
      const onScroll = () => {
        const rect = section.getBoundingClientRect();
        const total = section.offsetHeight - window.innerHeight;
        const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
        setActive(capAt(p * DUR));
      };
      onScroll();
      addEventListener("scroll", onScroll, { passive: true });
      return () => removeEventListener("scroll", onScroll);
    }

    // ---- SCRUB: currentTime eased toward scroll target ----
    video.muted = true;
    video.pause();

    // Load the whole film as a blob → a local object URL is fully seekable, so
    // scrubbing is frame-accurate across the timeline without depending on the
    // host serving HTTP range requests (Cloudflare Pages doesn't, reliably).
    // Fetch only when the section is near; fall back to progressive src on error.
    let loadTriggered = false;
    const loadBlob = () => {
      if (loadTriggered) return;
      loadTriggered = true;
      fetch(rendition)
        .then((r) => r.blob())
        .then((b) => { objectUrl = URL.createObjectURL(b); video.src = objectUrl; video.load(); })
        .catch(() => { video.src = rendition; video.load(); });
    };
    const loadIO = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { loadBlob(); loadIO.disconnect(); } },
      { rootMargin: "1200px 0px" }
    );
    loadIO.observe(section);

    let target = 0;
    let current = 0;
    let raf = 0;
    let running = false;
    let seeking = false;
    let lastCap = -1;

    video.addEventListener("seeking", () => { seeking = true; });
    video.addEventListener("seeked", () => { seeking = false; });

    const measure = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
      target = p * DUR;
    };

    const tick = () => {
      current += (target - current) * 0.14;
      if (Math.abs(target - current) < 0.004) current = target;
      // coalesce seeks: only issue a new one once the last finished, always
      // toward the freshest `current`, so frames stay locked to the captions
      if (!seeking && video.readyState >= 1 && Math.abs(video.currentTime - current) > 0.03) {
        try { video.currentTime = current; } catch { /* not seekable yet */ }
      }
      // caption tracks the frame actually on screen (video.currentTime), not the
      // scroll target — so text always matches what's shown, even mid-seek
      const ci = capAt(video.readyState >= 1 ? video.currentTime : current);
      if (ci !== lastCap) { lastCap = ci; setActive(ci); }
      if (running) raf = requestAnimationFrame(tick);
    };

    const start = () => { if (!running) { running = true; raf = requestAnimationFrame(tick); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? start() : stop()),
      { threshold: 0 }
    );
    io.observe(section);
    addEventListener("scroll", measure, { passive: true });
    addEventListener("resize", measure);
    measure();

    return () => {
      io.disconnect();
      loadIO.disconnect();
      removeEventListener("scroll", measure);
      removeEventListener("resize", measure);
      stop();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  return (
    <section className="immersive" ref={sectionRef} aria-label="Tulum se regenera — experiencia inmersiva">
      <div className="immersive-stage">
        <video
          ref={videoRef}
          className="immersive-video"
          poster="/assets/tulum-scroll-poster.webp"
          preload="auto"
          muted
          playsInline
          disablePictureInPicture
        />
        <div className="immersive-scrim" aria-hidden="true" />
        <div className="immersive-vignette" aria-hidden="true" />

        <div className="immersive-kicker">
          <span className="greca-mark" aria-hidden="true">◆</span>
          Tulum se regenera
        </div>

        <div className={"immersive-hint" + (active === 0 ? " on" : "")} aria-hidden="true">
          <span>desliza para vivir la regeneración</span>
          <span className="chev" />
        </div>

        <div className="immersive-caps">
          {CAPS.map((c, i) => (
            <figure key={i} className={"immersive-cap" + (i === active ? " on" : "")} aria-hidden={i !== active}>
              <span className="cap-es">{c.es}</span>
              <span className="cap-en">{c.en}</span>
            </figure>
          ))}
        </div>

        <div className={"immersive-progress" + (reduced ? " hidden" : "")} aria-hidden="true">
          {CAPS.map((_, i) => (
            <span key={i} className={i <= active ? "on" : undefined} />
          ))}
        </div>
      </div>
    </section>
  );
}
