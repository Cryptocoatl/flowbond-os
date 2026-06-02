'use client';
import { useState } from 'react';
import type { RelContext } from '../../lib/astro/types';

const CONTEXTS: RelContext[] = ['friendship', 'romance', 'coliving', 'business'];

export default function ReadingPanel({ handles, pair }: { handles: string[]; pair?: boolean }) {
  const [context, setContext] = useState<RelContext>('friendship');
  const [reading, setReading] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function run(ctx: RelContext) {
    setBusy(true); setErr(''); setContext(ctx);
    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ handles, context: ctx }),
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
    <div className="mt-6 border border-[#242a3b] rounded-xl p-5 bg-[#11131f]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-[0.18em] text-[#b6abec]">Claude reading</h3>
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
      </div>
      {!reading && !busy && (
        <button onClick={() => run(context)} className="text-sm bg-[#9a8fe0]/15 border border-[#9a8fe0]/40 text-[#b6abec] rounded-lg px-4 py-2">
          Generate {pair ? 'compatibility' : 'personal'} reading
        </button>
      )}
      {busy && <p className="text-[#9698a8] text-sm animate-pulse">Reading the chart…</p>}
      {err && <p className="text-[#d9663c] text-sm">{err}</p>}
      {reading && <p className="font-serif text-[15px] leading-relaxed text-[#ece9e0] whitespace-pre-wrap">{reading}</p>}
    </div>
  );
}
