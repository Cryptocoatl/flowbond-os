'use client';
// useViewport — the two facts the HUD actually needs about the screen it is
// drawn on: is this a thumb (coarse pointer) and is there room for the full
// desktop rails. Everything else (safe-area insets, rail scale) lives in CSS
// so it can react without a re-render; these two decide *which components
// exist* — an icon-only top bar instead of seven wrapping pills, a joystick
// instead of a keyboard hint — which CSS alone cannot do.
import { useEffect, useState } from 'react';

export interface Viewport {
  /** finger-driven: touch phones and tablets, and desktops in touch mode. */
  touch: boolean;
  /** narrow screen → the top bar collapses into icons + an overflow menu. */
  compact: boolean;
  /** landscape phone: almost no vertical room, hide anything optional. */
  short: boolean;
  /** true until the first client measurement, so SSR/hydration match. */
  pending: boolean;
}

const INITIAL: Viewport = { touch: false, compact: false, short: false, pending: true };

export function useViewport(): Viewport {
  const [vp, setVp] = useState<Viewport>(INITIAL);

  useEffect(() => {
    const read = () =>
      setVp({
        touch: window.matchMedia('(pointer: coarse)').matches,
        compact: window.innerWidth < 820,
        short: window.innerHeight < 460,
        pending: false,
      });
    read();
    const mqs = [
      window.matchMedia('(pointer: coarse)'),
      window.matchMedia('(max-width: 819px)'),
      window.matchMedia('(max-height: 459px)'),
    ];
    mqs.forEach((m) => m.addEventListener('change', read));
    window.addEventListener('resize', read);
    window.addEventListener('orientationchange', read);
    return () => {
      mqs.forEach((m) => m.removeEventListener('change', read));
      window.removeEventListener('resize', read);
      window.removeEventListener('orientationchange', read);
    };
  }, []);

  return vp;
}
