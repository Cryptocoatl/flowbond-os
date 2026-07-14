"use client";
// Intro — la apertura épica. Steph's golden-coin film on a deep-dark ground.
// The coin's own black is screen-blended into the near-black background so there
// is NO visible video box/frame — only the coin glows out of the darkness. Tap
// to enter plays it WITH sound, then it pushes through into the site.
//   gate ("toca para entrar") → tap → coin plays with sound → ended/tap → site.
// prefers-reduced-motion never mounts it (CSS #intro{display:none} backstops SSR).
import { useEffect, useRef, useState } from "react";

export default function Intro() {
  const [phase, setPhase] = useState<"gate" | "playing" | "done" | "gone">("gate");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setPhase("gone");
  }, []);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => setPhase("gone"), 1600);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  function enter() {
    const v = videoRef.current;
    if (!v) { setPhase("done"); return; }
    setPhase("playing");
    v.muted = false;
    v.volume = 1;
    // the tap is the gesture that unlocks audio; if playback still fails, enter anyway
    v.play().catch(() => setPhase("done"));
  }

  return (
    <div
      id="intro"
      className={phase === "done" ? "done" : undefined}
      title={phase === "gate" ? "Toca para entrar" : "Toca para saltar"}
      onClick={() => (phase === "gate" ? enter() : setPhase("done"))}
    >
      <div className="intro-stage">
        <video
          ref={videoRef}
          className="intro-coin"
          src="/assets/intro-opening.mp4"
          preload="auto"
          playsInline
          onEnded={() => setPhase("done")}
          onError={() => setPhase("done")}
        />
      </div>
      {phase === "gate" && (
        <div className="intro-word">
          <span className="disp">El jaguar despierta</span>
          <span className="skip">toca para entrar · con sonido 🔊</span>
          <button
            className="intro-skip"
            onClick={(e) => { e.stopPropagation(); setPhase("done"); }}
          >
            saltar intro
          </button>
        </div>
      )}
    </div>
  );
}
