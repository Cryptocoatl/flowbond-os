/**
 * The opening motif.
 *
 * Not the logo — the logo is saved for the end, where it can actually land.
 * This is quiet and systemic: a heart whose outline is made of individual
 * points, faintly chorded to one another. It reads as an icon at a glance and
 * as a network on a second look, which is the entire thesis of the proposal
 * stated once, softly, before a single word of it.
 *
 * Deterministic, drawn in SVG, no dependencies, no video.
 */

const HEART = (t: number): [number, number] => {
  // Classic parametric heart, scaled into a 0–100 box.
  const a = t * Math.PI * 2;
  const x = 16 * Math.pow(Math.sin(a), 3);
  const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
  return [50 + x * 2.55, 50 - y * 2.55];
};

const N = 56;
const POINTS = Array.from({ length: N }, (_, i) => HEART(i / N));

// Chords between non-adjacent points, thinning as they get longer, so the
// interior reads as connective tissue rather than as noise.
const CHORDS: [number, number, number][] = [];
for (let i = 0; i < N; i++) {
  for (const step of [7, 13, 23]) {
    const j = (i + step) % N;
    if (j <= i) continue;
    const d = Math.hypot(POINTS[i][0] - POINTS[j][0], POINTS[i][1] - POINTS[j][1]);
    CHORDS.push([i, j, Math.max(0, 1 - d / 105)]);
  }
}

export default function HeartSystem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="hsGlow" cx="50%" cy="46%" r="52%">
          <stop offset="0%" stopColor="var(--violet)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--violet)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="46" r="46" fill="url(#hsGlow)" data-hs-glow />

      <g data-hs-chords>
        {CHORDS.map(([i, j, w], k) => (
          <line
            key={k}
            x1={POINTS[i][0]}
            y1={POINTS[i][1]}
            x2={POINTS[j][0]}
            y2={POINTS[j][1]}
            stroke="var(--gold)"
            strokeWidth={0.14}
            opacity={w * 0.3}
          />
        ))}
      </g>

      <g data-hs-nodes>
        {POINTS.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i % 7 === 0 ? 0.85 : 0.5}
            fill={i % 7 === 0 ? 'var(--gold-hi)' : 'var(--gold)'}
            opacity={i % 7 === 0 ? 0.95 : 0.62}
          />
        ))}
      </g>
    </svg>
  );
}
