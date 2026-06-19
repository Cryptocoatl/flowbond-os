import { cookies } from 'next/headers';
import { DICT } from './dict';
import { LANG_COOKIE, DEFAULT_LOCALE, normalizeLocale, type Locale } from './config';

// Server-component side of i18n. Reads the locale cookie and returns a `t()`
// bound to it — identical resolution to the client provider so server-rendered
// pages and client islands speak the same language.
export async function getLocale(): Promise<Locale> {
  try {
    const c = await cookies();
    return normalizeLocale(c.get(LANG_COOKIE)?.value);
  } catch {
    return DEFAULT_LOCALE;
  }
}

function interpolate(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function tFor(locale: Locale) {
  return (s: string, vars?: Record<string, string | number>) =>
    interpolate(locale === 'en' ? s : DICT[locale]?.[s] ?? s, vars);
}

/** Server-component translator: `const t = await getT();` then `t('Hello')`. */
export async function getT() {
  const locale = await getLocale();
  return tFor(locale);
}
