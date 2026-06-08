// A self-contained cinematic "clip" — animated graded scene, letterbox,
// grain, vignette. No video assets: each frame is a deterministic CSS mesh
// driven by `seed`, so the same seed always renders the same look.

const PALETTES = [
  ['#0c4a6e', '#0f766e', '#f59e0b', '#7c2d12'], // teal dusk → amber
  ['#1e1b4b', '#2dd4bf', '#fbbf24', '#831843'], // indigo → mint → gold
  ['#052e2b', '#14b8a6', '#fb7185', '#451a03'], // deep teal → rose
  ['#0b132b', '#3b82f6', '#f59e0b', '#1c1917'], // night blue → amber
  ['#064e3b', '#34d399', '#fde68a', '#78350f'], // forest → emerald → wheat
  ['#1a0b2e', '#8b5cf6', '#22d3ee', '#0c4a6e'], // violet nebula → cyan
  ['#3f0d12', '#f43f5e', '#fbbf24', '#1c1917'], // crimson → gold
  ['#022c22', '#2dd4bf', '#fcd34d', '#0c4a6e'], // teal → sun
];

function mesh(seed: number): string {
  const p = PALETTES[seed % PALETTES.length];
  const a = (seed * 37) % 100;
  const b = (seed * 71) % 100;
  const c = (seed * 53) % 100;
  return [
    `radial-gradient(80% 70% at ${a}% ${b}%, ${p[1]}cc 0%, transparent 55%)`,
    `radial-gradient(70% 60% at ${100 - a}% ${c}%, ${p[2]}aa 0%, transparent 50%)`,
    `radial-gradient(120% 120% at 50% 120%, ${p[3]} 0%, transparent 60%)`,
    `linear-gradient(135deg, ${p[0]} 0%, #05070a 100%)`,
  ].join(', ');
}

export default function FilmFrame({
  seed = 0,
  className = '',
  kb2 = false,
}: {
  seed?: number;
  className?: string;
  kb2?: boolean;
}) {
  return (
    <div className={`filmframe ${className}`}>
      <div
        className={`scene animate-grade ${kb2 ? 'animate-kenburns-2' : 'animate-kenburns'}`}
        style={{ background: mesh(seed) }}
      />
      <div className="grade" />
      <div className="scan animate-scan" />
      <div className="vignette" />
      <div className="grain-layer animate-grain" />
      <div className="bar bar-t" />
      <div className="bar bar-b" />
    </div>
  );
}
