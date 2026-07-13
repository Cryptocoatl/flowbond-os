'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · Rotación — chat guía  (dock inside /rotation, post-3-locks)
//
//  Talks through the existing BLIND RELAY (/api/claudia/relay): stateless,
//  no-log, auth-required; Steph gets the steward persona server-side. Each
//  send injects a compact live context block (progress, current card,
//  Vercel→CF migration caveat) so ClaudIA answers about THIS rotation.
//
//  Honest boundary, stated in the context: this chat ADVISES — it cannot run
//  commands. Execution happens in ClaudIA local (Claude Code terminal); the
//  chat emits `!`-prefixed commands for Steph to paste there. It must never
//  ask for or accept a secret value.
// ════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import type { CockpitItem } from './RotationCockpit';
import type { StepId } from '../../lib/rotation/plan';

type Msg = { role: 'user' | 'assistant'; content: string };

function buildContext(plan: CockpitItem[], progress: Record<string, StepId[]>): string {
  const doneOf = (i: CockpitItem) => (progress[i.id] ?? []).length;
  const isDone = (i: CockpitItem) => i.steps.every((s) => (progress[i.id] ?? []).includes(s));
  const done = plan.filter(isDone).length;
  const current = plan.find((i) => !isDone(i));
  const upcoming = plan.filter((i) => !isDone(i)).slice(1, 3);
  return [
    '[CONTEXTO ROTACIÓN — no es mensaje de la usuaria]',
    `Steph está en claudiaflow.life/rotation rotando todas las llaves del imperio (${done}/${plan.length} completas).`,
    current
      ? `Tarjeta actual: ${current.project} / ${current.key} · proveedor ${current.provider} · pasos hechos ${doneOf(current)}/${current.steps.length}${current.warn ? ` · aviso: ${current.warn}` : ''}${current.deploy?.length ? ` · deploys: ${current.deploy.join(' | ')}` : ''}`
      : 'Todas las tarjetas completas.',
    upcoming.length ? `Siguen: ${upcoming.map((i) => `${i.project}/${i.key}`).join(', ')}.` : '',
    'Reglas de la rotación: crear nueva → actualizar deploys → verificar → guardar en vault local → revocar vieja. NUNCA revocar antes de verificar.',
    'MIGRACIÓN EN CURSO Vercel→Cloudflare: si una tarjeta dice "Vercel env", confirma primero dónde vive HOY esa app (puede ya estar en CF Workers/Pages). En duda, que Steph pregunte a ClaudIA local.',
    'Tu rol: guiar y diagnosticar. NO puedes ejecutar nada. Para acciones, da el comando exacto prefijado con "!" para que Steph lo pegue en su terminal de Claude Code (ClaudIA local), p.ej. "! claudia keys rotate <proyecto> <KEY> --yes". Los valores de llaves NUNCA se escriben en este chat — si Steph intenta pegar uno, detenla; los valores solo van en prompts silenciosos locales o en el dashboard del proveedor.',
    '[/CONTEXTO]',
  ].filter(Boolean).join('\n');
}

function proactiveGreeting(plan: CockpitItem[], progress: Record<string, StepId[]>): string {
  const isDone = (i: CockpitItem) => i.steps.every((s) => (progress[i.id] ?? []).includes(s));
  const done = plan.filter(isDone).length;
  const current = plan.find((i) => !isDone(i));
  if (!current) return `Las ${plan.length} llaves están rotadas. 🎉 Pídeme el repaso final: viejas revocadas + audit del vault.`;
  const stepsDone = (progress[current.id] ?? []).length;
  return `Vamos ${done}/${plan.length}. Ahora toca **${current.project} / ${current.key}**${stepsDone ? ` (paso ${stepsDone + 1} de ${current.steps.length})` : ''}. Pregúntame lo que sea — para qué sirve una llave, dónde vive su deploy hoy (ojo: migración Vercel→Cloudflare en curso), o qué comando pegar en tu terminal.`;
}

export default function RotationChat({ plan, progress }: {
  plan: CockpitItem[];
  progress: Record<string, StepId[]>;
}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{ role: 'assistant', content: proactiveGreeting(plan, progress) }]);
    }
  }, [open, msgs.length, plan, progress]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    // Guard: looks like a secret value → refuse client-side, never send it.
    if (/\b(sk-ant-|sk_live_|whsec_|ghp_|re_[A-Za-z0-9]{20,})/.test(text)) {
      setErr('Eso parece una llave — aquí nunca. Pégala solo en el prompt silencioso de tu terminal.');
      return;
    }
    setErr('');
    const history = [...msgs.filter((m, idx) => !(idx === 0 && m.role === 'assistant')), { role: 'user' as const, content: text }];
    setMsgs((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setBusy(true);
    try {
      // Fresh context rides on the LAST user message so progress stays live.
      const wire = history.map((m, idx) =>
        idx === history.length - 1
          ? { ...m, content: `${buildContext(plan, progress)}\n\n${m.content}` }
          : m,
      );
      const res = await fetch('/api/claudia/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: wire }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `relay ${res.status}`);
      const reply = typeof data?.raw === 'string' && data.raw ? data.raw : 'Me quedé sin palabras — intenta de nuevo.';
      setMsgs((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setErr(`No pude responder: ${(e as Error).message}. Si persiste, pregúntale a ClaudIA local en tu terminal.`);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 px-5 py-3 text-sm font-semibold hover:scale-105 transition"
      >
        💬 ClaudIA
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[min(94vw,380px)] h-[min(70vh,540px)] rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
        <div>
          <p className="text-sm font-semibold text-amber-200">ClaudIA · guía de rotación</p>
          <p className="text-[10px] text-slate-500">relay privado · sin logs · nunca pegues valores aquí</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-200 text-lg leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={[
              'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words',
              m.role === 'user' ? 'bg-amber-400/15 text-amber-100 border border-amber-500/20' : 'bg-slate-800/80 text-slate-200 border border-slate-700/60',
            ].join(' ')}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <p className="text-xs text-slate-500 animate-pulse pl-1">ClaudIA está pensando…</p>}
        {err && <p className="text-xs text-rose-400 pl-1">{err}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-800 p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="¿Para qué es esta llave? ¿Dónde vive hoy?"
          className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-[13px] focus:border-amber-400 outline-none"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="rounded-xl bg-amber-400/90 text-slate-950 text-sm font-medium px-4 hover:bg-amber-300 transition disabled:opacity-40"
        >
          →
        </button>
      </div>
    </div>
  );
}
