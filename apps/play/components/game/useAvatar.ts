'use client';
// useAvatar — persists the player's Ready Player Me avatar GLB url. localStorage
// today; moves to the DB (kai_players.avatar_url) once FBID auth is wired.
import { useCallback, useEffect, useState } from 'react';

const KEY = 'kai.avatarUrl';

export function useAvatar() {
  const [url, setUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setUrl(localStorage.getItem(KEY));
    } catch {
      /* SSR / privacy mode */
    }
    setReady(true);
  }, []);

  const save = useCallback((u: string) => {
    try {
      localStorage.setItem(KEY, u);
    } catch {
      /* ignore */
    }
    setUrl(u);
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setUrl(null);
  }, []);

  return { url, ready, save, clear };
}
