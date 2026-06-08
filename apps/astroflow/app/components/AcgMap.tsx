'use client';

import { useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import { CITIES } from '../../lib/data/cities';
import { citiesAlong, KIND_LABEL, PLANET_GLYPH, PLANET_COLOR } from '../../lib/astro/acg-geo';

export type FeatureCollection = { type: 'FeatureCollection'; features: any[] };
export interface GlobeLayer { id: string; geojson: FeatureCollection }
export interface LegendItem { label: string; color: string }

interface Props {
  layers: GlobeLayer[];
  crossings?: FeatureCollection;
  places?: FeatureCollection;
  legend?: LegendItem[];
  crossingKey?: LegendItem[];
  focus?: [number, number];
}

const W = 880, H = 440;
const KINDS: Array<'MC' | 'IC' | 'AC' | 'DC'> = ['MC', 'IC', 'AC', 'DC'];
const PLANET_ORDER = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

const PRESETS: Array<{ label: string; planets?: string[]; kinds?: Array<'MC' | 'IC' | 'AC' | 'DC'> }> = [
  { label: 'All' },
  { label: 'Benefics', planets: ['Sun', 'Moon', 'Venus', 'Jupiter'] },
  { label: 'Love', planets: ['Venus', 'Moon'], kinds: ['AC', 'DC'] },
  { label: 'Career', kinds: ['MC'] },
  { label: 'Home', kinds: ['IC'] },
  { label: 'Growth', planets: ['Jupiter', 'Sun'] },
  { label: 'Depth', planets: ['Saturn', 'Pluto'] },
];

const land = feature(worldData as any, (worldData as any).objects.countries) as unknown as FeatureCollection;
const clampK = (k: number) => Math.min(12, Math.max(1, k));

// Info shown in the bottom sheet when you tap something.
type Info = { title: string; titleColor?: string; sub?: string; body?: string };

export default function AcgMap({ layers, crossings, places, legend, crossingKey, focus }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const planetsPresent = useMemo(() => {
    const s = new Set<string>();
    layers.forEach((l) => l.geojson.features.forEach((f) => s.add(f.properties.planet)));
    return PLANET_ORDER.filter((p) => s.has(p));
  }, [layers]);
  const [onPlanets, setOnPlanets] = useState<Set<string>>(new Set(planetsPresent));
  const [onKinds, setOnKinds] = useState<Set<string>>(new Set(KINDS));
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const multi = layers.length > 1;

  const { path, project } = useMemo(() => {
    const proj = geoNaturalEarth1().fitSize([W, H], { type: 'Sphere' } as any);
    return { path: geoPath(proj), project: (c: [number, number]) => proj(c) };
  }, []);

  const initial = useMemo(() => {
    if (!focus) return { k: 1, x: 0, y: 0 };
    const p = project(focus); const k = 2.6;
    return p ? { k, x: W / 2 - k * p[0], y: H / 2 - k * p[1] } : { k: 1, x: 0, y: 0 };
  }, [focus, project]);
  const [view, setView] = useState(initial);

  const landPath = useMemo(() => path(land as any) || '', [path]);
  const gratPath = useMemo(() => path(geoGraticule10() as any) || '', [path]);
  const spherePath = useMemo(() => path({ type: 'Sphere' } as any) || '', [path]);

  // ── unified pointer handling: 1 finger pans, 2 fingers pinch-zoom ──
  const pts = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pinch = useRef<{ dist: number; k: number; mx: number; my: number; vx: number; vy: number } | null>(null);
  const toVB = (clientX: number, clientY: number) => {
    const r = wrap.current!.getBoundingClientRect();
    return [((clientX - r.left) / r.width) * W, ((clientY - r.top) / r.height) * H] as const;
  };

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 1) pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    if (pts.current.size === 2) { pan.current = null; startPinch(); }
  };
  const startPinch = () => {
    const [a, b] = [...pts.current.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const [mx, my] = toVB((a.x + b.x) / 2, (a.y + b.y) / 2);
    pinch.current = { dist, k: view.k, mx, my, vx: view.x, vy: view.y };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // capture refs into locals — the setView updater may run after a pointerup
    // has cleared pan/pinch, so we must not read .current inside it.
    const pc = pinch.current, pn = pan.current;
    if (pts.current.size >= 2 && pc) {
      const [a, b] = [...pts.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const k = clampK(pc.k * (dist / pc.dist));
      setView({ k, x: pc.mx - (pc.mx - pc.vx) * (k / pc.k), y: pc.my - (pc.my - pc.vy) * (k / pc.k) });
    } else if (pn) {
      const r = wrap.current!.getBoundingClientRect(); const sx = W / r.width, sy = H / r.height;
      setView((v) => ({ ...v, x: pn.vx + (e.clientX - pn.x) * sx, y: pn.vy + (e.clientY - pn.y) * sy }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) pinch.current = null;
    if (pts.current.size === 1) { const [p] = [...pts.current.values()]; pan.current = { x: p.x, y: p.y, vx: view.x, vy: view.y }; }
    if (pts.current.size === 0) pan.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    const [mx, my] = toVB(e.clientX, e.clientY);
    setView((v) => { const k = clampK(v.k * (e.deltaY < 0 ? 1.2 : 1 / 1.2)); return { k, x: mx - (mx - v.x) * (k / v.k), y: my - (my - v.y) * (k / v.k) }; });
  };

  const lineClick = (f: any) => {
    const near = citiesAlong(f.geometry.coordinates, CITIES);
    setInfo({
      title: `${multi ? f.properties.person + ' · ' : ''}${f.properties.planet} ${f.properties.kind}`,
      titleColor: f.properties.color,
      sub: KIND_LABEL[f.properties.kind as 'MC'],
      body: near.length ? `Runs through ${near.map((h) => h.city.name).join(' · ')}` : 'Crosses open ocean / few major cities here',
    });
  };

  const toggle = (set: Set<string>, key: string, fn: (s: Set<string>) => void) => { const n = new Set(set); n.has(key) ? n.delete(key) : n.add(key); fn(n); };
  const applyPreset = (p: typeof PRESETS[number]) => { setOnPlanets(new Set(p.planets ?? planetsPresent)); setOnKinds(new Set(p.kinds ?? KINDS)); };
  const visible = (f: any) => onPlanets.has(f.properties.planet) && onKinds.has(f.properties.kind);

  return (
    <div ref={wrap} className="relative w-full rounded-2xl overflow-hidden border border-[#242a3b] bg-[#06070f] select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block touch-none cursor-grab active:cursor-grabbing"
        onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onClick={(e) => { if ((e.target as Element).tagName === 'svg') setInfo(null); }}
      >
        <defs>
          <radialGradient id="acg-ocean" cx="50%" cy="42%" r="75%">
            <stop offset="0%" stopColor="#0d1124" /><stop offset="100%" stopColor="#06070f" />
          </radialGradient>
        </defs>
        <path d={spherePath} fill="url(#acg-ocean)" stroke="#1b2138" strokeWidth={0.6} />

        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          <path d={gratPath} fill="none" stroke="#161c30" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
          <path d={landPath} fill="#161a2b" stroke="#2c3350" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />

          {layers.flatMap((layer) =>
            hiddenLayers.has(layer.id) ? [] : layer.geojson.features.map((f, i) => {
              if (!visible(f)) return null;
              const d = path(f); if (!d) return null;
              return (
                <g key={`${layer.id}-${i}`}>
                  {/* fat invisible hit-target for easy tapping on mobile */}
                  <path d={d} fill="none" stroke="transparent" strokeWidth={16} vectorEffect="non-scaling-stroke"
                    style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); lineClick(f); }} />
                  <path d={d} fill="none" stroke={f.properties.color} strokeWidth={1.5} strokeOpacity={0.85}
                    strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }} />
                </g>
              );
            }),
          )}

          {places?.features.map((f, i) => {
            const p = project(f.geometry.coordinates); if (!p) return null;
            const col = (f.properties.color as string) ?? '#e3c07a';
            return (
              <g key={`pl-${i}`} style={{ cursor: 'pointer' }}
                 onClick={(e) => { e.stopPropagation(); setInfo({ title: f.properties.name, titleColor: col, sub: 'strongest power spot', body: f.properties.detail }); }}>
                <circle cx={p[0]} cy={p[1]} r={14 / view.k} fill="transparent" />
                <circle cx={p[0]} cy={p[1]} r={11 / view.k} fill={col} opacity={0.2} />
                <path d={`M${p[0]},${p[1] - 6 / view.k} l${4 / view.k},${10 / view.k} l${-4 / view.k},${-3 / view.k} l${-4 / view.k},${3 / view.k} Z`}
                      fill={col} stroke="#0a0b12" strokeWidth={1 / view.k} />
                <text x={p[0]} y={p[1] - 9 / view.k} fontSize={11 / view.k} textAnchor="middle" fill={col}
                      style={{ paintOrder: 'stroke', stroke: '#06070f', strokeWidth: 2.4 / view.k, pointerEvents: 'none' }}>{f.properties.name}</text>
              </g>
            );
          })}

          {crossings?.features.map((f, i) => {
            const p = project(f.geometry.coordinates); if (!p) return null;
            const col = f.properties.color as string; const r = 8 + 10 * (f.properties.score ?? 0.5);
            return (
              <g key={`cx-${i}`} style={{ cursor: 'pointer' }}
                 onClick={(e) => { e.stopPropagation(); setInfo({ title: f.properties.title, titleColor: col, sub: `${f.properties.quality} crossing` }); }}>
                <circle cx={p[0]} cy={p[1]} r={Math.max(r, 14) / view.k} fill={col} opacity={0.22} />
                <circle cx={p[0]} cy={p[1]} r={4.5 / view.k} fill={col} stroke="#fff" strokeOpacity={0.85} strokeWidth={1.4 / view.k} />
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── filter drawer (collapsed by default — mobile-clean) ── */}
      <div className="absolute top-2.5 left-2.5 right-14">
        <button onClick={() => setShowFilters((s) => !s)}
          className="text-[11px] px-3 py-1.5 rounded-full bg-[#0d0f1c]/90 border border-[#2c3350] text-[#cfc8e8] active:scale-95 transition">
          ⚲ Filter lines {showFilters ? '▲' : '▼'}
        </button>
        {showFilters && (
          <div className="mt-1.5 px-2.5 py-2 rounded-xl bg-[#0d0f1c]/92 border border-[#242a3b] backdrop-blur-sm max-w-[420px]">
            <div className="flex flex-wrap gap-1 mb-2">
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => applyPreset(p)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-[#2c3350] text-[#cfc8e8] active:bg-[#1a1f33] transition">{p.label}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {planetsPresent.map((p) => {
                const on = onPlanets.has(p);
                return (
                  <button key={p} title={p} onClick={() => toggle(onPlanets, p, setOnPlanets)}
                    className="w-7 h-7 rounded-full grid place-items-center text-[13px] border transition"
                    style={{ borderColor: on ? PLANET_COLOR[p] : '#2c3350', color: on ? PLANET_COLOR[p] : '#4a5068', background: on ? `${PLANET_COLOR[p]}1a` : 'transparent' }}>{PLANET_GLYPH[p]}</button>
                );
              })}
              <span className="w-px self-stretch bg-white/10 mx-0.5" />
              {KINDS.map((k) => {
                const on = onKinds.has(k);
                return (
                  <button key={k} onClick={() => toggle(onKinds, k, setOnKinds)}
                    className="text-[11px] px-2 h-7 rounded-md border transition"
                    style={{ borderColor: on ? '#b6abec' : '#2c3350', color: on ? '#cfc8e8' : '#4a5068', background: on ? '#b6abec1a' : 'transparent' }}>{k}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* zoom controls */}
      <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
        {([['+', 1.4], ['–', 1 / 1.4]] as const).map(([label, f]) => (
          <button key={label} onClick={() => setView((v) => ({ ...v, k: clampK(v.k * f) }))}
            className="w-9 h-9 rounded-lg bg-[#0d0f1c]/90 border border-[#2c3350] text-[#cfc8e8] text-xl leading-none active:scale-95 transition">{label}</button>
        ))}
        <button onClick={() => setView(initial)} title="reset view"
          className="w-9 h-9 rounded-lg bg-[#0d0f1c]/90 border border-[#2c3350] text-[#cfc8e8] text-sm active:scale-95 transition">⌖</button>
      </div>

      {/* legend — bottom-left; people are tap-toggles in multiplayer */}
      {!info && (legend?.length || crossingKey?.length) && (
        <div className="absolute z-10 left-2.5 bottom-2.5 px-3 py-2 rounded-xl bg-[#0d0f1c]/85 border border-[#242a3b] backdrop-blur-sm text-[11px] text-[#cfc8e8] max-h-[40%] max-w-[55%] overflow-auto">
          {legend?.map((l, i) => {
            const id = `p${i}`; const off = multi && hiddenLayers.has(id);
            return (
              <button key={l.label} disabled={!multi} onClick={() => multi && toggle(hiddenLayers, id, setHiddenLayers)}
                className={`flex items-center gap-2 py-0.5 w-full text-left ${off ? 'opacity-35' : ''}`}>
                <span className="w-3 h-[2px] rounded-full" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }} />{l.label}
              </button>
            );
          })}
          {crossingKey?.length ? (
            <div className="mt-1.5 pt-1.5 border-t border-white/10">
              <div className="text-[9px] uppercase tracking-wider text-[#5b5e72] mb-1">crossings</div>
              {crossingKey.map((k) => (
                <div key={k.label} className="flex items-center gap-2 py-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: k.color, boxShadow: `0 0 6px ${k.color}` }} />{k.label}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* ── info bottom sheet ── */}
      {info && (
        <div className="absolute left-0 right-0 bottom-0 z-20 px-4 pt-3 pb-4 bg-[#0d0f1c]/96 border-t border-[#2c3350] backdrop-blur-md"
             style={{ animation: 'af-rise 0.2s ease-out' }}>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="font-serif text-base" style={{ color: info.titleColor ?? '#ece9e0' }}>{info.title}</div>
              {info.sub && <div className="text-xs text-[#9698a8] mt-0.5 capitalize">{info.sub}</div>}
              {info.body && <div className="text-sm text-[#cfc8e8] mt-1.5 leading-relaxed">{info.body}</div>}
            </div>
            <button onClick={() => setInfo(null)} className="text-[#9698a8] text-lg leading-none px-1 active:scale-90">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
