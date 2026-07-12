"use client";
// Intro — el jaguar despierta. Awakening plays at var(--eye-x/--eye-y)
// (tokens.css is the single source of truth). Tap skips; auto-dismiss 5.8s;
// prefers-reduced-motion never mounts it (CSS #intro{display:none} backstops SSR).
import { useEffect, useState } from "react";

export default function Intro() {
  const [phase, setPhase] = useState<"play" | "done" | "gone">("play");

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("gone");
      return;
    }
    const t = setTimeout(() => setPhase((p) => (p === "play" ? "done" : p)), 5800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => setPhase("gone"), 1600);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      id="intro"
      className={phase === "done" ? "done" : undefined}
      aria-hidden="true"
      title="Toca para entrar"
      onClick={() => setPhase("done")}
    >
      <div className="coin-stage">
        <div className="c coin-el" />
        <div className="sweep" />
        <div className="awaken-eye" />
        <div className="pulse p1" />
        <div className="pulse p2" />
      </div>
      <div className="intro-word">
        <span className="disp">El jaguar despierta</span>
        <span className="skip">toca para entrar</span>
      </div>
    </div>
  );
}
