'use client';
import { useState } from 'react';
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

// FlowMe — the voice of the flow. Readings are channeled live and never
// stored: each transmission exists only in this moment, inside FlowBond's
// privacy layer. The engine receives symbols, not identities.
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
  const [reading, setReading] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function run(ctx: RelContext, sys: SystemKey = system, q: string = '') {
    setBusy(true); setErr(''); setContext(ctx); setSystem(sys);
    try {
      const base = mapId ? { mapId } : { handles };
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...base, context: ctx, system: sys, question: q || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t('Failed'));
      setReading(json.reading);
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
          {/* The writing — ask the stars; the answer always appears BELOW it */}
          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && question.trim() && !busy) run(context, system, question); }}
              maxLength={300}
              placeholder={t('Ask the stars — a decision, a tension, a dream…')}
              className="flex-1 bg-[#0a0b14] border border-[#242a3b] rounded-lg px-3 py-2 text-sm text-[#ece9e0] placeholder-[#454962] focus:border-[#9a8fe0]/50 outline-none"
            />
            <button
              onClick={() => run(context, system, question)}
              disabled={busy || !question.trim()}
              className="text-sm bg-[#e3c07a]/90 text-[#0a0b12] font-semibold rounded-lg px-4 disabled:opacity-40 hover:bg-[#e3c07a] transition"
            >
              {t('✦ Ask')}
            </button>
          </div>
          {!reading && !busy && (
            <button onClick={() => run(context)}
              className="text-sm bg-[#9a8fe0]/15 border border-[#9a8fe0]/40 text-[#b6abec] rounded-lg px-4 py-2 mt-3 hover:bg-[#9a8fe0]/25 transition">
              {t('✦ Channel the {kind} reading', { kind: mapId ? t('collective') : pair ? t('compatibility') : t('personal') })}
            </button>
          )}

          {/* The answer — under the writing */}
          {busy && (
            <p className="text-[#9698a8] text-sm animate-pulse mt-3">
              {mapId ? t('FlowMe is reading the sky you share…') : t('FlowMe is reading the sky…')}
            </p>
          )}
          {err && <p className="text-[#d9663c] text-sm mt-3">{err}</p>}
          {reading && (
            <p className="font-serif text-[15px] leading-relaxed text-[#ece9e0] whitespace-pre-wrap mt-3" style={{ animation: 'af-rise 0.6s ease-out' }}>
              {reading}
            </p>
          )}
          <p className="text-[10px] text-[#5b5e72] mt-2">
            {t('FlowMe reflects your question through the symbols — a mirror for star-aligned decisions, never a verdict.')}
          </p>

          <p className="text-[9px] text-[#3f4358] mt-4 tracking-wide">
            {t('Channeled live, never stored — your chart speaks in symbols, your identity stays in the flow ·')}{' '}
            <a href="/cosmos" className="text-[#5b5e72] underline decoration-dotted hover:text-[#b6abec]">{t('study the symbols ✦')}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
