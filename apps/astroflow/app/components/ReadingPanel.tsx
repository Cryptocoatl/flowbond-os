'use client';
import { useEffect, useRef, useState } from 'react';
import type { RelContext } from '../../lib/astro/types';
import { useT } from '../../lib/i18n/provider';

const CONTEXTS: RelContext[] = ['friendship', 'romance', 'coliving', 'business'];

// Single-person readings can switch tradition; `traditions` is only passed
// when the viewer has a deep/open-heart share (or owns the chart).
const SYSTEMS = [
  { key: 'unified', label: '✦ Unify' },
  { key: 'western', label: 'Western' },
  { key: 'vedic', label: 'Vedic' },
  { key: 'mayan', label: 'Mayan' },
  { key: 'genekeys', label: 'Gene Keys' },
  { key: 'comparison', label: 'Compare' },
] as const;
type SystemKey = (typeof SYSTEMS)[number]['key'];

interface Msg { role: 'user' | 'assistant'; text: string }

// FlowMe — the voice of the flow, now a real conversation: your questions and
// its readings live in one thread of bubbles, like the chats people already
// know. Readings are channeled live and never stored: each transmission exists
// only in this moment, inside FlowBond's privacy layer. The engine receives
// symbols, not identities.
export default function ReadingPanel({
  handles = [],
  mapId,
  pair,
  traditions,
}: {
  handles?: string[];
  mapId?: string; // collective chart reading — members + guests, live
  pair?: boolean;
  traditions?: boolean;
}) {
  const t = useT();
  const [context, setContext] = useState<RelContext>('friendship');
  const [system, setSystem] = useState<SystemKey>('western');
  const [question, setQuestion] = useState('');
  const [thread, setThread] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const scroll = useRef<HTMLDivElement>(null);

  useEffect(() => { scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: 'smooth' }); }, [thread, busy]);

  async function run(ctx: RelContext, sys: SystemKey = system, q: string = '') {
    if (busy) return;
    setBusy(true); setErr(''); setContext(ctx); setSystem(sys);
    if (q) setThread((th) => [...th, { role: 'user', text: q }]);
    try {
      const base = mapId ? { mapId } : { handles };
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...base, context: ctx, system: sys, question: q || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t('Failed'));
      setThread((th) => [...th, { role: 'assistant', text: json.reading }]);
      if (q) setQuestion(''); // clear the prompt so the conversation can flow on
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mt-6 rounded-2xl p-[1px]"
      style={{ background: 'linear-gradient(135deg, rgba(154,143,224,0.45), rgba(227,192,122,0.25), rgba(123,208,198,0.35))' }}
    >
      <div className="rounded-2xl p-5 bg-[#0e1020]/95 relative overflow-hidden">
        {/* aurora wash behind the oracle */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              'radial-gradient(420px 180px at 85% -20%, rgba(154,143,224,0.25), transparent 70%), radial-gradient(300px 160px at 0% 120%, rgba(123,208,198,0.18), transparent 70%)',
            animation: 'af-aurora 9s ease-in-out infinite',
          }}
        />
        <div className="relative">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-xs uppercase tracking-[0.24em] flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full bg-[#b6abec]"
                style={{ boxShadow: '0 0 8px 2px rgba(154,143,224,0.8)', animation: busy ? 'af-twinkle 1.1s ease-in-out infinite' : undefined }}
              />
              <span className="text-[#cfc8e8]">FlowMe</span>
              <span className="text-[#5b5e72] normal-case tracking-normal">{t('· voice of the flow')}</span>
            </h3>
            {pair && (
              <div className="flex gap-1">
                {CONTEXTS.map((c) => (
                  <button key={c} onClick={() => run(c)}
                    className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border ${context === c ? 'bg-[#e3c07a] text-[#0a0b12] border-[#e3c07a]' : 'border-[#242a3b] text-[#9698a8]'}`}>
                    {t(c)}
                  </button>
                ))}
              </div>
            )}
            {traditions && handles.length === 1 && (
              <div className="flex gap-1 flex-wrap">
                {SYSTEMS.map((s) => (
                  <button key={s.key} onClick={() => run(context, s.key)}
                    className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border ${system === s.key ? 'bg-[#e3c07a] text-[#0a0b12] border-[#e3c07a]' : 'border-[#242a3b] text-[#9698a8]'}`}>
                    {t(s.label)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* the conversation — questions and readings in one thread */}
          {(thread.length > 0 || busy) && (
            <div ref={scroll} className="space-y-2.5 mb-3 max-h-[420px] overflow-y-auto overscroll-contain pr-1">
              {thread.map((m, i) => (
                <div key={i} className={`af-msg flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'assistant' && (
                    <span className="w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs self-start mt-1" style={{ background: 'radial-gradient(circle at 35% 30%, #b6abec, #6f5fd0)' }}>✦</span>
                  )}
                  <div className={`${m.role === 'user' ? 'af-bubble-user text-sm' : 'af-bubble-flowme font-serif text-[15px]'} px-3.5 py-2.5 leading-relaxed max-w-[92%] whitespace-pre-wrap`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="af-msg flex items-end gap-2">
                  <span className="w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs" style={{ background: 'radial-gradient(circle at 35% 30%, #b6abec, #6f5fd0)' }}>✦</span>
                  <div className="af-bubble-flowme px-4 py-3 af-typing"><span /> <span /> <span /></div>
                </div>
              )}
            </div>
          )}
          {err && <p className="text-[#d9663c] text-sm mb-2">{err}</p>}

          {/* first move — channel the reading */}
          {thread.length === 0 && !busy && (
            <button onClick={() => run(context)}
              className="text-sm bg-[#9a8fe0]/15 border border-[#9a8fe0]/40 text-[#b6abec] rounded-lg px-4 py-2 mb-3 hover:bg-[#9a8fe0]/25 transition">
              {t('✦ Channel the {kind} reading', { kind: mapId ? t('collective') : pair ? t('compatibility') : t('personal') })}
            </button>
          )}

          {/* the writing — ask the stars */}
          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && question.trim() && !busy) run(context, system, question); }}
              maxLength={300}
              placeholder={t('Ask the stars — a decision, a tension, a dream…')} enterKeyHint="send"
              className="flex-1 bg-[#0a0b14] border border-[#242a3b] rounded-full px-4 py-2.5 text-sm text-[#ece9e0] placeholder-[#454962] focus:border-[#9a8fe0]/50 outline-none"
            />
            <button
              onClick={() => run(context, system, question)}
              disabled={busy || !question.trim()} aria-label={t('✦ Ask')}
              className="w-10 h-10 shrink-0 rounded-full grid place-items-center bg-[#e3c07a]/90 text-[#0a0b12] font-semibold disabled:opacity-40 hover:bg-[#e3c07a] active:scale-95 transition"
            >
              ↑
            </button>
          </div>

          <p className="text-[10px] text-[#5b5e72] mt-2">
            {t('FlowMe reflects your question through the symbols — a mirror for star-aligned decisions, never a verdict.')}
          </p>

          <p className="text-[9px] text-[#3f4358] mt-4 tracking-wide">
            {t('Channeled live, never stored — your chart speaks in symbols, your identity stays in the flow ·')}{' '}
            <a href="/guide" className="text-[#5b5e72] underline decoration-dotted hover:text-[#b6abec]">{t('read the guide ✦')}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
