'use client';
// HudMenu — the overflow drawer for the top bar.
//
// The HUD used to sit seven pills wide in the top-right corner. On a 390px
// phone that flex-wraps across the whole screen, straight over the world name
// on the left and the objective card underneath. So the bar now keeps only
// what you touch mid-mission (party · worlds · build) and everything else —
// avatar, voice, language, quality, VR, the debug log — lives here.
import { useEffect, useRef } from 'react';

export function HudMenu({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  // Escape closes; the backdrop handles taps. Keys are also the game's input,
  // so this listens on keydown capture and stops nothing else.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Tap-away. Transparent, but it must eat the tap so it does not turn
          into a camera drag on the world behind. */}
      <div className="pointer-events-auto fixed inset-0 z-[60]" onPointerDown={onClose} />
      <div
        ref={panel}
        className="hud-panel pointer-events-auto fixed z-[61] w-[16.5rem] max-w-[calc(100vw-1.25rem)] animate-fade-up overflow-y-auto p-3"
        style={{
          top: 'var(--hud-row2)',
          right: 'var(--hud-r)',
          maxHeight: 'calc(100dvh - var(--hud-row2) - var(--hud-b))',
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="eyebrow">{title}</span>
          <button onClick={onClose} className="text-sm text-kai-muted hud-tap" aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="space-y-2">{children}</div>
      </div>
    </>
  );
}

/** A labelled row of controls inside the drawer. */
export function HudMenuRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2">
      <div className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-kai-faint">{label}</div>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

/** A full-width action inside the drawer. */
export function HudMenuAction({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="hud-tap flex w-full items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-left text-[13px] text-kai-text disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** A segmented choice (quality, language) inside the drawer. */
export function HudSegment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex w-full gap-1 rounded-full border border-white/10 bg-black/40 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded-full px-2 py-1.5 text-[12px] transition-colors ${
            value === o.id ? 'bg-kai-gold/20 font-semibold text-kai-gold' : 'text-kai-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
