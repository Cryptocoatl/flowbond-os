/**
 * AstroFlow ephemeris — pure-TS astronomy, no external deps.
 * Ported 1:1 from the Python engine validated against a known birth chart
 * (Sun, Moon, Ascendant, MC, Node and all planets reproduced to the degree).
 *
 * Accuracy: Meeus low-order Sun/Moon; JPL/Standish Keplerian planets (valid
 * 1800–2050); whole-sign houses. Good to ~arcminutes for personal astrology.
 */

export const ZODIAC = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;
export type Sign = (typeof ZODIAC)[number];

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const norm = (a: number) => ((a % 360) + 360) % 360;
const dsin = (x: number) => Math.sin(x * D2R);
const dcos = (x: number) => Math.cos(x * D2R);

export const signOf = (lon: number): Sign => ZODIAC[Math.floor(norm(lon) / 30)];
export const degInSign = (lon: number): number => norm(lon) % 30;

/* ---------- Julian Day ---------- */
export function jdFromUTC(d: Date): number {
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const frac =
    (d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600) / 24;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    B -
    1524.5 +
    frac
  );
}

/* ---------- Sun / Moon (Meeus) ---------- */
export function sunLon(JD: number): number {
  const T = (JD - 2451545.0) / 36525;
  const L0 = norm(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = norm(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * dsin(M) +
    (0.019993 - 0.000101 * T) * dsin(2 * M) +
    0.000289 * dsin(3 * M);
  return norm(L0 + C);
}

const MOON_TERMS: [number, number, number, number, number][] = [
  [6288774, 0, 0, 1, 0], [1274027, 2, 0, -1, 0], [658314, 2, 0, 0, 0],
  [213618, 0, 0, 2, 0], [-185116, 0, 1, 0, 0], [-114332, 0, 0, 0, 2],
  [58793, 2, 0, -2, 0], [57066, 2, -1, -1, 0], [53322, 2, 0, 1, 0],
  [45758, 2, -1, 0, 0], [-40923, 0, 1, -1, 0], [-34720, 1, 0, 0, 0],
  [-30383, 0, 1, 1, 0], [15327, 2, 0, 0, -2], [-12528, 0, 0, 1, 2],
  [10980, 0, 0, 1, -2], [10675, 4, 0, -1, 0], [10034, 0, 0, 3, 0],
  [8548, 4, 0, -2, 0], [-7888, 2, 1, -1, 0], [-6766, 2, 1, 0, 0],
  [-5163, 1, 0, -1, 0], [4987, 1, 1, 0, 0], [4036, 2, -1, 1, 0],
  [3994, 2, 0, 2, 0], [3861, 4, 0, 0, 0], [3665, 2, 0, -3, 0],
];
export function moonLon(JD: number): number {
  const T = (JD - 2451545.0) / 36525;
  const Lp = norm(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T ** 3 / 538841 - T ** 4 / 65194000);
  const D = norm(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T ** 3 / 545868 - T ** 4 / 113065000);
  const M = norm(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T ** 3 / 24490000);
  const Mp = norm(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T ** 3 / 69699 - T ** 4 / 14712000);
  const F = norm(93.272095 + 483202.0175233 * T - 0.0036539 * T * T - T ** 3 / 3526000 + T ** 4 / 863310000);
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  let s = 0;
  for (const [c, dd, mm, mp, ff] of MOON_TERMS) {
    let coef = c;
    if (Math.abs(mm) === 1) coef *= E;
    if (Math.abs(mm) === 2) coef *= E * E;
    s += coef * dsin(dd * D + mm * M + mp * Mp + ff * F);
  }
  return norm(Lp + s / 1000000);
}

/* ---------- obliquity, sidereal time ---------- */
export function obliquity(JD: number): number {
  const T = (JD - 2451545.0) / 36525;
  return 23.439291 - 0.0130042 * T - 0.00000016 * T * T + 0.000000504 * T ** 3;
}
export function gmst(JD: number): number {
  const T = (JD - 2451545.0) / 36525;
  return norm(280.46061837 + 360.98564736629 * (JD - 2451545.0) + 0.000387933 * T * T - T ** 3 / 38710000);
}

/* ---------- angles & node ---------- */
export function ascendant(JD: number, lat: number, lonEast: number): number {
  const eps = obliquity(JD);
  const ramc = norm(gmst(JD) + lonEast);
  const r = ramc * D2R, e = eps * D2R, phi = lat * D2R;
  let asc = norm(Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(e) + Math.tan(phi) * Math.sin(e))) * R2D);
  if (!(norm(asc - ramc) > 0 && norm(asc - ramc) < 180)) asc = norm(asc + 180);
  return asc;
}
export function midheaven(JD: number, lonEast: number): number {
  const eps = obliquity(JD);
  const ramc = norm(gmst(JD) + lonEast) * D2R;
  return norm(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps * D2R)) * R2D);
}
export function meanNode(JD: number): number {
  const T = (JD - 2451545.0) / 36525;
  return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T ** 3 / 467441);
}

