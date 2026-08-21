'use client';
// useQuality — one dial for how expensive the world is to draw.
//
// The scene was tuned on a laptop: 1.75× pixel ratio, a 2048² shadow map, a
// real-time reflective water plane and a full bloom pass. That is a slideshow
// on a phone, and a phone is where kids play. So every expensive thing now
// reads its budget from a tier, the tier is detected once from the device and
// can be overridden by hand, and a live FPS watchdog drops the pixel ratio if
// the guess was too generous.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type QualityPref = 'auto' | 'alto' | 'medio' | 'bajo';
export type QualityTier = 'alto' | 'medio' | 'bajo';

export interface Quality {
  tier: QualityTier;
  /** [min, max] device pixel ratio handed to the canvas. */
  dpr: [number, number];
  shadows: boolean;
  shadowMap: number;
  bloom: boolean;
  /** MSAA samples inside the effect composer (0 = off). */
  msaa: number;
  /** real-time mirrored water (the single most expensive thing in the scene). */
  reflections: boolean;
  /** 0..1 multiplier applied to particle and scatter counts. */
  density: number;
  /** draw distance; a phone does not need to see 900m of fog. */
  far: number;
}

export const TIERS: Record<QualityTier, Quality> = {
  alto: { tier: 'alto', dpr: [1, 2], shadows: true, shadowMap: 2048, bloom: true, msaa: 4, reflections: true, density: 1, far: 900 },
  medio: { tier: 'medio', dpr: [1, 1.5], shadows: true, shadowMap: 1024, bloom: true, msaa: 0, reflections: false, density: 0.6, far: 600 },
  bajo: { tier: 'bajo', dpr: [0.85, 1.15], shadows: false, shadowMap: 512, bloom: false, msaa: 0, reflections: false, density: 0.35, far: 420 },
};

export const QUALITY_LABEL: Record<QualityPref, { es: string; en: string }> = {
  auto: { es: 'Auto', en: 'Auto' },
  alto: { es: 'Alta', en: 'High' },
  medio: { es: 'Media', en: 'Medium' },
  bajo: { es: 'Ligera', en: 'Light' },
};

const KEY = 'kai.quality.v1';

/**
 * A first guess, made once. Deliberately conservative on touch devices: a
 * too-light world that runs at 60fps is a better first impression than a
 * pretty one that stutters, and the player can raise it from the menu.
 */
function detect(): QualityTier {
  if (typeof window === 'undefined') return 'medio';
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency ?? (coarse ? 4 : 8);
  // Chromium-only; absent on Safari, so it never decides on its own.
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const tiny = Math.min(window.innerWidth, window.innerHeight) < 380;

  if (coarse) {
    if (tiny || cores <= 4 || (mem !== undefined && mem <= 3)) return 'bajo';
    return 'medio';
  }
  if (cores >= 8 && (mem === undefined || mem >= 8)) return 'alto';
  return 'medio';
}

export function useQualityPref() {
  const [pref, setPref] = useState<QualityPref>('auto');
  const [detected, setDetected] = useState<QualityTier>('medio');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDetected(detect());
    try {
      const raw = localStorage.getItem(KEY) as QualityPref | null;
      if (raw === 'auto' || raw === 'alto' || raw === 'medio' || raw === 'bajo') setPref(raw);
    } catch {
      /* privacy mode */
    }
    setReady(true);
  }, []);

  const choose = useCallback((p: QualityPref) => {
    setPref(p);
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* ignore */
    }
  }, []);

  const tier: QualityTier = pref === 'auto' ? detected : pref;
  return { pref, tier, detected, quality: TIERS[tier], choose, ready };
}

/** Read the active budget from inside the scene graph. */
export const QualityContext = createContext<Quality>(TIERS.medio);
export const useQuality = () => useContext(QualityContext);

/** Scale a count by the tier, never below 1 when the original was non-zero. */
export const scaled = (n: number, q: Quality) => (n <= 0 ? 0 : Math.max(1, Math.round(n * q.density)));
