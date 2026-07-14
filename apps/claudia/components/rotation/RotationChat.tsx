'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · Rotación — chat guía v2  (dock inside /rotation, post-3-locks)
//
//  v2: infra knowledge base injected server-side (post-gate prop), markdown-
//  lite rendering with copyable code blocks, quick-action chips, and the
//  [[marcar:<id>:<paso>]] protocol — ClaudIA can tick checklist steps for
//  Steph (client-side only: it mutates the same localStorage progress the
//  cards use; zero machine access).
//
//  Still the BLIND RELAY (/api/claudia/relay): stateless, no-log, authed.
//  The chat ADVISES; execution lives in ClaudIA local (terminal). Values of
//  keys never enter this surface.
// ════════════════════════════════════════════════════════════════════════

import { Fragment, useEffect, useRef, useState } from 'react';
import type { CockpitItem } from './RotationCockpit';
import type { StepId } from '../../lib/rotation/plan';

type Msg = { role: 'user' | 'assistant'; content: string };

const STEP_IDS: StepId[] = ['created', 'deployed', 'verified', 'vaulted', 'revoked'];
const MARK_RE = /\[\[marcar:([^:\]]+):(created|deployed|verified|vaulted|revoked)\]\]/g;

function buildContext(
  plan: CockpitItem[],
  progress: Record<string, StepId[]>,
  knowledge: string,
): string {
  const isDone = (i: CockpitItem) => i.steps.every((s) => (progress[i.id] ?? []).includes(s));
  const done = plan.filter(isDone).length;
  const current = plan.find((i) => !isDone(i));
  const pendientes = plan.filter((i) => !isDone(i)).map((i) => i.id).join(', ');
  return [
    '[CONTEXTO ROTACIÓN — sistema, no es mensaje de la usuaria]',
    `Steph rota las llaves del imperio en claudiaflow.life/rotation (${done}/${plan.length} completas).`,
    current
      ? `Tarjeta actual: ${current.id} · pasos hechos: ${(progress[current.id] ?? []).join(', ') || 'ninguno'} · pasos de la tarjeta: ${current.steps.join(', ')}${current.warn ? ` · aviso: ${current.warn}` : ''}${current.deploy?.length ? ` · deploys: ${current.deploy.join(' | ')}` : ''}`
      : 'Todas las tarjetas completas.',
    `IDs pendientes: ${pendientes || 'ninguno'}.`,
    knowledge,
    'REGLAS: crear nueva → actualizar deploys → verificar → vault local → revocar vieja. NUNCA revocar antes de verificar.',
    'TU ROL: guía experta y concreta. Responde CORTO y accionable. Cuando toque ejecutar algo, da el comando exacto en un bloque de código, prefijado con "!" para pegarlo en la terminal de Claude Code (ClaudIA local). Tú NO ejecutas nada.',
    'MARCAR PASOS: cuando Steph diga que completó un paso (o te pida marcarlo), incluye al FINAL de tu respuesta una etiqueta por paso: [[marcar:<id-de-tarjeta>:<paso>]] usando el id exacto de la lista y paso ∈ created|deployed|verified|vaulted|revoked. La página la aplica y la etiqueta no se muestra. Marca solo lo que Steph afirme haber hecho.',
    'SECRETOS: los valores de llaves JAMÁS en este chat. Si Steph intenta pegar uno, detenla — van solo en prompts silenciosos locales o el dashboard del proveedor.',
    '[/CONTEXTO]',
  ].filter(Boolean).join('\n');
}

/* ── markdown-lite: fenced code blocks (copyable) + inline **bold** / `code` ── */

function InlineMd({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="text-amber-100">{p.slice(2, -2)}</strong>;
        if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="text-teal-300 bg-slate-950/70 rounded px-1 text-[12px]">{p.slice(1, -1)}</code>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-1.5 rounded-lg bg-slate-950 border border-slate-700/70 overflow-hidden">
      <div className="flex justify-end px-2 pt-1">
        <button
          onClick={async () => {
            try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* select manually */ }
          }}
          className="text-[10px] text-slate-500 hover:text-amber-200"
        >
          {copied ? '✓ copiado' : 'copiar'}
        </button>
      </div>
      <pre className="px-3 pb-2 text-[11.5px] text-teal-300 overflow-x-auto whitespace-pre-wrap break-all">{code}</pre>
    </div>
  );
}

