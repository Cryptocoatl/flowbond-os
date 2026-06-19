'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../../lib/i18n/provider';
import { LOCALES, LOCALE_LABELS, type Locale } from '../../lib/i18n/config';
import { browserClient } from '../../lib/supabase';

// Globe language picker. Sets the locale (cookie + reload so server-rendered
// pages switch too) and, when signed in, remembers the choice on the profile so
// it follows the user across devices.
export default function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function choose(l: Locale) {
    setOpen(false);
    if (l === locale) return;
    // best-effort: persist to profile (ignored if not signed in / column absent)
    browserClient().rpc('set_my_lang', { lang: l }).then(() => {}, () => {});
    setLocale(l); // writes cookie + reloads
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          compact
            ? 'flex items-center gap-1 text-[#9698a8] active:scale-90 transition'
            : 'flex items-center gap-1.5 text-sm text-[#9698a8] hover:text-[#cfc8e8] transition'
        }
        aria-label="Language"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
        </svg>
        <span className="uppercase text-xs tracking-wide">{locale}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 min-w-[9rem] rounded-xl border border-white/10 bg-[#11121d] shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden z-[70]">
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => choose(l)}
              className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between hover:bg-white/[0.05] ${
                l === locale ? 'text-[#e3c07a]' : 'text-[#cfc8e8]'
              }`}
            >
              {LOCALE_LABELS[l]}
              {l === locale && <span className="text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
