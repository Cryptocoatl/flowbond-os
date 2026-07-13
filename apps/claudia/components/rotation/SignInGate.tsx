'use client';

// /rotation lock 1 — no session: bounce through the FBID hub.
import { hubRedirect } from '@flowbond/auth';

export default function SignInGate() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-8">
      <div className="max-w-sm w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center backdrop-blur">
        <div className="text-3xl mb-3">🔐</div>
        <h1 className="text-lg font-semibold text-amber-200 mb-2">Rotación de llaves</h1>
        <p className="text-sm text-slate-400 mb-6">
          Primera cerradura: tu sesión FlowBond.
        </p>
        <button
          onClick={() => hubRedirect('claudia', `${window.location.origin}/auth/callback?next=/rotation`)}
          className="w-full rounded-xl bg-amber-400/90 text-slate-950 font-medium py-2.5 hover:bg-amber-300 transition"
        >
          Entrar con FBID
        </button>
      </div>
    </main>
  );
}
