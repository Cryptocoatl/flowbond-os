'use client';

/**
 * Animated reciprocity network: golden threads that grow from the Valle de México
 * origin outward to nodes across the Earth, each node igniting as its thread
 * completes, then the whole web breathes and repeats. Pure SVG + CSS (keyframes
 * live in globals.css: `cine-thread-draw` / `cine-node-pop`). Decorative,
 * aria-hidden, and frozen static under prefers-reduced-motion (CSS handles it).
 *
 * viewBox 0..1600 x 0..900 (16:9). Origin sits over Mexico's glow in the art.
 */

const ORIGIN = { x: 430, y: 486 };

// Destinations roughly tracking the landmasses/glows in de-mexico-al-mundo.webp.
const NODES: { x: number; y: number; bow: number; big?: boolean }[] = [
  { x: 250, y: 322, bow: 70 },
  { x: 540, y: 236, bow: 90 },
  { x: 214, y: 604, bow: -60 },
  { x: 612, y: 700, bow: -70 },
  { x: 792, y: 812, bow: -90, big: true },
  { x: 980, y: 300, bow: 120 },
  { x: 1170, y: 372, bow: 150, big: true },
  { x: 1084, y: 566, bow: 90 },
  { x: 1360, y: 612, bow: 150 },
  { x: 1288, y: 812, bow: 60 },
];

const CYCLE = 9; // seconds — shared so the staggered web stays in phase every loop
const SPREAD = 2.6; // seconds of draw stagger across the threads

function arc(nx: number, ny: number, bow: number) {
  const mx = (ORIGIN.x + nx) / 2;
  const my = (ORIGIN.y + ny) / 2;
  const dx = nx - ORIGIN.x;
  const dy = ny - ORIGIN.y;
  const len = Math.hypot(dx, dy) || 1;
  // perpendicular offset for a great-circle-ish arc
  const cx = mx + (-dy / len) * bow;
  const cy = my + (dx / len) * bow;
  return `M${ORIGIN.x},${ORIGIN.y} Q${cx},${cy} ${nx},${ny}`;
}

export default function GlobeThreads() {
  return (
    <svg
      className="globe-threads"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="gt-node" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6df" />
          <stop offset="35%" stopColor="#ffd98a" />
          <stop offset="100%" stopColor="rgba(242,179,64,0)" />
        </radialGradient>
        <linearGradient id="gt-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffe6a8" />
          <stop offset="100%" stopColor="#f2b340" />
        </linearGradient>
      </defs>

      {NODES.map((n, i) => {
        const delay = (i / NODES.length) * SPREAD;
        return (
          <path
            key={`t${i}`}
            className="gt-thread"
            d={arc(n.x, n.y, n.bow)}
            pathLength={1}
            stroke="url(#gt-line)"
            style={{ animationDelay: `${delay}s`, animationDuration: `${CYCLE}s` }}
          />
        );
      })}

      {NODES.map((n, i) => {
        const delay = (i / NODES.length) * SPREAD + SPREAD / NODES.length;
        return (
          <circle
            key={`n${i}`}
            className="gt-node"
            cx={n.x}
            cy={n.y}
            r={n.big ? 26 : 18}
            fill="url(#gt-node)"
            style={{ animationDelay: `${delay}s`, animationDuration: `${CYCLE}s` }}
          />
        );
      })}

      {/* Origin — Valle de México, always lit, gently breathing */}
      <circle className="gt-origin" cx={ORIGIN.x} cy={ORIGIN.y} r={34} fill="url(#gt-node)" />
    </svg>
  );
}
