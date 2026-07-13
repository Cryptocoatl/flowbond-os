'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · Rotación de llaves — cockpit  (behind 3 server-side locks)
//
//  One card per key, in order. Each card: provider deep-link, the 5-step
//  golden loop as checkboxes, warnings, and the exact LOCAL command for the
//  vault step (copy button). Values never touch this page.
//
//  Progress lives in localStorage on Steph's machine (metadata only) — the
//  local runbook ~/.claudia/key-rotation-runbook.md stays the source of
//  truth; ClaudIA reconciles both.
//
//  Re-lock: after 15 min without a fresh TOTP, the plan blurs and a new
//  6-digit code is required (challenge on the already-enrolled factor).
// ════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { browserClient } from '../../lib/supabase';
import type { StepId } from '../../lib/rotation/plan';

// The PLAN never ships in this (public) client bundle — it arrives as props
// from the server component, which only renders us after all three locks.
export interface CockpitItem {
  id: string;
  session: number;
  project: string;
  key: string;
  provider: string;
  providerUrl: string;
  steps: StepId[];
  deploy?: string[];
  verify?: string;
  warn?: string;
  selfGenerated?: boolean;
  cmd: string;
}
export interface CockpitProps {
  plan: CockpitItem[];
  parked: { id: string; reason: string }[];
  sessionTitles: Record<number, string>;
}

const STEP_LABEL: Record<StepId, string> = {
  created: '1 · Nueva llave creada en el proveedor (la vieja sigue viva)',
  deployed: '2 · Deploys actualizados (Vercel env / wrangler secret)',
  verified: '3 · App viva verificada',
  vaulted: '4 · Guardada en el vault local (prompt silencioso)',
  revoked: '5 · Llave vieja revocada en el proveedor',
};

const STORE = 'claudia-rotation-v1';
const RELOCK_MS = 15 * 60 * 1000;

type Progress = Record<string, StepId[]>;

function loadProgress(): Progress {
  try { return JSON.parse(localStorage.getItem(STORE) ?? '{}'); } catch { return {}; }
}

