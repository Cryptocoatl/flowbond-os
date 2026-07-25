'use client';
// useProgress — the player's journey across the seven worlds. Sequential mission
// completion per world + total XP, persisted in localStorage. Moves to the DB
// (kai_players / kai_proofs) once FBID auth is wired in-game.
import { useCallback, useEffect, useState } from 'react';

const KEY = 'kai.siete.progress.v1';

export interface Progress {
  /** completed mission count per world id (current mission = this index). */
  done: Record<string, number>;
  xp: number;
  world: string;
  lang: 'es' | 'en';
}

const DEFAULT: Progress = { done: {}, xp: 0, world: 'selva', lang: 'es' };

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(DEFAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProgress({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {
      /* SSR / privacy mode */
    }
    setReady(true);
  }, []);

  const persist = useCallback((p: Progress) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, []);

  const completeMission = useCallback(
    (worldId: string, xp: number) => {
      setProgress((p) => {
        const next: Progress = {
          ...p,
          done: { ...p.done, [worldId]: (p.done[worldId] ?? 0) + 1 },
          xp: p.xp + xp,
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setWorld = useCallback(
    (worldId: string) => {
      setProgress((p) => {
        const next = { ...p, world: worldId };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setLang = useCallback(
    (lang: 'es' | 'en') => {
      setProgress((p) => {
        const next = { ...p, lang };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { progress, ready, completeMission, setWorld, setLang };
}
