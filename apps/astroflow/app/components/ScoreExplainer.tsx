'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Chart, RelContext } from '../../lib/astro/types';
import { synastry } from '../../lib/astro/aspects';
import { interpretAspect } from '../../lib/astro/interpret';
import { SCORE_STEPS, SCORE_TRUTH, scoreBand } from '../../lib/astro/guide';
import { useT } from '../../lib/i18n/provider';

// "Where does this number come from?" — full transparency on the resonance
// score. Everything shown here is recomputed client-side by the same
// deterministic engine that produced the number: the real aspects, their real
// contributions, and the honest recipe. Zero tokens, instant.
export default function ScoreExplainer({
  people,
  context,
  score,
}: {
  people: { name: string; chart: Chart }[];
  context: RelContext;
  score: number;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [recipe, setRecipe] = useState(false);

  // Per-pair synastry with contributions — the actual math behind the number.
  const pairs = useMemo(() => {
    const out: { a: string; b: string; sy: ReturnType<typeof synastry> }[] = [];
    for (let i = 0; i < people.length; i++)
      for (let j = i + 1; j < people.length; j++)
        out.push({ a: people[i].name, b: people[j].name, sy: synastry(people[i].chart, people[j].chart, context) });
    return out;
  }, [people, context]);

  if (pairs.length === 0) return null;

  const band = scoreBand(score);

  // Flows vs friction, summed across every pair (for the balance bar).
  let pos = 0, neg = 0;
  for (const p of pairs) for (const a of p.sy.aspects) {
    if (a.contrib >= 0) pos += a.contrib; else neg += -a.contrib;
  }
  const posPct = Math.round((pos / (pos + neg + 0.001)) * 100);

  // The strongest currents (top contributions across all pairs).
  const top = pairs
    .flatMap((p) => p.sy.aspects.map((a) => ({ pair: p, a })))
    .sort((x, y) => Math.abs(y.a.contrib) - Math.abs(x.a.contrib))
    .slice(0, pairs.length === 1 ? 6 : 8);

  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} className="text-[11px] text-[#b6abec] underline decoration-dotted underline-offset-2 active:opacity-70">
        {open ? t('Hide the math ▴') : t('Where does this number come from? ▾')}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-[#242a3b] bg-[#0a0b14]/80 p-4 space-y-4" style={{ animation: 'af-rise 0.25s ease-out' }}>
          {/* what the number means */}
          <div>
            <p className="text-sm font-serif text-[#ece9e0]">
              <b style={{ color: band.color }}>{score}</b> · {t(band.label)}
            </p>
            <p className="text-xs text-[#9698a8] leading-relaxed mt-1">{t(band.meaning)}</p>
          </div>

          {/* flows vs friction balance bar */}
          <div>
            <div className="flex justify-between text-[10px] uppercase tracking-[0.14em] mb-1">
              <span className="text-[#7bd0c6]">{t('flows')} {posPct}%</span>
              <span className="text-[#e8956a]">{t('friction')} {100 - posPct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex" role="img" aria-label={t('balance of flowing vs frictional aspects')}>
              <div style={{ width: `${posPct}%`, background: '#7bd0c6' }} />
              <div style={{ width: `${100 - posPct}%`, background: '#e8956a' }} />
            </div>
            <p className="text-[10px] text-[#5b5e72] mt-1">{t('50 = perfectly balanced. This is the weight of easy aspects vs. demanding ones — not a grade.')}</p>
          </div>

          {/* group: per-pair scores */}
          {pairs.length > 1 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#5b5e72]">{t('The group number is the average of every pair')}</p>
              {pairs.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-[#cfc8e8]">
                  <span>{p.a} ✕ {p.b}</span>
                  <b style={{ color: scoreBand(p.sy.score).color }}>{p.sy.score}</b>
                </div>
              ))}
            </div>
          )}

          {/* the actual aspects driving it */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#5b5e72]">{t('The strongest currents behind it')}</p>
            {top.map(({ pair, a }, i) => (
              <div key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.harmony >= 0 ? '#7bd0c6' : '#e8956a' }} />
                <span className="text-[#b6b3cf]">
                  {pairs.length > 1 && <span className="text-[#5b5e72]">{pair.a}–{pair.b} · </span>}
                  {interpretAspect(a, context)}
                  <span className="text-[#5b5e72]"> · {a.orb}° {t('orb')}</span>
                </span>
              </div>
            ))}
          </div>

          {/* the recipe */}
          <div>
            <button onClick={() => setRecipe(!recipe)} className="text-[11px] text-[#9698a8] underline decoration-dotted underline-offset-2">
              {recipe ? t('Hide the recipe ▴') : t('How is it computed? The full recipe ▾')}
            </button>
            {recipe && (
              <ol className="mt-2 space-y-2">
                {SCORE_STEPS.map((s) => (
                  <li key={s.n} className="flex gap-2.5 text-xs text-[#9698a8] leading-relaxed">
                    <span className="shrink-0 w-5 h-5 rounded-full border border-[#2c3350] grid place-items-center text-[10px] text-[#b6abec]">{s.n}</span>
                    <span>{t(s.text)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <p className="text-[10px] text-[#5b5e72] leading-relaxed border-t border-white/5 pt-3">
            {t(SCORE_TRUTH)}{' '}
            <Link href="/guide" className="text-[#b6abec] underline decoration-dotted">{t('Read the full guide ✦')}</Link>
          </p>
        </div>
      )}
    </div>
  );
}
