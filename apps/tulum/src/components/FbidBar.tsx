"use client";
// FBID session. TWO ways in, both reliable on mobile:
//   • Código por correo (default): we email an 8-digit code (Supabase OTP over
//     Resend SMTP); you type it here → verifyOtp → session. No cross-browser
//     magic-link redirect to break on a phone.
//   • Contraseña: signInWithPassword for anyone who set one.
// auth.uid() is the soulbound FBID root the RPCs and worker key on.
//
// Two faces: a full login PANEL when signed out (the gate to the whole verify
// flow) and a compact identity CHIP when signed in. The panel carries id
// "fbid-login" so a locked wallet card can scroll the user straight to it.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { humaneError } from "@/lib/errors";

type Mode = "code" | "password";
type Stage = "idle" | "busy" | "sent";

type Intro = { panelId?: string; eyebrow: string; title: string; blurb: React.ReactNode };
const DEFAULT_INTRO: Intro = {
  eyebrow: "Entra con tu FBID",
  title: "Tu identidad soulbound",
  blurb: (
    <>
      Tu FBID es tu raíz de identidad en FlowBond. Entra con tu correo.
      <span className="en"> Sign in with your email — your soulbound FBID.</span>
    </>
  ),
};

export default function FbidBar(
  { onSession, intro = DEFAULT_INTRO }: { onSession?: (uid: string | null) => void; intro?: Intro },
) {
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<Mode>("code");
  const [stage, setStage] = useState<Stage>("idle");
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

  const cleanEmail = () => email.trim().toLowerCase();

  // ---- email OTP: send an 8-digit code ----
  async function sendCode() {
    if (!cleanEmail()) return;
    setStage("busy"); setMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail(),
      options: { shouldCreateUser: true }, // no emailRedirectTo → OTP code, not a link
    });
    if (error) { setMsg(humaneError(error)); setStage("idle"); return; }
    setCode("");
    setMsg(`Te enviamos un código de 8 dígitos a ${cleanEmail()}. · We emailed you an 8-digit code.`);
    setStage("sent");
  }

  // ---- email OTP: verify the code the user typed ----
  async function verifyCode() {
    const token = code.replace(/\s/g, "");
    if (token.length < 6) { setMsg("Escribe el código completo. · Enter the full code."); return; }
    setStage("busy"); setMsg("");
    const { error } = await supabase.auth.verifyOtp({ email: cleanEmail(), token, type: "email" });
    if (error) { setMsg("Código incorrecto o expirado. · Wrong or expired code."); setStage("sent"); return; }
    // onAuthStateChange lands the session and flips this to the chip.
  }

  // ---- password ----
  async function signInPassword() {
    setStage("busy"); setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail(), password });
    if (error) { setMsg("Correo o contraseña no coinciden. · Email or password didn't match."); setStage("idle"); return; }
    setMsg(""); setStage("idle");
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

  const busy = stage === "busy";

  // ---- signed out: the login panel (the gate to verification) ----
  return (
    <div className="fbid-login" id={intro.panelId}>
      <div className="fbid-login-head">
        <span className="eyebrow">{intro.eyebrow}</span>
        <h3>{intro.title}</h3>
        <p>{intro.blurb}</p>
      </div>

      {mode === "code" ? (
        stage !== "sent" ? (
          // step 1 — enter email, request a code
          <form className="fbid-form" onSubmit={(e) => { e.preventDefault(); if (cleanEmail() && !busy) sendCode(); }}>
            <input
              type="email" placeholder="tu@correo.com" value={email} autoComplete="email" inputMode="email"
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="fbid-btn primary" type="submit" disabled={!cleanEmail() || busy}>
              {busy ? "Enviando…" : "Enviarme un código"}
            </button>
            <button type="button" className="fbid-link"
              onClick={() => { setMode("password"); setStage("idle"); setMsg(""); }}>
              Tengo contraseña →
            </button>
          </form>
        ) : (
          // step 2 — enter the 8-digit code
          <form className="fbid-form" onSubmit={(e) => { e.preventDefault(); if (!busy) verifyCode(); }}>
            <input
              type="text" placeholder="8 dígitos" value={code}
              inputMode="numeric" autoComplete="one-time-code" maxLength={8} pattern="[0-9]*"
              style={{ letterSpacing: "0.4em", textAlign: "center", fontSize: "1.15em" }}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              autoFocus
            />
            <button className="fbid-btn primary" type="submit" disabled={code.length < 6 || busy}>
              {busy ? "Entrando…" : "Entrar"}
            </button>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button" className="fbid-link" onClick={sendCode} disabled={busy}>
                Reenviar código
              </button>
              <button type="button" className="fbid-link"
                onClick={() => { setStage("idle"); setCode(""); setMsg(""); }}>
                Cambiar correo
              </button>
            </div>
          </form>
        )
      ) : (
        // password mode
        <form className="fbid-form" onSubmit={(e) => { e.preventDefault(); if (cleanEmail() && password && !busy) signInPassword(); }}>
          <input
            type="email" placeholder="tu@correo.com" value={email} autoComplete="email" inputMode="email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password" placeholder="contraseña" value={password} autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="fbid-btn primary" type="submit" disabled={!cleanEmail() || !password || busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <button type="button" className="fbid-link"
            onClick={() => { setMode("code"); setStage("idle"); setMsg(""); }}>
            ← Entrar con código por correo
          </button>
        </form>
      )}

      {msg && <p className="fbid-msg">{msg}</p>}
    </div>
  );
}
