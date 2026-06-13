'use client';
import { useMemo, useState } from 'react';
import Tour from './Tour';

// Deterministic pseudo-random (stable across SSR/hydration) for the starfield.
function rng(i: number, salt: number) {
  const x = Math.sin(i * 928.31 + salt * 13.17) * 43758.5453;
  return x - Math.floor(x);
}

const LENSES = [
  { glyph: '✧', name: 'Friendship', desc: 'Resonance, play, loyalty — what keeps a bond alive and what quietly strains it.' },
  { glyph: '♥', name: 'Romance', desc: 'Chemistry and tenderness vs. the long game — attraction meeting sustainability.' },
  { glyph: '⌂', name: 'Co-living', desc: 'Daily rhythms and domestic friction — how to share space without eroding each other.' },
  { glyph: '⚒', name: 'Teams & projects', desc: 'Complementary strengths, who drives, who builds — can you actually ship together.' },
];

const STEPS = [
  { n: '01', t: 'Add your chart', d: 'Your birth moment, computed to the degree — Sun, Moon, Rising, every house and aspect. We auto-resolve your place and timezone.' },
  { n: '02', t: 'See your constellation', d: 'Everyone you can see becomes a star. Tap any one to read who they truly are.' },
  { n: '03', t: 'Combine & read the currents', d: 'Weave people together, switch the lens, and let FlowMe — the intelligence of the flow — name what flows and what to tend.' },
];