function Rendered({ text }: { text: string }) {
  const segments = text.split(/```(?:\w*\n)?/);
  return (
    <>
      {segments.map((seg, i) =>
        i % 2 === 1
          ? <CodeBlock key={i} code={seg.trim()} />
          : seg.split('\n').map((line, j) => (
              <p key={`${i}-${j}`} className={line.trim() ? '' : 'h-2'}>
                <InlineMd text={line} />
              </p>
            )),
      )}
    </>
  );
}

/* ── the dock ─────────────────────────────────────────────────────────── */

export default function RotationChat({ plan, progress, knowledge, onMark }: {
  plan: CockpitItem[];
  progress: Record<string, StepId[]>;
  knowledge: string;
  onMark: (id: string, step: StepId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const isDone = (i: CockpitItem) => i.steps.every((s) => (progress[i.id] ?? []).includes(s));
  const current = plan.find((i) => !isDone(i));

  useEffect(() => {
    if (open && msgs.length === 0) {
      const done = plan.filter(isDone).length;
      setMsgs([{
        role: 'assistant',
        content: current
          ? `Vamos **${done}/${plan.length}**. Ahora toca **${current.id}**. Sé dónde vive cada app hoy (migración incluida) — pregúntame o usa los botones. Cuando completes un paso, dímelo y lo palomeo yo.`
          : `Las ${plan.length} llaves están rotadas. 🎉 Pídeme el repaso final.`,
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  async function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || busy) return;
    if (/\b(sk-ant-|sk_live_|whsec_|ghp_|re_[A-Za-z0-9]{20,})/.test(text)) {
      setErr('Eso parece una llave — aquí nunca. Pégala solo en el prompt silencioso de tu terminal.');
      return;
    }
    setErr('');
    const history = [...msgs.slice(1), { role: 'user' as const, content: text }]; // drop local greeting
    setMsgs((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setBusy(true);
    try {
      const wire = history.map((m, idx) =>
        idx === history.length - 1
          ? { ...m, content: `${buildContext(plan, progress, knowledge)}\n\n${m.content}` }
          : m,
      );
      const res = await fetch('/api/claudia/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: wire }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `relay ${res.status}`);
      let reply: string = typeof data?.raw === 'string' && data.raw ? data.raw : 'Me quedé sin palabras — intenta de nuevo.';

      // Apply [[marcar:id:paso]] tags, then strip them from the shown text.
      const marks: string[] = [];
      reply = reply.replace(MARK_RE, (_all, id: string, step: string) => {
        if (plan.some((p) => p.id === id) && STEP_IDS.includes(step as StepId)) {
          onMark(id, step as StepId);
          marks.push(`${id} · ${step}`);
        }
        return '';
      }).trim();
      if (marks.length) {
        setToast(`✓ Marcado: ${marks.join(' · ')}`);
        setTimeout(() => setToast(''), 3500);
      }
      setMsgs((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setErr(`No pude responder: ${(e as Error).message}. Si persiste, pregúntale a ClaudIA local en tu terminal.`);
    } finally {
      setBusy(false);
    }
  }

  const chips = current ? [
    { label: '📍 ¿Dónde vive esta app hoy?', q: `¿Dónde vive hoy el deploy de ${current.id} y dónde actualizo su env/secret?` },
    { label: '🧭 ¿Qué sigue?', q: 'Dime exactamente qué paso sigue y el comando si aplica.' },
    { label: '🔑 ¿Para qué es esta llave?', q: `¿Para qué sirve exactamente ${current.id} y qué se rompe si la revoco antes de tiempo?` },
    { label: '✅ Ya hice este paso', q: 'Acabo de completar el paso que tocaba — márcalo y dime qué sigue.' },
  ] : [];

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
    <div className="fixed bottom-0 right-0 sm:bottom-5 sm:right-5 z-40 w-full sm:w-[440px] h-[85vh] sm:h-[min(80vh,640px)] sm:rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
        <div>
          <p className="text-sm font-semibold text-amber-200">ClaudIA · guía de rotación</p>
          <p className="text-[10px] text-slate-500">sabe tu infra (verificada) · marca pasos por ti · nunca pegues valores aquí</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-200 text-xl leading-none px-1">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={[
              'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed break-words',
              m.role === 'user' ? 'bg-amber-400/15 text-amber-100 border border-amber-500/20' : 'bg-slate-800/80 text-slate-200 border border-slate-700/60',
            ].join(' ')}>
              <Rendered text={m.content} />
            </div>
          </div>
        ))}
        {busy && <p className="text-xs text-slate-500 animate-pulse pl-1">ClaudIA está pensando…</p>}
        {err && <p className="text-xs text-rose-400 pl-1">{err}</p>}
        <div ref={bottomRef} />
      </div>

      {toast && (
        <div className="mx-3 mb-1 rounded-lg bg-teal-950/70 border border-teal-800 px-3 py-1.5 text-[12px] text-teal-200">{toast}</div>
      )}

      {chips.length > 0 && (
        <div className="px-3 pb-1.5 flex gap-1.5 flex-wrap">
          {chips.map((c) => (
            <button
              key={c.label}
              onClick={() => send(c.q)}
              disabled={busy}
              className="rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-300 hover:border-amber-500/50 hover:text-amber-200 transition disabled:opacity-40"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-slate-800 p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Pregunta, o dime qué paso completaste…"
          className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-[13px] focus:border-amber-400 outline-none"
        />
        <button
          onClick={() => send()}
          disabled={busy || !input.trim()}
          className="rounded-xl bg-amber-400/90 text-slate-950 text-sm font-medium px-4 hover:bg-amber-300 transition disabled:opacity-40"
        >
          →
        </button>
      </div>
    </div>
  );
}
