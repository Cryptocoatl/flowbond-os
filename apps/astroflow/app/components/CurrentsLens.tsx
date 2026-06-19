'use client';
import { useState } from 'react';
import { useT } from '../../lib/i18n/provider';
import type { CurrentsData } from '../../lib/astro/currents';

// Read the whole constellation through ONE current at a time — every member
// laid out in that tradition's own visual frame, in their star colour, so an
// expert in that lens can see the crew at a glance. Each frame carries its own
// reference so the symbols are legible. Pure presentation: all astrology was
// computed server-side (buildCurrents) on the validated engines.

type LensKey = 'western' | 'vedic' | 'mayan' | 'genekeys';

const EL_COLOR: Record<string, string> = {
  Fire: '#e8956a', Earth: '#a8c97f', Air: '#e3c07a', Water: '#7bd0c6',
};
const SIGN_GLYPH = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const SIGN_EL = ['Fire', 'Earth', 'Air', 'Water', 'Fire', 'Earth', 'Air', 'Water', 'Fire', 'Earth', 'Air', 'Water'];

// 0° = top, increasing clockwise.
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function ring(cx: number, cy: number, rIn: number, rOut: number, a0: number, a1: number) {
  const [x0o, y0o] = polar(cx, cy, rOut, a0);
  const [x1o, y1o] = polar(cx, cy, rOut, a1);
  const [x1i, y1i] = polar(cx, cy, rIn, a1);
  const [x0i, y0i] = polar(cx, cy, rIn, a0);
  const large = a1 - a0 <= 180 ? 0 : 1;
  return `M${x0o},${y0o} A${rOut},${rOut} 0 ${large} 1 ${x1o},${y1o} L${x1i},${y1i} A${rIn},${rIn} 0 ${large} 0 ${x0i},${y0i} Z`;
}

