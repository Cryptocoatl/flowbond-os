'use client';
// MobileJoystick — the left thumb.
//
// Two things were wrong with the old one on a real phone. It was anchored at a
// flat `bottom-8 left-8`, so on an iPhone the home indicator sat through it;
// and its 104px base was pinned in place, so a thumb that landed 20px off got
// nothing. Now it reads the safe-area insets, and the whole lower-left corner
// is a live zone: press anywhere in it and the stick appears under your thumb.
import { useRef, useState } from 'react';

export function MobileJoystick({
  onMove,
  compact = false,
}: {
  onMove: (x: number, y: number) => void;
  /** landscape phone — less vertical room, smaller stick. */
  compact?: boolean;
}) {
  const zone = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const pointerId = useRef<number | null>(null);

  const R = compact ? 38 : 48; // travel radius, px
  const base = R * 2 + 12; // visible ring diameter

  function handle(clientX: number, clientY: number, o: { x: number; y: number }) {
    let dx = clientX - o.x;
    let dy = clientY - o.y;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, R);
    dx = (dx / len) * clamped;
    dy = (dy / len) * clamped;
    setKnob({ x: dx, y: dy });
    onMove(dx / R, dy / R);
  }

  function release() {
    pointerId.current = null;
    setOrigin(null);
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  }

  return (
    <div
      ref={zone}
      className="pointer-events-auto absolute touch-none select-none"
      style={{
        left: 0,
        bottom: 0,
        // A generous corner, but not so wide it swallows the taps meant for
        // the world (looking around still works everywhere else).
        width: `min(45vw, ${base + 96}px)`,
        height: `min(38vh, ${base + 88}px)`,
        paddingLeft: 'var(--hud-l)',
        paddingBottom: 'var(--hud-b)',
      }}
      onPointerDown={(e) => {
        if (pointerId.current !== null) return;
        pointerId.current = e.pointerId;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const o = { x: e.clientX, y: e.clientY };
        setOrigin(o);
        handle(e.clientX, e.clientY, o);
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== pointerId.current || !origin) return;
        handle(e.clientX, e.clientY, origin);
      }}
      onPointerUp={(e) => e.pointerId === pointerId.current && release()}
      onPointerCancel={(e) => e.pointerId === pointerId.current && release()}
    >
      {/* Resting home, so the control is discoverable before it is touched. */}
      <div
        className="absolute rounded-full border border-white/15 bg-black/25 backdrop-blur-md transition-opacity"
        style={{
          left: 'calc(var(--hud-l) + 0.25rem)',
          bottom: 'calc(var(--hud-b) + 0.25rem)',
          height: base,
          width: base,
          opacity: origin ? 0 : 0.85,
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 rounded-full border border-white/25 bg-white/15"
          style={{ height: R, width: R, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* Live stick, drawn wherever the thumb landed. */}
      {origin && (
        <div
          className="fixed rounded-full border border-white/25 bg-black/35 backdrop-blur-md"
          style={{ left: origin.x - base / 2, top: origin.y - base / 2, height: base, width: base }}
        >
          <div
            className="absolute left-1/2 top-1/2 rounded-full border border-white/35 bg-white/25"
            style={{ height: R, width: R, transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
          />
        </div>
      )}
    </div>
  );
}
