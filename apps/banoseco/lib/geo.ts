// Privacy-first location handling.
//
// Posture (chosen with the user): the device knows the precise position, but
// the server must never need it. For "nodes near me" we snap the user's
// coordinate to a coarse grid cell (~550 m) and send only the cell centre.
// Many users in the same block collapse to the same point (k-anonymity-ish),
// and the precise dot is rendered locally only. Exact precision is opt-in.

export const COARSE_CELL_DEG = 0.005; // ~0.55 km at CDMX latitude

export interface LatLng {
  lat: number;
  lng: number;
}

/** Snap a coordinate to the centre of its ~550 m grid cell. */
export function coarsen(p: LatLng, cell = COARSE_CELL_DEG): LatLng {
  const snap = (v: number) => Math.round(v / cell) * cell + cell / 2;
  // round to 4 decimals so the value can't carry extra precision in transit
  const r = (v: number) => Math.round(v * 1e4) / 1e4;
  return { lat: r(snap(p.lat)), lng: r(snap(p.lng)) };
}

/** Haversine distance in km — used client-side so we never round-trip coords. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const PRECISE_KEY = 'bs.preciseLocation';

/** Whether the user opted in to sending exact coordinates (default: false). */
export function preciseOptIn(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(PRECISE_KEY) === '1';
}

export function setPreciseOptIn(on: boolean): void {
  if (typeof localStorage === 'undefined') return;
  if (on) localStorage.setItem(PRECISE_KEY, '1');
  else localStorage.removeItem(PRECISE_KEY);
}

/**
 * The coordinate to send to the server for proximity queries.
 * Precise only if the user explicitly opted in; otherwise the coarse cell.
 */
export function queryCoord(precise: LatLng): LatLng {
  return preciseOptIn() ? precise : coarsen(precise);
}