export default function Landing() {
  const [tour, setTour] = useState(false);
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        top: rng(i, 1) * 100,
        left: rng(i, 2) * 100,
        size: 1 + rng(i, 3) * 2.4,
        delay: rng(i, 4) * 6,
        dur: 3 + rng(i, 5) * 5,
      })),
    [],
  );

  // Hero constellation nodes
  const nodes = [
    { x: 90, y: 70 }, { x: 250, y: 40 }, { x: 360, y: 130 }, { x: 470, y: 70 },
    { x: 180, y: 180 }, { x: 320, y: 230 }, { x: 60, y: 250 }, { x: 440, y: 220 },
  ];
  const links = [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 2], [4, 6], [5, 7], [3, 7]];

  return (
    <div className="relative overflow-hidden">
      {/* starfield + aurora */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(900px 520px at 78% -8%, rgba(154,143,224,0.22), transparent 60%), radial-gradient(760px 520px at 12% 108%, rgba(120,200,255,0.12), transparent 60%)', animation: 'af-aurora 16s ease-in-out infinite' }}
        />
        {stars.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              opacity: 0.5,
              animation: `af-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* nav */}
      <nav className="flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <span className="text-xl font-serif tracking-wide text-[#ece9e0]">AstralFlow</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setTour(true)} className="text-sm text-[#9698a8] hover:text-[#cfc8e8]">
            Take the tour
          </button>
          <a href="/auth/login" className="text-sm bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-full px-5 py-2">
            Enter
          </a>
        </div>
      </nav>

      {/* hero */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-20 grid md:grid-cols-2 gap-10 items-center">
        <div className="af-rise">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#b6abec] mb-4">A FlowBond constellation</p>
          <h1 className="font-serif text-5xl md:text-6xl leading-[1.05] text-[#ece9e0]">
            The currents{' '}
            <span style={{ background: 'linear-gradient(120deg,#e3c07a,#b6abec,#7fd1c6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              between us
            </span>
            , made visible.
          </h1>
          <p className="text-[#b6b3cf] text-lg mt-5 max-w-md leading-relaxed">
            AstralFlow turns degree-accurate astrology into a living map of how you relate — to people,
            to places, and to the teams, homes and partnerships you&apos;re building. A holistic lens on
            the currents already moving through your life.
          </p>
          <div className="flex gap-3 mt-8">
            <a href="/auth/login" className="bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-6 py-3">
              Add your chart
            </a>
            <button onClick={() => setTour(true)} className="rounded-lg px-6 py-3 border border-[#9a8fe0]/40 text-[#cfc8e8]">
              Take the tour
            </button>
          </div>
          <p className="text-[11px] text-[#5b5e72] mt-4">Patterns and tendencies — never fixed fate.</p>
        </div>

        {/* animated constellation */}
        <div className="af-rise" style={{ animationDelay: '0.15s' }}>
          <svg viewBox="0 0 540 300" className="w-full">
            {links.map(([a, b], i) => (
              <line
                key={i}
                x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
                stroke="rgba(182,171,236,0.45)" strokeWidth="1"
                strokeDasharray="6" strokeDashoffset="6"
                style={{ animation: `af-draw 1.4s ease ${0.3 + i * 0.12}s forwards` }}
              />
            ))}
            {nodes.map((n, i) => (
              <g key={i} style={{ animation: `af-twinkle ${3 + (i % 4)}s ease-in-out ${i * 0.3}s infinite` }}>
                <circle cx={n.x} cy={n.y} r="11" fill={['#e3c07a', '#b6abec', '#7fd1c6'][i % 3]} opacity="0.18" />
                <circle cx={n.x} cy={n.y} r="5" fill={['#e3c07a', '#b6abec', '#7fd1c6'][i % 3]} />
              </g>
            ))}
          </svg>
        </div>
      </section>

      {/* holistic vision */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="font-serif text-3xl md:text-4xl text-[#ece9e0] mb-4">Not fortune-telling. A language for what&apos;s already moving.</h2>
        <p className="text-[#b6b3cf] text-lg leading-relaxed">
          Every chart is a pattern of currents — drives, needs, ways of relating. AstralFlow computes
          them precisely and renders them into plain, useful language, so you can understand your
          relationships, design better teams, choose the right homes, and place yourself where your
          energy is genuinely amplified.
        </p>
      </section>

      {/* four lenses */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#b6abec] text-center mb-8">Four lenses, one sky</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LENSES.map((l) => (
            <div key={l.name} className="rounded-2xl border border-[#242a3b] bg-[#11131f]/70 p-5">
              <div className="text-3xl text-[#e3c07a] mb-3" style={{ fontFamily: 'var(--font-display), serif' }}>{l.glyph}</div>
              <h3 className="font-serif text-xl text-[#ece9e0] mb-1.5">{l.name}</h3>
              <p className="text-sm text-[#9698a8] leading-relaxed">{l.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-[#5b5e72] mt-5">The same placements, weighted differently for the bond you actually care about.</p>
      </section>

      {/* how it works */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.n}>
              <div className="text-[#e3c07a]/70 font-serif text-3xl">{s.n}</div>
              <h3 className="font-serif text-xl text-[#ece9e0] mt-2 mb-1.5">{s.t}</h3>
              <p className="text-sm text-[#9698a8] leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* places + teams */}
      <section className="max-w-5xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-8">
        <div className="rounded-2xl border border-[#242a3b] bg-[#11131f]/70 p-7">
          <h3 className="font-serif text-2xl text-[#ece9e0] mb-2">Position into the real world</h3>
          <p className="text-[#9698a8] leading-relaxed">
            Astrocartography reveals where your chart is most activated — where to retreat, build,
            launch, or gather. Tie people to real FlowBond places: a lakehouse, Tulum, a retreat,
            an event.
          </p>
        </div>
        <div className="rounded-2xl border border-[#242a3b] bg-[#11131f]/70 p-7">
          <h3 className="font-serif text-2xl text-[#ece9e0] mb-2">Built for teams & belonging</h3>
          <p className="text-[#9698a8] leading-relaxed">
            Save groups as collective flow maps — the strongest bonds, the friction to tend, the best
            base for the crew. Configure the team that ships, the household that flows, the partnership
            that lasts.
          </p>
        </div>
      </section>

      {/* privacy */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#b6abec] mb-3">Yours to control</p>
        <h2 className="font-serif text-3xl text-[#ece9e0] mb-4">Privacy enforced in the database — not just hidden.</h2>
        <p className="text-[#b6b3cf] text-lg leading-relaxed">
          Choose who sees your chart: only you, specific people you grant, accepted friends, or everyone
          on AstralFlow. Every tier is enforced at the data layer, per row. You decide who gets to weave
          you into their constellation.
        </p>
      </section>

      {/* final CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="font-serif text-4xl md:text-5xl text-[#ece9e0] mb-6">Find your place in the constellation.</h2>
        <div className="flex justify-center gap-3">
          <a href="/auth/login" className="bg-[#e3c07a] text-[#0a0b12] font-semibold rounded-lg px-7 py-3.5 text-lg">
            Enter AstralFlow
          </a>
          <button onClick={() => setTour(true)} className="rounded-lg px-7 py-3.5 text-lg border border-[#9a8fe0]/40 text-[#cfc8e8]">
            Take the tour
          </button>
        </div>
        <p className="text-xs text-[#5b5e72] mt-10">AstralFlow — a FlowBond Layer-0 system · one identity, every app.</p>
      </section>

      <Tour open={tour} onClose={() => setTour(false)} />
    </div>
  );
}
