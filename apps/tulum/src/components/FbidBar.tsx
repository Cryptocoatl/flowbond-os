"use client";
// FBID session — email OTP (no password, no redirect allowlist). auth.uid()
// is the soulbound FBID root the RPCs and edge function key on.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { humaneError } from "@/lib/errors";

export default function FbidBar({ onSession }: { onSession?: (uid: string | null) => void }) {
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
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

  async function sendCode() {
    setStage("busy"); setMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) { setMsg(humaneError(error)); setStage("idle"); return; }
    setMsg("Te enviamos un código de 6 dígitos — revisa tu correo. · Check your inbox for a 6-digit code.");
    setStage("sent");
  }

  async function confirmCode() {
    setStage("busy"); setMsg("");
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      setMsg("Ese código no abrió la puerta — revisa los 6 dígitos o pide otro. · That code didn't work, try again.");
      setStage("sent");
      return;
    }
    setMsg(""); setStage("idle");
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
      <span>Entra con tu FBID — tu correo, sin contraseña</span>
      {stage !== "sent" ? (
        <>
          <input
            type="email" placeholder="tu@correo.com" value={email} autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && email && sendCode()}
          />
          <button className="fbid-btn" disabled={!email || stage === "busy"} onClick={sendCode}>
            {stage === "busy" ? "Enviando…" : "Enviar código"}
          </button>
        </>
      ) : (
        <>
          <input
            inputMode="numeric" placeholder="código de 6 dígitos" value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && code.length >= 6 && confirmCode()}
          />
          <button className="fbid-btn" disabled={code.length < 6} onClick={confirmCode}>Entrar</button>
        </>
      )}
      {msg && <span style={{ width: "100%" }}>{msg}</span>}
    </div>
  );
}
