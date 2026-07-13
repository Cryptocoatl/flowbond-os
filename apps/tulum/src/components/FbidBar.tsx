"use client";
// FBID session. Primary path is email + password (signInWithPassword) — instant,
// no round-trip. Fallback for anyone without a password is a MAGIC LINK that
// redirects back to this same origin (emailRedirectTo), where supabase-js picks
// up the token and the session lands — no 6-digit code (those weren't arriving).
// auth.uid() is the soulbound FBID root the RPCs and edge function key on.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { humaneError } from "@/lib/errors";

type Mode = "password" | "link";

export default function FbidBar({ onSession }: { onSession?: (uid: string | null) => void }) {
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

  if (uid) {
    return (
      <div className="fbid-bar">
        <span>Tu FBID soulbound</span>
        <span className="mono">{uid}</span>
        <button className="fbid-btn" onClick={() => supabase.auth.signOut()}>Salir</button>
      </div>
    );
  }

  return (
    <div className="fbid-bar">
      {mode === "password" ? (
        <>
          <span>Entra con tu FBID — tu correo y contraseña</span>
          <input
            type="email" placeholder="tu@correo.com" value={email} autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password" placeholder="contraseña" value={password} autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && email && password && signInPassword()}
          />
          <button className="fbid-btn" disabled={!email || !password || stage === "busy"} onClick={signInPassword}>
            {stage === "busy" ? "Entrando…" : "Entrar"}
          </button>
          <button
            className="fbid-link"
            onClick={() => { setMode("link"); setStage("idle"); setMsg(""); }}
          >
            ¿Sin contraseña? Envíame un enlace mágico →
          </button>
        </>
      ) : (
        <>
          <span>Te enviamos un enlace mágico a tu correo — sin contraseña</span>
          {stage !== "sent" ? (
            <>
              <input
                type="email" placeholder="tu@correo.com" value={email} autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && email && sendMagicLink()}
              />
              <button className="fbid-btn" disabled={!email || stage === "busy"} onClick={sendMagicLink}>
                {stage === "busy" ? "Enviando…" : "Enviar enlace"}
              </button>
            </>
          ) : (
            <button className="fbid-btn" onClick={sendMagicLink}>
              Reenviar enlace
            </button>
          )}
          <button
            className="fbid-link"
            onClick={() => { setMode("password"); setStage("idle"); setMsg(""); }}
          >
            ← Entrar con contraseña
          </button>
        </>
      )}
      {msg && <span style={{ width: "100%" }}>{msg}</span>}
    </div>
  );
}