/* ---------- planets: JPL/Standish Keplerian (1800–2050) ---------- */
type Elem = [number[], number[]];
const EL: Record<string, Elem> = {
  Mercury: [[0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593], [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
  Venus: [[0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255], [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418]],
  Earth: [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0], [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]],
  Mars: [[1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891], [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
  Jupiter: [[5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
  Saturn: [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
  Uranus: [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503], [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
  Neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]],
  Pluto: [[39.48211675, 0.2488273, 17.14001206, 238.92903833, 224.06891629, 110.30393684], [-0.00031596, 0.0000517, 0.00004818, 145.20780515, -0.04062942, -0.01183482]],
};
function helio(name: string, T: number): [number, number, number] {
  const [e0, r] = EL[name];
  const a = e0[0] + r[0] * T, e = e0[1] + r[1] * T, I = e0[2] + r[2] * T;
  const L = e0[3] + r[3] * T, peri = e0[4] + r[4] * T, node = e0[5] + r[5] * T;
  const w = peri - node;
  let M = norm(L - peri);
  if (M > 180) M -= 360;
  const Mr = M * D2R;
  let E = Mr + e * Math.sin(Mr);
  for (let i = 0; i < 8; i++) E = E - (E - e * Math.sin(E) - Mr) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const wr = w * D2R, Ir = I * D2R, nr = node * D2R;
  const x = (Math.cos(wr) * Math.cos(nr) - Math.sin(wr) * Math.sin(nr) * Math.cos(Ir)) * xp + (-Math.sin(wr) * Math.cos(nr) - Math.cos(wr) * Math.sin(nr) * Math.cos(Ir)) * yp;
  const y = (Math.cos(wr) * Math.sin(nr) + Math.sin(wr) * Math.cos(nr) * Math.cos(Ir)) * xp + (-Math.sin(wr) * Math.sin(nr) + Math.cos(wr) * Math.cos(nr) * Math.cos(Ir)) * yp;
  const z = Math.sin(wr) * Math.sin(Ir) * xp + Math.cos(wr) * Math.sin(Ir) * yp;
  return [x, y, z];
}
export function geoLon(name: string, JD: number): number {
  const T = (JD - 2451545.0) / 36525;
  const [ex, ey] = helio('Earth', T);
  const [px, py] = helio(name, T);
  const lon = norm(Math.atan2(py - ey, px - ex) * R2D);
  return norm(lon + 1.39696 * T); // J2000 -> equinox of date
}
export function isRetrograde(name: string, JD: number): boolean {
  if (name === 'Sun' || name === 'Moon') return false;
  const d = ((geoLon(name, JD + 1) - geoLon(name, JD) + 540) % 360) - 180;
  return d < 0;
}

export const OUTER = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

/** Equatorial RA/Dec (deg) from ecliptic longitude assuming latitude≈0. */
export function eclipticToEquatorial(lon: number, JD: number): { ra: number; dec: number } {
  const eps = obliquity(JD) * D2R, l = lon * D2R;
  const ra = norm(Math.atan2(Math.sin(l) * Math.cos(eps), Math.cos(l)) * R2D);
  const dec = Math.asin(Math.sin(eps) * Math.sin(l)) * R2D;
  return { ra, dec };
}
