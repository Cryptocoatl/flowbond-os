"use client";
// FBID session. Primary path is email + password (signInWithPassword) — instant,
// no round-trip. Fallback for anyone without a password is a MAGIC LINK that
// redirects back to this same origin (emailRedirectTo), where supabase-js picks
// up the token and the session lands — no 6-digit code (those weren't arriving).
// auth.uid() is the soulbound FBID root the RPCs and edge function key on.
//
// Two faces: a full login PANEL when signed out (the gate to the whole verify
// flow) and a compact identity CHIP when signed in. The panel carries id
// "fbid-login" so a locked wallet card can scroll the user straight to it.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { humaneError } from "@/lib/errors";

type Mode = "password" | "link";

type Intro = { panelId?: string; eyebrow: string; title: string; blurb: React.ReactNode };
const DEFAULT_INTRO: Intro = {
  eyebrow: "Entra con tu FBID",
  title: "Tu identidad soulbound",
  blurb: (
    <>
      Tu FBID es tu raíz de identidad en FlowBond. Entra una vez con tu correo.
      <span className="en"> Sign in once with your email — your soulbound FBID.</span>
    </>
  ),
};

export default function FbidBar(
  { onSession, intro = DEFAULT_INTRO }: { onSession?: (uid: string | null) => void; intro?: Intro },
) {
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("password");
  const [stage, setStage] = useState<"idle" | "sent" | "busy">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const id = session?.user.id ?? null;
      setUid(id);
      onSession?.(id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const id = session?.user.id ?? null;
      setUid(id);
      onSession?.(id);
    });
    return () => sub.subscription.unsubscribe();
  }, [onSession]);

  async function signInPassword() {
    setStage("busy"); setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg("Correo o contraseña no coinciden. · Email or password didn't match.");
      setStage("idle");
      return;
    }
    setMsg(""); setStage("idle");
  }

  async function sendMagicLink() {
    setStage("busy"); setMsg("");
    // include the path so it exactly matches an allowlisted callback (/, /admin)
    const redirect = typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect, shouldCreateUser: true },
    });
    if (error) { setMsg(humaneError(error)); setStage("idle"); return; }
    setMsg("Te enviamos un enlace mágico — ábrelo desde este dispositivo y entrarás solo. · Check your inbox for a magic link.");
    setStage("sent");
  }

  // ---- signed in: compact identity chip ----
  if (uid) {
    const short = `${uid.slice(0, 8)}…${uid.slice(-4)}`;
    return (
      <div className="fbid-chip">
        <span className="fbid-dot" aria-hidden="true" />
        <span className="fbid-chip-label">FBID conectado</span>
        <span className="mono" title={uid}>{short}</span>
        <button className="fbid-link" onClick={() => supabase.auth.signOut()}>Salir</button>
      </div>
    );
  }

  // ---- signed out: the login panel (the gate to verification) ----
  return (
    <div className="fbid-login" id={intro.panelId}>
      <div className="fbid-login-head">
        <span className="eyebrow">{intro.eyebrow}</span>
        <h3>{intro.title}</h3>
        <p>{intro.blurb}</p>
      </div>

      {mode === "password" ? (
        <form
          className="fbid-form"
          onSubmit={(e) => { e.preventDefault(); if (email && password && stage !== "busy") signInPassword(); }}
        >
          <input
            type="email" placeholder="tu@correo.com" value={email} autoComplete="email" inputMode="email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password" placeholder="contraseña" value={password} autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="fbid-btn primary" type="submit" disabled={!email || !password || stage === "busy"}>
            {stage === "busy" ? "Entrando…" : "Entrar"}
          </button>
          <button type="button" className="fbid-link"
            onClick={() => { setMode("link"); setStage("idle"); setMsg(""); }}>
            ¿Sin contraseña? Envíame un enlace mágico →
          </button>
        </form>
      ) : (
        <div className="fbid-form">
          {stage !== "sent" ? (
            <>
              <input
                type="email" placeholder="tu@correo.com" value={email} autoComplete="email" inputMode="email"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && email && sendMagicLink()}
              />
              <button className="fbid-btn primary" disabled={!email || stage === "busy"} onClick={sendMagicLink}>
                {stage === "busy" ? "Enviando…" : "Enviar enlace mágico"}
              </button>
            </>
          ) : (
            <button className="fbid-btn primary" onClick={sendMagicLink}>Reenviar enlace</button>
          )}
          <button type="button" className="fbid-link"
            onClick={() => { setMode("password"); setStage("idle"); setMsg(""); }}>
            ← Entrar con contraseña
          </button>
        </div>
      )}

      {msg && <p className="fbid-msg">{msg}</p>}
    </div>
  );
}
