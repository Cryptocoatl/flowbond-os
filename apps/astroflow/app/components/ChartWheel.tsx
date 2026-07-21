'use client';
import { useEffect, useMemo, useState } from 'react';
import { PLANETS, SIGNS, HOUSES, ASPECTS as ASPECT_REF } from '../../lib/astro/university';
import { SIGN_GLYPH } from '../../lib/astro/currents';
import { PLANET_GLYPH, PLANET_COLOR } from '../../lib/astro/acg-geo';
import { useT } from '../../lib/i18n/provider';
import { track } from '../../lib/analytics';

// A full circular natal wheel — zodiac ring, whole-sign houses, planets placed
// by longitude, and the aspect web. Tap anything to expand its meaning in a
// bottom sheet (easy to dismiss, never covers the wheel). Works for one chart
// (with the aspect web) or a collective (each person tinted, with a legend).
//
// Mobile-first: fat invisible hit targets, a single responsive SVG, a soft
// guide you can toggle, and reference meanings that cost zero tokens (they live
// in code, not the model).

export interface WheelBody {
  planet: string; lon: number; sign: string; deg: number; house: number; retro: boolean;
}
export interface WheelPerson { name: string; color: string; bodies: WheelBody[] }
export interface WheelAspect { p1: string; p2: string; type: string; harmony: number; orb: number }

const ZODIAC = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const ELEMENT_OF = ['Fire', 'Earth', 'Air', 'Water']; // index % 4 across the zodiac
const ELEMENT_TINT: Record<string, string> = { Fire: '#e8956a', Earth: '#a8c97f', Air: '#e3c07a', Water: '#7bd0c6' };
// Aspect polarity — a diverging pair + neutral, each backed by a glyph/label.
const ASPECT_STYLE: Record<string, { color: string; dash?: string }> = {
  conjunction: { color: '#b6abec' },
  sextile: { color: '#7bd0c6', dash: '3 4' },
  trine: { color: '#7bd0c6' },
  square: { color: '#e8956a' },
  opposition: { color: '#e8956a' },
  quincunx: { color: '#8a8ea3', dash: '2 5' },
};
const findEntry = <T extends { name: string }>(arr: T[], name: string): T | undefined =>
  arr.find((e) => e.name === name || e.name.startsWith(name));

// longitude (deg) → point on a circle, Asc at left, zodiac counterclockwise.
function polar(cx: number, cy: number, r: number, lon: number, asc: number) {
  const d = ((lon - asc) * Math.PI) / 180;
  return [cx - r * Math.cos(d), cy + r * Math.sin(d)] as const;
}

type Sel =
  | { kind: 'planet'; body: WheelBody; owner?: string; color: string }
  | { kind: 'sign'; sign: string }
  | { kind: 'aspect'; a: WheelAspect }
  | null;

