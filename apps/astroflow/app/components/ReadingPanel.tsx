'use client';
import { useState } from 'react';
import type { RelContext } from '../../lib/astro/types';

const CONTEXTS: RelContext[] = ['friendship', 'romance', 'coliving', 'business'];

// Single-person readings can switch tradition; `traditions` is only passed
// when the viewer has a deep/open-heart share (or owns the chart).
const SYSTEMS = [
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
  const [context, setContext] = useState<RelContext>('friendship');
  const [system, setSystem] = useState<SystemKey>('western');
  const [reading, setReading] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function run(ctx: RelContext, sys: SystemKey = system) {
    setBusy(true); setErr(''); setContext(ctx); setSystem(sys);
    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(mapId ? { mapId, context: ctx, system: sys } : { handles, context: ctx, system: sys }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setReading(json.reading);
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
              <span className="text-[#5b5e72] normal-case tracking-normal">· voice of the flow</span>
            </h3>
            {pair && (
              <div className="flex gap-1">
                {CONTEXTS.map((c) => (
                  <button key={c} onClick={() => run(c)}
                    className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border ${context === c ? 'bg-[#e3c07a] text-[#0a0b12] border-[#e3c07a]' : 'border-[#242a3b] text-[#9698a8]'}`}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            {traditions && handles.length === 1 && (
              <div className="flex gap-1 flex-wrap">
                {SYSTEMS.map((s) => (
                  <button key={s.key} onClick={() => run(context, s.key)}
                    className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border ${system === s.key ? 'bg-[#e3c07a] text-[#0a0b12] border-[#e3c07a]' : 'border-[#242a3b] text-[#9698a8]'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!reading && !busy && (
            <button onClick={() => run(context)}
              className="text-sm bg-[#9a8fe0]/15 border border-[#9a8fe0]/40 text-[#b6abec] rounded-lg px-4 py-2 hover:bg-[#9a8fe0]/25 transition">
              ✦ Channel the {mapId ? 'collective' : pair ? 'compatibility' : 'personal'} reading
            </button>
          )}
          {busy && (
            <p className="text-[#9698a8] text-sm animate-pulse">
              FlowMe is reading the sky{mapId ? ' you share' : ''}…
            </p>
          )}
          {err && <p className="text-[#d9663c] text-sm">{err}</p>}
          {reading && (
            <p className="font-serif text-[15px] leading-relaxed text-[#ece9e0] whitespace-pre-wrap" style={{ animation: 'af-rise 0.6s ease-out' }}>
              {reading}
            </p>
          )}
          <p className="text-[9px] text-[#3f4358] mt-4 tracking-wide">
            Channeled live, never stored — your chart speaks in symbols, your identity stays in the flow.
          </p>
        </div>
      </div>
    </div>
  );
}