export default function CurrentsLens({ data }: { data: CurrentsData }) {
  const t = useT();
  const [lens, setLens] = useState<LensKey>('western');
  const [focus, setFocus] = useState<string | null>(null);

  if (data.count < 1) return null;

  const LENSES: { key: LensKey; label: string }[] = [
    { key: 'western', label: t('Western') },
    { key: 'vedic', label: t('Vedic') },
    { key: 'mayan', label: t('Mayan') },
    { key: 'genekeys', label: t('Gene Keys') },
  ];

  // members present in every lens (same order) — drive a shared legend
  const roster = data.western.map((m) => ({ name: m.name, color: m.color, shared: m.shared }));
  const dim = (name: string) => (focus && focus !== name ? 0.18 : 1);

  return (
    <div>
      {/* lens selector */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
        {LENSES.map((l) => (
          <button
            key={l.key}
            onClick={() => setLens(l.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap border transition ${
              lens === l.key
                ? 'bg-[#e3c07a] text-[#0a0b12] border-[#e3c07a] font-semibold'
                : 'bg-[#11131f] text-[#cfc8e8] border-[#2c3350] hover:border-[#3a4670]'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* shared member legend (tap to spotlight) */}
      <div className="flex flex-wrap gap-2 mb-4">
        {roster.map((m) => (
          <button
            key={m.name}
            onClick={() => setFocus(focus === m.name ? null : m.name)}
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition"
            style={{
              borderColor: focus === m.name ? m.color : '#242a3b',
              background: focus === m.name ? `${m.color}22` : 'transparent',
              opacity: m.shared ? 1 : 0.5,
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
            <span className="text-[#cfc8e8]">{m.name}</span>
            {!m.shared && <span className="text-[#5b5e72]">· {t('hidden')}</span>}
          </button>
        ))}
      </div>

      {lens === 'western' && <Western data={data} dim={dim} t={t} />}
      {lens === 'vedic' && <Vedic data={data} dim={dim} t={t} />}
      {lens === 'mayan' && <Mayan data={data} dim={dim} t={t} />}
      {lens === 'genekeys' && <GeneKeys data={data} dim={dim} t={t} />}
    </div>
  );
}

type TF = (s: string, v?: Record<string, string | number>) => string;

// ── WESTERN: concentric planet rings on the zodiac wheel ────────────────────
function Western({ data, dim, t }: { data: CurrentsData; dim: (n: string) => number; t: TF }) {
  const C = 160;
  const RINGS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const GLYPH: Record<string, string> = {
    Sun: '☉', Moon: '☾', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄',
  };
  const ringR = (i: number) => 116 - i * 13;

  return (
    <div>
      <svg viewBox="0 0 320 320" className="w-full max-w-[360px] mx-auto block">
        {/* zodiac sign band */}
        {SIGN_GLYPH.map((g, i) => {
          const a0 = i * 30;
          const el = SIGN_EL[i];
          const [gx, gy] = polar(C, C, 139, a0 + 15);
          return (
            <g key={i}>
              <path d={ring(C, C, 128, 150, a0, a0 + 30)} fill={EL_COLOR[el]} opacity={0.16} />
              <text x={gx} y={gy} fontSize={11} fill={EL_COLOR[el]} textAnchor="middle" dominantBaseline="central">{g}</text>
            </g>
          );
        })}
        {/* planet rings */}
        {RINGS.map((p, i) => {
          const r = ringR(i);
          const [lx, ly] = polar(C, C, r, 0);
          return (
            <g key={p}>
              <circle cx={C} cy={C} r={r} fill="none" stroke="#ffffff" strokeOpacity={0.06} />
              <text x={lx} y={ly} fontSize={8} fill="#5b5e72" textAnchor="middle" dominantBaseline="central">{GLYPH[p]}</text>
              {data.western.map((m) =>
                m.planets
                  .filter((pl) => pl.p === p)
                  .map((pl) => {
                    const [px, py] = polar(C, C, r, pl.abs);
                    return (
                      <circle key={m.name + p} cx={px} cy={py} r={3.4} fill={m.color} opacity={dim(m.name)}>
                        <title>{`${m.name} · ${GLYPH[p]} ${p} ${pl.sign}`}</title>
                      </circle>
                    );
                  }),
              )}
            </g>
          );
        })}
      </svg>
      <Ref t={t} text={t('Each ring is one planet (☉ outer → ♄ inner); every star is a member’s planet at its zodiac longitude. Clusters on a ring = the crew shares that energy. Outer band = the 12 signs, tinted by element.')} />
    </div>
  );
}

// ── VEDIC: the 27 nakshatras as a ring, each member's Moon placed ───────────
function Vedic({ data, dim, t }: { data: CurrentsData; dim: (n: string) => number; t: TF }) {
  const C = 160;
  const R = 132;
  const step = 360 / 27;
  return (
    <div>
      <svg viewBox="0 0 320 320" className="w-full max-w-[360px] mx-auto block">
        <circle cx={C} cy={C} r={R} fill="none" stroke="#ffffff" strokeOpacity={0.08} />
        {Array.from({ length: 27 }).map((_, i) => {
          const [x, y] = polar(C, C, R, i * step);
          return <circle key={i} cx={x} cy={y} r={1.4} fill="#3a4158" />;
        })}
        {data.vedic.map((m, idx) =>
          m.moonNakIdx != null ? (
            (() => {
              const [x, y] = polar(C, C, R, m.moonNakIdx * step + step / 2);
              return (
                <g key={m.name} opacity={dim(m.name)}>
                  <circle cx={x} cy={y} r={5} fill={m.color}>
                    <title>{`${m.name} · ${t('Moon')} ${m.moonNak} (${m.moonNakLord})`}</title>
                  </circle>
                </g>
              );
            })()
          ) : null,
        )}
        <text x={C} y={C - 6} fontSize={10} fill="#9698a8" textAnchor="middle">☾ {t('Moon')}</text>
        <text x={C} y={C + 9} fontSize={8} fill="#5b5e72" textAnchor="middle">27 {t('nakshatras')}</text>
      </svg>
      <div className="space-y-1.5 mt-1">
        {data.vedic.filter((m) => m.shared).map((m) => (
          <div key={m.name} className="flex items-center gap-2 text-xs" style={{ opacity: dim(m.name) }}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
            <span className="text-[#cfc8e8]">{m.name}</span>
            <span className="text-[#9698a8]">{t('Moon in {nak} · lord {lord}', { nak: m.moonNak ?? '—', lord: m.moonNakLord ?? '—' })}</span>
            {m.lagna && <span className="text-[#5b5e72]">· {t('Lagna {rashi}', { rashi: m.lagna })}</span>}
          </div>
        ))}
      </div>
      <Ref t={t} text={t('In jyotish the Moon’s nakshatra is the seat of the mind. Members near each other on the ring share a mental/emotional ground; the same Vimshottari lord means shared karmic timing.')} />
    </div>
  );
}

// ── MAYAN: two strips — the 20 day-signs (seals) and the 13 tones ───────────
function Mayan({ data, dim, t }: { data: CurrentsData; dim: (n: string) => number; t: TF }) {
  const SEALS = ['Imix', 'Ik', 'Akbal', 'Kan', 'Chicchan', 'Cimi', 'Manik', 'Lamat', 'Muluc', 'Oc', 'Chuen', 'Eb', 'Ben', 'Ix', 'Men', 'Cib', 'Caban', 'Etznab', 'Cauac', 'Ahau'];
  const shared = data.mayan.filter((m) => m.shared);
  const atSeal = (i: number) => shared.filter((m) => m.sealIdx === i);
  const atTone = (n: number) => shared.filter((m) => m.tone === n);

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[#b6abec] mb-1.5">{t('Day-signs (seals)')}</p>
      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
        {SEALS.map((s, i) => {
          const here = atSeal(i);
          return (
            <div key={s} className="shrink-0 w-[44px] text-center">
              <div className="h-12 rounded-lg border border-[#242a3b] bg-[#0d0f1a] flex flex-col items-center justify-end gap-0.5 p-1">
                {here.map((m) => (
                  <span key={m.name} className="w-2.5 h-2.5 rounded-full" style={{ background: m.color, opacity: dim(m.name) }} title={`${m.name} · ${m.seal} ${m.tone}`} />
                ))}
              </div>
              <div className="text-[8px] text-[#6b6e86] mt-0.5 truncate">{s}</div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] uppercase tracking-wider text-[#b6abec] mt-3 mb-1.5">{t('Galactic tones')}</p>
      <div className="flex gap-1">
        {Array.from({ length: 13 }).map((_, k) => {
          const n = k + 1;
          const here = atTone(n);
          return (
            <div key={n} className="flex-1 text-center">
              <div className="h-10 rounded-md border border-[#242a3b] bg-[#0d0f1a] flex flex-col items-center justify-end gap-0.5 p-0.5">
                {here.map((m) => (
                  <span key={m.name} className="w-2 h-2 rounded-full" style={{ background: m.color, opacity: dim(m.name) }} title={`${m.name} · ${t('tone')} ${n}`} />
                ))}
              </div>
              <div className="text-[8px] text-[#6b6e86] mt-0.5">{n}</div>
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5 mt-3">
        {shared.map((m) => (
          <div key={m.name} className="flex items-center gap-2 text-xs" style={{ opacity: dim(m.name) }}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
            <span className="text-[#cfc8e8]">{m.name}</span>
            <span className="text-[#9698a8]">{t('Tone {tone} {seal}', { tone: m.tone ?? '—', seal: m.seal ?? '—' })}</span>
            {m.meaning && <span className="text-[#5b5e72]">· {m.meaning}</span>}
          </div>
        ))}
      </div>
      <Ref t={t} text={t('Each soul carries a day-sign (its archetype) and a galactic tone (its role, 1–13). Members sharing a seal share a face; sharing a tone share a function in the group’s work.')} />
    </div>
  );
}

// ── GENE KEYS: each member's four prime gifts + the crew's shared gates ──────
function GeneKeys({ data, dim, t }: { data: CurrentsData; dim: (n: string) => number; t: TF }) {
  const shared = data.genekeys.members.filter((m) => m.shared);
  return (
    <div>
      <div className="space-y-2">
        {shared.map((m) => (
          <div key={m.name} className="rounded-xl border border-[#242a3b] bg-[#11131f] p-3" style={{ opacity: dim(m.name) }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
              <span className="text-sm text-[#ece9e0]">{m.name}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {m.spheres.map((s) => {
                const isShared = data.genekeys.resonance.some((r) => r.gate === s.gate);
                return (
                  <div key={s.key} className="text-center rounded-lg py-1.5" style={{ background: isShared ? `${m.color}22` : '#0d0f1a', border: `1px solid ${isShared ? m.color + '66' : '#242a3b'}` }}>
                    <div className="text-base font-serif text-[#e3c07a]">{s.gate}<span className="text-[10px] text-[#5b5e72]">.{s.line}</span></div>
                    <div className="text-[8px] uppercase tracking-wide text-[#6b6e86] mt-0.5">{t(s.label)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {data.genekeys.resonance.length > 0 && (
        <div className="mt-3 rounded-xl border border-[#e3c07a]/30 bg-[#e3c07a]/[0.06] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#e3c07a] mb-2">{t('Shared gates — the crew’s resonance')}</p>
          <div className="space-y-1.5">
            {data.genekeys.resonance.map((r) => (
              <div key={r.gate} className="text-xs">
                <span className="font-serif text-[#e3c07a]">{t('Gate {gate}', { gate: r.gate })}</span>
                <span className="text-[#5b5e72]"> ×{r.count}</span>
                <span className="text-[#cfc8e8]"> — {r.gift}</span>
                <span className="text-[#9698a8]"> → {r.siddhi}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Ref t={t} text={t('The four prime gifts (Life’s Work, Evolution, Radiance, Purpose) are each a gate of the I Ching. A gate two or more members share is a theme the whole constellation came to work — shown in gold.')} />
    </div>
  );
}

function Ref({ text, t }: { text: string; t: TF }) {
  return (
    <p className="text-[11px] text-[#6b6e86] leading-relaxed mt-3 border-t border-white/5 pt-2.5">
      <span className="text-[#b6abec]">{t('How to read this')} · </span>
      {text}
    </p>
  );
}
