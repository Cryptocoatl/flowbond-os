'use client';
// MobileJoystick — on-screen thumbstick for touch. Reports a normalized vector
// (-1..1) via onMove; returns to center on release. Hidden on pointer:fine.
import { useRef, useState } from 'react';

export function MobileJoystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef(false);

  const R = 46; // base radius px

  function handle(clientX: number, clientY: number) {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, R);
    dx = (dx / len) * clamped;
    dy = (dy / len) * clamped;
    setKnob({ x: dx, y: dy });
    onMove(dx / R, dy / R);
  }

  return (
    <div
      ref={base}
      className="pointer-events-auto absolute bottom-8 left-8 h-[104px] w-[104px] touch-none rounded-full border border-white/15 bg-black/30 backdrop-blur-md md:hidden"
      onPointerDown={(e) => {
        active.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        handle(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => active.current && handle(e.clientX, e.clientY)}
      onPointerUp={() => {
        active.current = false;
        setKnob({ x: 0, y: 0 });
        onMove(0, 0);
      }}
      onPointerCancel={() => {
        active.current = false;
        setKnob({ x: 0, y: 0 });
        onMove(0, 0);
      }}
    >
      <div
        className="absolute left-1/2 top-1/2 h-11 w-11 rounded-full border border-white/25 bg-white/15"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