export default function RotationCockpit({ plan, parked, sessionTitles }: CockpitProps) {
  const [progress, setProgress] = useState<Progress>({});
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    const at = Number(sessionStorage.getItem('rotation-stepup-at') ?? 0);
    setLocked(Date.now() - at > RELOCK_MS);
    setReady(true);
    const t = setInterval(() => {
      const ts = Number(sessionStorage.getItem('rotation-stepup-at') ?? 0);
      if (Date.now() - ts > RELOCK_MS) setLocked(true);
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  const toggle = (id: string, step: StepId) => {
    setProgress((prev) => {
      const cur = new Set(prev[id] ?? []);
      cur.has(step) ? cur.delete(step) : cur.add(step);
      const next = { ...prev, [id]: [...cur] as StepId[] };
      try { localStorage.setItem(STORE, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const doneCount = useMemo(
    () => plan.filter((i) => i.steps.every((s) => (progress[i.id] ?? []).includes(s))).length,
    [progress, plan],
  );
  const nextId = useMemo(
    () => plan.find((i) => !i.steps.every((s) => (progress[i.id] ?? []).includes(s)))?.id,
    [progress, plan],
  );

  if (!ready) return null;
  if (locked) return <ReLock onUnlocked={() => setLocked(false)} />;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 px-4 py-10 md:px-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-amber-200">Rotación de llaves</h1>
          <p className="text-sm text-slate-400 mt-1">
            {doneCount}/{plan.length} llaves rotadas · una a la vez · nunca revocar antes de verificar
          </p>
          <div className="h-1.5 rounded-full bg-slate-800 mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-teal-400 transition-all"
              style={{ width: `${(doneCount / plan.length) * 100}%` }}
            />
          </div>
          <div className="mt-4 rounded-xl border border-teal-900/60 bg-teal-950/30 px-4 py-3 text-[13px] text-teal-200/90">
            🔒 Esta página nunca ve un valor. Los secretos viajan solo del proveedor a tu Keychain,
            por el prompt silencioso de <span className="font-mono">claudia keys rotate</span> en tu Mac.
          </div>
        </header>

        {[1, 2, 3, 4].map((s) => (
          <section key={s} className="mb-10">
            <h2 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-4">
              {sessionTitles[s]}
            </h2>
            <div className="space-y-4">
              {plan.filter((i) => i.session === s).map((item) => (
                <Card
                  key={item.id}
                  item={item}
                  done={(progress[item.id] ?? []) as StepId[]}
                  isNext={item.id === nextId}
                  onToggle={toggle}
                />
              ))}
            </div>
          </section>
        ))}

        <section className="mb-16">
          <h2 className="text-sm font-medium text-rose-300/80 uppercase tracking-wider mb-4">
            Estacionadas — NO rotar sin plan de migración
          </h2>
          <div className="space-y-2">
            {parked.map((p) => (
              <div key={p.id} className="rounded-xl border border-rose-950 bg-rose-950/20 px-4 py-3 opacity-70">
                <span className="font-mono text-[13px] text-rose-200">{p.id}</span>
                <p className="text-xs text-slate-400 mt-1">{p.reason}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ item, done, isNext, onToggle }: {
  item: CockpitItem;
  done: StepId[];
  isNext: boolean;
  onToggle: (id: string, step: StepId) => void;
}) {
  const steps = item.steps;
  const complete = steps.every((s) => done.includes(s));
  const [copied, setCopied] = useState(false);
  const cmd = item.cmd;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — user can select the text */ }
  };

  return (
    <div
      className={[
        'rounded-2xl border p-5 backdrop-blur transition',
        complete
          ? 'border-teal-900/70 bg-teal-950/20 opacity-75'
          : isNext
            ? 'border-amber-500/60 bg-slate-900/70 ring-1 ring-amber-500/30'
            : 'border-slate-800 bg-slate-900/50',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{complete ? '✅' : isNext ? '👉' : '🔑'}</span>
            <span className="font-mono text-[13px] text-slate-100">{item.project} / {item.key}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {item.selfGenerated ? '⚙️ auto-generado: ' : 'proveedor: '}{item.provider}
          </p>
        </div>
        {item.providerUrl && (
          <a
            href={item.providerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-amber-500/40 text-amber-200 text-xs px-3 py-1.5 hover:bg-amber-500/10 transition shrink-0"
          >
            Abrir proveedor ↗
          </a>
        )}
      </div>

      {item.warn && (
        <p className="mt-3 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-[12px] text-amber-200/90">
          ⚠️ {item.warn}
        </p>
      )}

      {item.deploy && item.deploy.length > 0 && (
        <div className="mt-3 text-[12px] text-slate-400">
          <span className="text-slate-300">Deploys:</span>
          <ul className="list-disc list-inside mt-0.5 space-y-0.5">
            {item.deploy.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </div>
      )}
      {item.verify && (
        <p className="mt-2 text-[12px] text-slate-400">
          <span className="text-slate-300">Verificar:</span> {item.verify}
        </p>
      )}

      <div className="mt-4 space-y-1.5">
        {steps.map((s) => (
          <label key={s} className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={done.includes(s)}
              onChange={() => onToggle(item.id, s)}
              className="mt-0.5 accent-amber-400"
            />
            <span className={`text-[12.5px] ${done.includes(s) ? 'text-slate-500 line-through' : 'text-slate-300 group-hover:text-slate-100'}`}>
              {STEP_LABEL[s]}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-950/80 border border-slate-800 px-3 py-2">
        <code className="text-[11.5px] text-teal-300 flex-1 overflow-x-auto whitespace-nowrap">
          ! {cmd}
        </code>
        <button onClick={copy} className="text-[11px] text-slate-400 hover:text-amber-200 transition shrink-0">
          {copied ? '✓ copiado' : 'copiar'}
        </button>
      </div>
    </div>
  );
}

/** 15-min re-lock: fresh TOTP challenge on the already-enrolled factor. */
function ReLock({ onUnlocked }: { onUnlocked: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (code.length < 6 || busy) return;
    setBusy(true); setErr('');
    const sb = browserClient();
    const { data, error } = await sb.auth.mfa.listFactors();
    const factor = data?.totp[0]; // totp array = verified factors only
    if (error || !factor) { setErr('No hay factor TOTP — recarga la página.'); setBusy(false); return; }
    const ch = await sb.auth.mfa.challenge({ factorId: factor.id });
    if (ch.error) { setErr(ch.error.message); setBusy(false); return; }
    const ver = await sb.auth.mfa.verify({ factorId: factor.id, challengeId: ch.data.id, code });
    if (ver.error) { setErr('Código incorrecto.'); setBusy(false); setCode(''); return; }
    sessionStorage.setItem('rotation-stepup-at', String(Date.now()));
    onUnlocked();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-8">
      <div className="max-w-sm w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur text-center">
        <div className="text-3xl mb-3">⏳</div>
        <h1 className="text-lg font-semibold text-amber-200 mb-2">Pausa de seguridad</h1>
        <p className="text-sm text-slate-400 mb-5">Pasaron 15 minutos — otro código de tu autenticadora.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          inputMode="numeric"
          placeholder="······"
          className="w-full text-center tracking-[0.5em] text-xl font-mono rounded-xl bg-slate-950 border border-slate-700 py-3 mb-3 focus:border-amber-400 outline-none"
          autoFocus
        />
        {err && <p className="text-xs text-rose-400 mb-2">{err}</p>}
        <button
          onClick={submit}
          disabled={busy || code.length < 6}
          className="w-full rounded-xl bg-amber-400/90 text-slate-950 font-medium py-2.5 hover:bg-amber-300 transition disabled:opacity-40"
        >
          {busy ? 'Verificando…' : 'Continuar'}
        </button>
      </div>
    </main>
  );
}