export default function ChartWheel({
  people, asc = null, mc = null, aspects = [], caption,
}: {
  people: WheelPerson[];
  asc?: number | null;
  mc?: number | null;
  aspects?: WheelAspect[];
  caption?: string;
}) {
  const t = useT();
  const [sel, setSel] = useState<Sel>(null);
  const [guide, setGuide] = useState(false);
  const collective = people.length > 1;
  useEffect(() => { track('wheel_opened', collective ? 'map' : 'chart'); }, [collective]);
  useEffect(() => { if (sel) track('wheel_detail', collective ? 'map' : 'chart'); }, [sel, collective]);

  const S = 400, C = 200; // viewBox size, center
  const rSignOuter = 195, rSignInner = 162; // zodiac band
  const rHouse = 150;                        // house-cusp ring
  const rPlanet = 132;                       // planet placement ring
  const rAspect = 118;                       // aspect web radius
  const A = asc ?? 0; // no birth time → 0° Aries at left, houses hidden

  // De-collide planets that sit within ~7° by staggering their radius.
  const placed = useMemo(() => {
    const all: { b: WheelBody; owner?: string; color: string; r: number }[] = [];
    for (const person of people) {
      const sorted = [...person.bodies].sort((x, y) => x.lon - y.lon);
      let lastLon = -99, step = 0;
      for (const b of sorted) {
        step = Math.abs(b.lon - lastLon) < 7 ? step + 1 : 0;
        lastLon = b.lon;
        all.push({ b, owner: collective ? person.name : undefined, color: person.color, r: rPlanet - step * 15 });
      }
    }
    return all;
  }, [people, collective]);

  return (
    <div className="af-rise">
      <div className="relative w-full max-w-[440px] mx-auto">
        <svg viewBox={`0 0 ${S} ${S}`} className="w-full h-auto block select-none" role="img"
          aria-label={t('Your natal chart wheel')}>
          <defs>
            <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8F7CFF" stopOpacity="0.10" />
              <stop offset="70%" stopColor="#0b0a1a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={C} cy={C} r={rSignOuter} fill="url(#wheelGlow)" />

          {/* Zodiac ring — 12 sign sectors */}
          {ZODIAC.map((sign, i) => {
            const start = i * 30, mid = start + 15;
            const [x1, y1] = polar(C, C, rSignInner, start, A);
            const [x2, y2] = polar(C, C, rSignOuter, start, A);
            const [gx, gy] = polar(C, C, (rSignInner + rSignOuter) / 2, mid, A);
            const el = ELEMENT_OF[i % 4];
            return (
              <g key={sign}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2c2b45" strokeWidth={1} />
                <text x={gx} y={gy} fill={ELEMENT_TINT[el]} fontSize={15} textAnchor="middle" dominantBaseline="central"
                  style={{ cursor: 'pointer' }} opacity={0.92}>{SIGN_GLYPH[sign]}</text>
                {/* fat hit target */}
                <path d={sectorPath(C, C, rSignInner, rSignOuter, start, start + 30, A)} fill="transparent"
                  style={{ cursor: 'pointer' }} onClick={() => setSel({ kind: 'sign', sign })} />
              </g>
            );
          })}
          <circle cx={C} cy={C} r={rSignOuter} fill="none" stroke="#2c2b45" strokeWidth={1} />
          <circle cx={C} cy={C} r={rSignInner} fill="none" stroke="#2c2b45" strokeWidth={1} />

          {/* House ring (whole-sign) — only with a birth time */}
          {asc != null && (
            <g>
              <circle cx={C} cy={C} r={rHouse} fill="none" stroke="#232238" strokeWidth={1} />
              {Array.from({ length: 12 }).map((_, h) => {
                const cusp = Math.floor(asc / 30) * 30 + h * 30; // whole-sign cusps
                const [x1, y1] = polar(C, C, rAspect, cusp, A);
                const [x2, y2] = polar(C, C, rHouse, cusp, A);
                const [lx, ly] = polar(C, C, rHouse - 12, cusp + 15, A);
                return (
                  <g key={h}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#232238" strokeWidth={h % 3 === 0 ? 1.5 : 1} />
                    <text x={lx} y={ly} fill="#5b5e72" fontSize={8} textAnchor="middle" dominantBaseline="central">{ROMAN[h]}</text>
                  </g>
                );
              })}
              {/* Asc / MC markers */}
              <AngleMark C={C} r={rSignInner} lon={asc} A={A} label="Asc" />
              {mc != null && <AngleMark C={C} r={rSignInner} lon={mc} A={A} label="MC" />}
            </g>
          )}

          {/* Aspect web (single chart) */}
          {!collective && aspects.map((a, i) => {
            const b1 = placed.find((p) => p.b.planet === a.p1)?.b;
            const b2 = placed.find((p) => p.b.planet === a.p2)?.b;
            if (!b1 || !b2) return null;
            const [x1, y1] = polar(C, C, rAspect, b1.lon, A);
            const [x2, y2] = polar(C, C, rAspect, b2.lon, A);
            const st = ASPECT_STYLE[a.type] ?? ASPECT_STYLE.conjunction;
            const strong = Math.max(0.12, 1 - a.orb / 8);
            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={st.color} strokeOpacity={0.28 + 0.5 * strong}
                  strokeWidth={1 + strong} strokeDasharray={st.dash} />
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={12}
                  style={{ cursor: 'pointer' }} onClick={() => setSel({ kind: 'aspect', a })} />
              </g>
            );
          })}

          {/* Planets */}
          {placed.map(({ b, owner, color, r }, i) => {
            const [px, py] = polar(C, C, r, b.lon, A);
            const [tx, ty] = polar(C, C, rPlanet + 24, b.lon, A);
            const c = collective ? color : (PLANET_COLOR[b.planet] ?? '#9a8fe0');
            return (
              <g key={i} style={{ cursor: 'pointer' }} onClick={() => setSel({ kind: 'planet', body: b, owner, color: c })}>
                {/* tick from ring to planet */}
                <line x1={(polar(C, C, rSignInner, b.lon, A))[0]} y1={(polar(C, C, rSignInner, b.lon, A))[1]}
                  x2={px} y2={py} stroke={c} strokeOpacity={0.35} strokeWidth={1} />
                <circle cx={px} cy={py} r={13} fill="#0b0a1a" stroke={c} strokeWidth={1.4} />
                <text x={px} y={py + 0.5} fill={c} fontSize={13} textAnchor="middle" dominantBaseline="central">{PLANET_GLYPH[b.planet] ?? '•'}</text>
                {b.retro && <text x={tx} y={ty} fill="#8a8ea3" fontSize={7} textAnchor="middle" dominantBaseline="central">℞</text>}
                {/* fat invisible hit target for easy tapping */}
                <circle cx={px} cy={py} r={20} fill="transparent" />
              </g>
            );
          })}

          {/* soft center */}
          <circle cx={C} cy={C} r={rAspect} fill="none" stroke="#1c1b30" strokeWidth={1} />
        </svg>

        {/* Guide toggle — small, corner, never covers the wheel */}
        <button onClick={() => setGuide((v) => !v)}
          className="absolute top-1 right-1 w-7 h-7 rounded-full grid place-items-center text-[13px] border"
          style={{ borderColor: '#2c2b45', background: '#11131f', color: guide ? '#e3c07a' : '#8a8ea3' }}
          aria-label={t('How to read the wheel')}>?</button>
        {guide && (
          <div className="absolute top-9 right-1 z-10 w-[220px] rounded-xl border p-3 text-[12px] leading-relaxed af-rise"
            style={{ borderColor: '#2c2b45', background: '#0e1020f2', color: '#cfc8e8' }}>
            <div className="font-semibold mb-1 text-[#e3c07a]">{t('How to read the wheel')}</div>
            <p>{t('The outer ring is the zodiac. Each dot is a planet at the degree it stood when you were born. The lines are aspects — teal flows, amber challenges. Tap anything to open its meaning.')}</p>
            <button onClick={() => setGuide(false)} className="mt-2 text-[#8a8ea3] underline">{t('got it')}</button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2 text-[11px] text-[#8a8ea3]">
        {collective ? (
          people.map((p) => (
            <span key={p.name} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} /> {p.name}
            </span>
          ))
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-[2px]" style={{ background: '#7bd0c6' }} /> {t('flowing')}</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-[2px]" style={{ background: '#e8956a' }} /> {t('challenging')}</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-[2px]" style={{ background: '#b6abec' }} /> {t('conjunct')}</span>
          </>
        )}
      </div>
      {caption && <p className="text-center text-[11px] text-[#5b5e72] mt-1">{caption}</p>}

      {/* Detail bottom sheet */}
      {sel && <DetailSheet sel={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function AngleMark({ C, r, lon, A, label }: { C: number; r: number; lon: number; A: number; label: string }) {
  const [x, y] = polar(C, C, r - 8, lon, A);
  return <text x={x} y={y} fill="#e3c07a" fontSize={9} fontWeight={600} textAnchor="middle" dominantBaseline="central">{label}</text>;
}

// Annular sector path for a sign's hit target.
function sectorPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number, A: number) {
  const [x0o, y0o] = polar(cx, cy, r1, a0, A);
  const [x1o, y1o] = polar(cx, cy, r1, a1, A);
  const [x1i, y1i] = polar(cx, cy, r0, a1, A);
  const [x0i, y0i] = polar(cx, cy, r0, a0, A);
  return `M${x0o} ${y0o} A${r1} ${r1} 0 0 0 ${x1o} ${y1o} L${x1i} ${y1i} A${r0} ${r0} 0 0 1 ${x0i} ${y0i} Z`;
}

function DetailSheet({ sel, onClose }: { sel: NonNullable<Sel>; onClose: () => void }) {
  const t = useT();
  let title = '', glyph = '', color = '#cfc8e8', body = '', sub = '';
  if (sel.kind === 'planet') {
    const b = sel.body;
    const ref = findEntry(PLANETS, b.planet);
    const signRef = findEntry(SIGNS, b.sign);
    glyph = PLANET_GLYPH[b.planet] ?? '•'; color = sel.color;
    title = `${t(b.planet)} ${t('in')} ${t(b.sign)}`;
    sub = `${b.deg.toFixed(1)}° ${b.house ? `· ${t('House')} ${b.house}` : ''}${b.retro ? ' · ℞' : ''}${sel.owner ? ` · ${sel.owner}` : ''}`;
    body = `${ref?.body ?? ''}${signRef ? `  ${signRef.body}` : ''}`;
  } else if (sel.kind === 'sign') {
    const ref = findEntry(SIGNS, sel.sign);
    glyph = SIGN_GLYPH[sel.sign] ?? '✦'; color = ELEMENT_TINT[ELEMENT_OF[ZODIAC.indexOf(sel.sign) % 4]];
    title = t(sel.sign); sub = t(ref?.key ?? ''); body = ref?.body ?? '';
  } else {
    const ref = ASPECT_REF.find((e) => e.name.toLowerCase() === sel.a.type);
    glyph = ref?.glyph ?? '✦'; color = ASPECT_STYLE[sel.a.type]?.color ?? '#cfc8e8';
    title = `${t(sel.a.p1)} ${t(sel.a.type)} ${t(sel.a.p2)}`;
    sub = `${t(ref?.key ?? '')} · ${t('orb')} ${sel.a.orb}°`; body = ref?.body ?? '';
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border af-sheet-rise"
        style={{ borderColor: '#242a3b', background: '#0e1020' }} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mt-2.5 mb-1 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
        <div className="p-5 pb-7">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-full text-[20px] shrink-0"
              style={{ color, border: `1.4px solid ${color}`, background: '#0b0a1a' }}>{glyph}</span>
            <div className="min-w-0">
              <div className="text-[16px] font-semibold text-[#ece9e0]">{title}</div>
              {sub && <div className="text-[12px] text-[#8a8ea3]">{sub}</div>}
            </div>
            <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full grid place-items-center text-[#8a8ea3] hover:text-white" aria-label={t('Close')}>✕</button>
          </div>
          {body && <p className="text-[14px] leading-relaxed text-[#cfc8e8] mt-3">{body}</p>}
        </div>
      </div>
    </div>
  );
}
