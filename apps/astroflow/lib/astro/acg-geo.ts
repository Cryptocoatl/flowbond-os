/**
 * Astrocartography → geography. Turns the angular lines from
 * `astrocartography.ts` into map-ready GeoJSON, and finds the multiplayer
 * payload: where two people's lines CROSS — the power spots of a bond, crew or
 * collective ("here your Venus meets their Jupiter").
 *
 * Pure & server-safe (no DOM, no map lib) so it's unit-testable and runs in the
 * server component before handing plain JSON to the MapLibre client.
 */
import { astrocartography } from './astrocartography';
import type { AcgLine, Chart, EcosystemPlace } from './types';

// ── planet identity: colour + glyph + temperament ───────────────────────────
export const PLANET_COLOR: Record<string, string> = {
  Sun: '#e3c07a', Moon: '#cfd3e8', Mercury: '#8fb8e0', Venus: '#7bd0c6',
  Mars: '#e8956a', Jupiter: '#caa6f0', Saturn: '#b6abec', Uranus: '#79d0e8',
  Neptune: '#6fa8f0', Pluto: '#c77b9e',
};
export const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃',
  Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};
// Temperament drives crossing "quality" — astrology's classic benefic / malefic
// split (luminaries read as warm), softened to harmonious / intense for AstroFlow.
const BENEFIC = new Set(['Sun', 'Moon', 'Venus', 'Jupiter']);
const INTENSE = new Set(['Mars', 'Saturn', 'Pluto']);

export const KIND_LABEL: Record<AcgLine['kind'], string> = {
  MC: 'culminating — visibility & calling',
  IC: 'at the root — home & foundations',
  AC: 'rising — vitality & fresh starts',
  DC: 'setting — relationships & encounters',
};

type LngLat = [number, number]; // [lng, lat] — GeoJSON order

/**
 * The polyline(s) a single angular line traces on the map, split at the
 * antimeridian so MapLibre never draws a stripe across the whole world.
 *  - MC/IC are meridians: one vertical segment at constant lng.
 *  - AC/DC are rise/set curves: the sampled lat/lng points, lat-sorted.
 */
export function polylinesOf(line: AcgLine): LngLat[][] {
  if (line.kind === 'MC' || line.kind === 'IC') {
    return [[[line.lng!, -85], [line.lng!, 85]]];
  }
  const pts: LngLat[] = (line.curve ?? [])
    .slice()
    .sort((a, b) => a.lat - b.lat)
    .map((p) => [p.lng, p.lat] as LngLat);
  return splitAntimeridian(pts);
}

/** Break a polyline wherever consecutive points jump >180° in longitude. */
function splitAntimeridian(pts: LngLat[]): LngLat[][] {
  const segs: LngLat[][] = [];
  let cur: LngLat[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (i > 0 && Math.abs(pts[i][0] - pts[i - 1][0]) > 180) {
      if (cur.length >= 2) segs.push(cur);
      cur = [];
    }
    cur.push(pts[i]);
  }
  if (cur.length >= 2) segs.push(cur);
  return segs;
}

export interface LineProps {
  person: string;
  planet: string;
  kind: AcgLine['kind'];
  color: string;
  label: string; // "Venus AC — rising · vitality & fresh starts"
}

/** One person's full set of lines as a GeoJSON FeatureCollection of LineStrings. */
export function linesToGeoJSON(person: string, lines: AcgLine[], color?: string) {
  const features = [];
  for (const line of lines) {
    const props: LineProps = {
      person,
      planet: line.planet,
      kind: line.kind,
      color: color ?? PLANET_COLOR[line.planet] ?? '#9a8fe0',
      label: `${person} · ${line.planet} ${line.kind} — ${KIND_LABEL[line.kind]}`,
    };
    for (const seg of polylinesOf(line)) {
      features.push({
        type: 'Feature' as const,
        properties: props,
        geometry: { type: 'LineString' as const, coordinates: seg },
      });
    }
  }
  return { type: 'FeatureCollection' as const, features };
}

// ── crossings: the multiplayer power spots ──────────────────────────────────
export interface Crossing {
  lat: number;
  lng: number;
  a: { person: string; planet: string; kind: AcgLine['kind'] };
  b: { person: string; planet: string; kind: AcgLine['kind'] };
  quality: 'harmonious' | 'intense' | 'mixed';
  score: number;   // 0–1, higher = stronger/warmer pull
  title: string;   // human one-liner
}

