"use client";

// @flowbond/i18n — the shared interface-translation layer for the FlowBond
// stack. Dictionary-driven (English source of truth + graceful fallback),
// 10 languages, RTL-aware. Apps wrap their tree in <I18nProvider> and call
// useT(). Mirrors the self-contained copy that lives in the FlowMe repo.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { DICT, LANGS, RTL, translate, type Lang } from "./dictionaries";

const COOKIE = "fb_lang";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

const SUPPORTED = new Set(LANGS.map((l) => l.code));

export function I18nProvider({
  initialLang = "en",
  hadCookie = true,
  children,
}: {
  initialLang?: Lang;
  hadCookie?: boolean;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    if (hadCookie) return;
    const guess = navigator.language?.slice(0, 2).toLowerCase();
    if (guess && SUPPORTED.has(guess as Lang) && guess !== lang) {
      setLangState(guess as Lang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL.includes(lang) ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.cookie = `${COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
export function useT() {
  return useContext(I18nContext).t;
}

export function LanguageSelect({ variant = "fixed" }: { variant?: "fixed" | "inline" }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: variant === "fixed" ? "fixed" : "relative",
        top: variant === "fixed" ? "max(14px, env(safe-area-inset-top))" : undefined,
        insetInlineEnd: variant === "fixed" ? 14 : undefined,
        zIndex: 60,
      }}
    >
      <button onClick={() => setOpen((v) => !v)} aria-label={t("lang.label")} style={btn}>
        <span aria-hidden style={{ fontSize: 15 }}>{current.flag}</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{current.code.toUpperCase()}</span>
        <span aria-hidden style={{ opacity: 0.5, fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div role="listbox" style={menu}>
          {LANGS.map((l) => (
            <button
              key={l.code}
              role="option"
              aria-selected={l.code === lang}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{ ...item, background: l.code === lang ? "rgba(124,77,255,0.14)" : "transparent" }}
            >
              <span aria-hidden style={{ fontSize: 15 }}>{l.flag}</span>
              <span style={{ flex: 1, textAlign: "start" }}>{l.label}</span>
              {l.code === lang && <span style={{ color: "var(--accent, #7c4dff)" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 11px",
  borderRadius: 999, border: "1px solid var(--line, rgba(255,255,255,0.12))",
  background: "var(--surface, rgba(255,255,255,0.06))", color: "var(--ink, inherit)",
  cursor: "pointer", backdropFilter: "blur(8px)",
};
const menu: React.CSSProperties = {
  position: "absolute", top: "calc(100% + 6px)", insetInlineEnd: 0, minWidth: 180,
  maxHeight: "60vh", overflowY: "auto", background: "var(--surface, #1b1b22)",
  border: "1px solid var(--line, rgba(255,255,255,0.12))", borderRadius: 14, padding: 6,
  boxShadow: "0 24px 60px -24px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", gap: 2,
};
const item: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 11px",
  borderRadius: 9, border: "none", cursor: "pointer", color: "var(--ink, inherit)", fontSize: 14,
};

export { LANGS, RTL, DICT, translate, type Lang };
