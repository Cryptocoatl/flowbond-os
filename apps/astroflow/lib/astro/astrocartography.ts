/**
 * Astrocartography — where each planet's four angular lines fall across Earth.
 *
 *  MC line: meridian where the planet culminates (career/public power)
 *  IC line: opposite meridian (home/roots/foundations)
 *  AC line: curve where the planet rises (self/vitality/new beginnings)
 *  DC line: curve where the planet sets (relationships/encounters)
 *
 * Lines are computed from the birth chart's planetary RA/Dec and the GST at
 * birth — independent of birthplace, so they map the whole globe. Used to tie
 * a person's "power locations" to FlowBond ecosystem places (Lake Travis,
 * Tulum, CDMX …) for retreat / property / event timing.
 */
import { gmst, eclipticToEquatorial } from './ephemeris';
import type { Chart, AcgLine, EcosystemPlace } from './types';

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const wrapLng = (l: number) => ((((l + 180) % 360) + 360) % 360) - 180;

const ACG_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

/** Compute all angular lines for a chart. */
export function astrocartography(chart: Chart): AcgLine[] {
  const GST = gmst(chart.jd); // degrees
  const lines: AcgLine[] = [];

  for (const planet of ACG_PLANETS) {
    const { ra, dec } = eclipticToEquatorial(chart.bodies[planet].abs, chart.jd);

    // MC/IC meridians: longitude where local sidereal time == planet RA
    const mcLng = wrapLng(ra - GST);
    lines.push({ planet, kind: 'MC', lng: mcLng });
    lines.push({ planet, kind: 'IC', lng: wrapLng(mcLng + 180) });

    // AC/DC rise/set curves: for each latitude solve cos(H) = -tan φ tan δ
    const ac: { lat: number; lng: number }[] = [];
    const dc: { lat: number; lng: number }[] = [];
    for (let lat = -70; lat <= 70; lat += 2) {
      const cosH = -Math.tan(lat * D2R) * Math.tan(dec * D2R);
      if (cosH < -1 || cosH > 1) continue; // planet circumpolar / never rises here
      const H = Math.acos(cosH) * R2D; // hour angle at horizon
      // LST = RA + H (setting / west) or RA - H (rising / east); lng = LST - GST
      ac.push({ lat, lng: wrapLng(ra - H - GST) }); // rising → eastern horizon
      dc.push({ lat, lng: wrapLng(ra + H - GST) }); // setting → western horizon
    }
    lines.push({ planet, kind: 'AC', curve: ac });
    lines.push({ planet, kind: 'DC', curve: dc });
  }
  return lines;
}

/** Longitude of a line at a given latitude (for proximity tests). */
function lineLngAtLat(line: AcgLine, lat: number): number | null {
  if (line.kind === 'MC' || line.kind === 'IC') return line.lng!;
  const curve = line.curve!;
  let best: { lat: number; lng: number } | null = null;
  for (const pt of curve) {
    if (!best || Math.abs(pt.lat - lat) < Math.abs(best.lat - lat)) best = pt;
  }
  return best && Math.abs(best.lat - lat) <= 4 ? best.lng : null;
}

export interface PlaceActivation {
  place: EcosystemPlace;
  planet: string;
  kind: AcgLine['kind'];
  orbDeg: number; // angular distance of the place from the line (lng)
}

/**
 * Which planetary lines pass near an ecosystem place — the heart of the
 * ecosystem-timing tie-in. A tight orb (≤ orbDeg) means that location strongly
 * activates that planet's energy for this person (e.g. Venus-AC near Tulum →
 * a place of love/creativity; Saturn-MC near a property → a place to build).
 */
export function activationsAt(chart: Chart, place: EcosystemPlace, orbDeg = 3): PlaceActivation[] {
  const lines = astrocartography(chart);
  const out: PlaceActivation[] = [];
  for (const line of lines) {
    const lng = lineLngAtLat(line, place.lat);
    if (lng === null) continue;
    let d = Math.abs(wrapLng(lng - place.lng));
    if (d > 180) d = 360 - d;
    if (d <= orbDeg) out.push({ place, planet: line.planet, kind: line.kind, orbDeg: +d.toFixed(2) });
  }
  return out.sort((a, b) => a.orbDeg - b.orbDeg);
}

export const LINE_MEANING: Record<string, string> = {
  MC: 'visibility, career & public power',
  IC: 'home, roots & private foundations',
  AC: 'vitality, identity & fresh starts',
  DC: 'relationships, partnership & encounters',
};

/** Rank ecosystem places by how strongly a chart is "activated" there. */
export function rankPlaces(chart: Chart, places: EcosystemPlace[], orbDeg = 4) {
  return places
    .map((p) => ({ place: p, activations: activationsAt(chart, p, orbDeg) }))
    .filter((r) => r.activations.length > 0)
    .sort((a, b) => a.activations[0].orbDeg - b.activations[0].orbDeg);
}