export interface PersonChart {
  name: string;   // first name / display label only — no FBID, no birth data
  color: string;
  chart: Chart;
}

interface IndexedLine {
  person: string;
  line: AcgLine;
  segs: LngLat[][];
  bbox: [number, number, number, number]; // minLng,minLat,maxLng,maxLat
}

function bboxOf(segs: LngLat[][]): [number, number, number, number] {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  for (const seg of segs) for (const [x, y] of seg) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}
const bboxOverlap = (a: number[], b: number[], pad = 0.5) =>
  a[0] - pad <= b[2] && a[2] + pad >= b[0] && a[1] - pad <= b[3] && a[3] + pad >= b[1];

/** Planar segment intersection (lng/lat as x/y — fine at these scales). */
function segInt(p1: LngLat, p2: LngLat, p3: LngLat, p4: LngLat): LngLat | null {
  const d1x = p2[0] - p1[0], d1y = p2[1] - p1[1];
  const d2x = p4[0] - p3[0], d2y = p4[1] - p3[1];
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-9) return null; // parallel
  const t = ((p3[0] - p1[0]) * d2y - (p3[1] - p1[1]) * d2x) / den;
  const u = ((p3[0] - p1[0]) * d1y - (p3[1] - p1[1]) * d1x) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [p1[0] + t * d1x, p1[1] + t * d1y];
}

function intersect(a: IndexedLine, b: IndexedLine): LngLat | null {
  if (!bboxOverlap(a.bbox, b.bbox)) return null;
  for (const sa of a.segs) for (let i = 0; i + 1 < sa.length; i++) {
    for (const sb of b.segs) for (let j = 0; j + 1 < sb.length; j++) {
      const hit = segInt(sa[i], sa[i + 1], sb[j], sb[j + 1]);
      if (hit) return hit;
    }
  }
  return null;
}

function quality(p1: string, p2: string): { quality: Crossing['quality']; score: number } {
  const ben = (BENEFIC.has(p1) ? 1 : 0) + (BENEFIC.has(p2) ? 1 : 0);
  const intense = (INTENSE.has(p1) ? 1 : 0) + (INTENSE.has(p2) ? 1 : 0);
  if (ben >= 1 && intense === 0) return { quality: 'harmonious', score: 0.6 + 0.2 * ben };
  if (intense >= 1 && ben === 0) return { quality: 'intense', score: 0.45 + 0.15 * intense };
  return { quality: 'mixed', score: 0.5 };
}

/**
 * All meaningful crossings between different people's lines. Same-person
 * crossings are skipped (your own lines crossing is just your birth meridian).
 * Results are de-duped by ~1.5° proximity and ranked, warmest first.
 */
export function crossings(people: PersonChart[], cap = 40): Crossing[] {
  const indexed: IndexedLine[] = [];
  for (const p of people) {
    for (const line of astrocartography(p.chart)) {
      const segs = polylinesOf(line);
      if (segs.length) indexed.push({ person: p.name, line, segs, bbox: bboxOf(segs) });
    }
  }

  const out: Crossing[] = [];
  for (let i = 0; i < indexed.length; i++) {
    for (let j = i + 1; j < indexed.length; j++) {
      if (indexed[i].person === indexed[j].person) continue;
      const hit = intersect(indexed[i], indexed[j]);
      if (!hit) continue;
      const A = indexed[i].line, B = indexed[j].line;
      const q = quality(A.planet, B.planet);
      out.push({
        lng: +hit[0].toFixed(3), lat: +hit[1].toFixed(3),
        a: { person: indexed[i].person, planet: A.planet, kind: A.kind },
        b: { person: indexed[j].person, planet: B.planet, kind: B.kind },
        quality: q.quality, score: q.score,
        title: `${indexed[i].person}'s ${A.planet} ${A.kind} × ${indexed[j].person}'s ${B.planet} ${B.kind}`,
      });
    }
  }

  // De-dupe clustered hits (keep the highest-scoring within ~1.5°).
  out.sort((x, y) => y.score - x.score);
  const kept: Crossing[] = [];
  for (const c of out) {
    if (kept.some((k) => Math.abs(k.lat - c.lat) < 1.5 && Math.abs(k.lng - c.lng) < 1.5)) continue;
    kept.push(c);
    if (kept.length >= cap) break;
  }
  return kept;
}

