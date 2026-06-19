// AstralFlow i18n — English source strings, Spanish (and future locales) via a
// dictionary keyed by the English string itself. Locale lives in the `af_lang`
// cookie so BOTH server and client components resolve the same language.
export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LANG_COOKIE = 'af_lang';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

export function isLocale(v: string | undefined | null): v is Locale {
  return v === 'en' || v === 'es';
}

export function normalizeLocale(v: string | undefined | null): Locale {
  if (isLocale(v)) return v;
  // accept browser tags like "es-MX"
  if (v && v.toLowerCase().startsWith('es')) return 'es';
  return DEFAULT_LOCALE;
}
