'use client';
import { createContext, useContext, useCallback, useState } from 'react';
import { DICT } from './dict';
import { LANG_COOKIE, DEFAULT_LOCALE, type Locale } from './config';

// Client-side locale context. `t('English source')` returns the Spanish (or
// future-locale) string, falling back to the English source so nothing is ever
// blank. Simple {var} interpolation supported.
interface Ctx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (s: string, vars?: Record<string, string | number>) => string;
}

const LocaleCtx = createContext<Ctx | null>(null);

function interpolate(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function translate(locale: Locale, s: string, vars?: Record<string, string | number>) {
  const hit = locale === 'en' ? s : DICT[locale]?.[s] ?? s;
  return interpolate(hit, vars);
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    // Persist a year; path=/ so every route sees it. Reload so SERVER
    // components (pages rendered on the server) re-render in the new language.
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    try {
      localStorage.setItem(LANG_COOKIE, l);
    } catch {
      /* ignore */
    }
    window.location.reload();
  }, []);

  const t = useCallback(
    (s: string, vars?: Record<string, string | number>) => translate(locale, s, vars),
    [locale],
  );

  return <LocaleCtx.Provider value={{ locale, setLocale, t }}>{children}</LocaleCtx.Provider>;
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleCtx);
  if (!ctx) {
    // Defensive: if a component renders outside the provider, fall back to EN
    // identity so the UI still shows text rather than crashing.
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (s, vars) => translate(DEFAULT_LOCALE, s, vars),
    };
  }
  return ctx;
}

/** Convenience hook returning just the translator. */
export function useT() {
  return useLocale().t;
}
