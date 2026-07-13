'use client';

// ════════════════════════════════════════════════════════════════════════
//  /rotation lock 3 — TOTP step-up (Supabase native MFA → AAL2)
//
//  First visit: enroll an authenticator (QR + manual secret), verify a code.
//  Every later visit: just the 6-digit code. Verifying upgrades the session
//  to AAL2; the server gate re-checks the claim on reload — the plan never
//  renders at AAL1, even for a valid stolen session cookie.
// ════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { browserClient } from '../../lib/supabase';

type Phase = 'loading' | 'enroll' | 'verify' | 'error';

export default function StepUp() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [factorId, setFactorId] = useState('');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const sb = browserClient();
      const { data, error } = await sb.auth.mfa.listFactors();
      if (error) { setErr(error.message); setPhase('error'); return; }

      // data.totp holds only VERIFIED factors; half-enrollments live in data.all.
      const verified = data.totp[0];
      if (verified) { setFactorId(verified.id); setPhase('verify'); return; }

      // Clear stale half-enrollments, then enroll fresh.
      for (const f of data.all.filter((f) => f.factor_type === 'totp' && f.status === 'unverified')) {
        await sb.auth.mfa.unenroll({ factorId: f.id });
      }
      const enr = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ClaudIA Guardiana' });
      if (enr.error) { setErr(enr.error.message); setPhase('error'); return; }
      setFactorId(enr.data.id);
      setQr(enr.data.totp.qr_code);
      setSecret(enr.data.totp.secret);
      setPhase('enroll');
    })();
  }, []);

  async function submit() {
    if (code.length < 6 || busy) return;
    setBusy(true); setErr('');
    const sb = browserClient();
    const ch = await sb.auth.mfa.challenge({ factorId });
    if (ch.error) { setErr(ch.error.message); setBusy(false); return; }
    const ver = await sb.auth.mfa.verify({ factorId, challengeId: ch.data.id, code });
    if (ver.error) { setErr('Código incorrecto — intenta de nuevo.'); setBusy(false); setCode(''); return; }
    try { sessionStorage.setItem('rotation-stepup-at', String(Date.now())); } catch { /* ignore */ }
    window.location.reload(); // server gate re-reads the (now AAL2) session
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-8">
      <div className="max-w-sm w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur">
        <div className="text-3xl mb-3 text-center">🛡️</div>
        <h1 className="text-lg font-semibold text-amber-200 mb-1 text-center">Segundo factor</h1>

        {phase === 'loading' && <p className="text-sm text-slate-400 text-center mt-4">Preparando…</p>}
        {phase === 'error' && <p className="text-sm text-rose-400 text-center mt-4">{err}</p>}

        {phase === 'enroll' && (
          <>
            <p className="text-sm text-slate-400 mb-4 text-center">
              Escanea con tu app autenticadora (1Password, Google Authenticator…). Solo esta vez.
            </p>
            {qr && (
              <div className="bg-white rounded-xl p-3 mb-3 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR TOTP" className="w-44 h-44" />
              </div>
            )}
            <p className="text-[11px] text-slate-500 break-all mb-4 text-center">
              Manual: <span className="font-mono text-slate-400">{secret}</span>
            </p>
          </>
        )}

        {phase === 'verify' && (
          <p className="text-sm text-slate-400 mb-4 text-center">
            Código de 6 dígitos de tu autenticadora.
          </p>
        )}

        {(phase === 'enroll' || phase === 'verify') && (
          <>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              inputMode="numeric"
              placeholder="······"
              className="w-full text-center tracking-[0.5em] text-xl font-mono rounded-xl bg-slate-950 border border-slate-700 py-3 mb-3 focus:border-amber-400 outline-none"
              autoFocus
            />
            {err && <p className="text-xs text-rose-400 mb-2 text-center">{err}</p>}
            <button
              onClick={submit}
              disabled={busy || code.length < 6}
              className="w-full rounded-xl bg-amber-400/90 text-slate-950 font-medium py-2.5 hover:bg-amber-300 transition disabled:opacity-40"
            >
              {busy ? 'Verificando…' : 'Abrir la puerta'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