export const QUALITY_COLOR: Record<Crossing['quality'], string> = {
  harmonious: '#7bd0c6', intense: '#e8956a', mixed: '#caa6f0',
};

/** Crossings as GeoJSON points for a circle/symbol layer. */
export function crossingsToGeoJSON(cs: Crossing[]) {
  return {
    type: 'FeatureCollection' as const,
    features: cs.map((c) => ({
      type: 'Feature' as const,
      properties: { ...c, color: QUALITY_COLOR[c.quality] },
      geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
    })),
  };
}

// ── cities a line runs through ──────────────────────────────────────────────
import { CITIES, type City } from '../data/cities';

const D2R = Math.PI / 180;

/** Perpendicular distance (deg) from a point to a segment, lng scaled by cos(lat). */
function pointSegDeg(plng: number, plat: number, a: LngLat, b: LngLat): number {
  const k = Math.cos(plat * D2R) || 1e-6;
  const ax = a[0] * k, ay = a[1], bx = b[0] * k, by = b[1], px = plng * k, py = plat;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export interface CityHit { city: City; orb: number }

/**
 * Major cities a line's polyline(s) run through, within `orbDeg`, nearest first.
 * Ties broken toward larger metros so the recognisable place wins.
 */
export function citiesAlong(coords: LngLat[] | LngLat[][], cities: City[], orbDeg = 1.6, max = 7): CityHit[] {
  const segs: LngLat[][] = Array.isArray(coords[0]?.[0] as any) ? (coords as LngLat[][]) : [coords as LngLat[]];
  const hits: CityHit[] = [];
  for (const c of cities) {
    let best = Infinity;
    for (const seg of segs)
      for (let i = 0; i + 1 < seg.length; i++)
        best = Math.min(best, pointSegDeg(c.lng, c.lat, seg[i], seg[i + 1]));
    if (best <= orbDeg) hits.push({ city: c, orb: +best.toFixed(2) });
  }
  return hits
    .sort((a, b) => a.orb - b.orb || b.city.pop - a.city.pop)
    .slice(0, max);
}

export interface PowerSpot {
  lng: number; lat: number; city: string; country: string;
  planet: string; kind: AcgLine['kind']; orb: number;
}

/**
 * A person's single STRONGEST power spot: the major city where one of their
 * benefic lines (Sun/Moon/Venus/Jupiter) runs tightest. This is the one place
 * we pin per user — personal, not a generic ecosystem marker.
 */
export function strongestSpot(chart: Chart): PowerSpot | null {
  let best: PowerSpot | null = null;
  for (const line of astrocartography(chart)) {
    if (!BENEFIC.has(line.planet)) continue;
    for (const h of citiesAlong(polylinesOf(line), CITIES, 3, 3)) {
      if (!best || h.orb < best.orb)
        best = { lng: h.city.lng, lat: h.city.lat, city: h.city.name, country: h.city.country, planet: line.planet, kind: line.kind, orb: h.orb };
    }
  }
  return best;
}

/** Power spots as GeoJSON points (one per person, optionally tinted per person). */
export function spotsToGeoJSON(spots: Array<PowerSpot & { who?: string; color?: string }>) {
  return {
    type: 'FeatureCollection' as const,
    features: spots.map((s) => ({
      type: 'Feature' as const,
      properties: {
        name: s.who ? `${s.who} · ${s.planet}` : `${s.planet} · ${s.city}`,
        detail: `${s.planet} ${s.kind} runs through ${s.city}, ${s.country}`,
        color: s.color ?? '#e3c07a',
      },
      geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
    })),
  };
}

/** Ecosystem places as GeoJSON points. */
export function placesToGeoJSON(places: EcosystemPlace[]) {
  return {
    type: 'FeatureCollection' as const,
    features: places.map((p) => ({
      type: 'Feature' as const,
      properties: { id: p.id, name: p.name, kind: p.kind },
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
    })),
  };
}
