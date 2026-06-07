'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export interface Bubble {
  handle: string;
  name: string;
  color: string;
  sun: string;
  moon: string;
  rising: string | null;
  isMe?: boolean;
}

// deterministic pseudo-random (stable layout per person, no Math.random → SSR-safe)
const rng = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// The living bubble constellation: everyone in your flow, drifting and
// glowing. Tap a star to open their chart; weave them in the constellation.
export default function BubbleField({ people }: { people: Bubble[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const bubbles = useMemo(
    () =>
      people.map((p, i) => ({
        ...p,
        left: 6 + rng(i, 1) * 84,            // %
        top: 12 + rng(i, 2) * 64,             // %
        size: p.isMe ? 58 : 40 + rng(i, 3) * 18,
        dur: 7 + rng(i, 4) * 8,                // drift seconds
        delay: -rng(i, 5) * 10,
      })),
    [people],
  );

  if (people.length === 0)
    return (
      <div className="rounded-2xl border border-[#242a3b] bg-[#0e1020] p-6 text-center text-sm text-[#5b5e72]">
        Your sky is quiet — invite friends or open someone&apos;s claim link and the bubbles appear here.
      </div>
    );

  return (
    <div
      className="relative h-64 sm:h-72 rounded-2xl overflow-hidden border border-[#242a3b]"
      style={{
        background:
          'radial-gradient(500px 260px at 70% -10%, rgba(154,143,224,0.16), transparent 65%), radial-gradient(380px 220px at 8% 115%, rgba(123,208,198,0.12), transparent 65%), #0c0e1c',
      }}
    >
      {/* faint starscape */}
      {Array.from({ length: 26 }, (_, i) => (
        <span
          key={`s${i}`}
          className="absolute rounded-full bg-white"
          style={{
            left: `${rng(i, 7) * 100}%`,
            top: `${rng(i, 8) * 100}%`,
            width: 2,
            height: 2,
            opacity: 0.35,
            animation: `af-twinkle ${3 + rng(i, 9) * 4}s ease-in-out ${-rng(i, 10) * 5}s infinite`,
          }}
        />
      ))}

      {bubbles.map((b) => (
        <Link
          key={b.handle}
          href={`/chart/${b.handle}`}
          onMouseEnter={() => setHover(b.handle)}
          onMouseLeave={() => setHover(null)}
          className="absolute flex flex-col items-center group"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            animation: `af-drift ${b.dur}s ease-in-out ${b.delay}s infinite`,
            zIndex: hover === b.handle ? 30 : 10,
          }}
        >
          <span
            className="rounded-full flex items-center justify-center font-serif text-[#0a0b12] transition-transform group-hover:scale-110"
            style={{
              width: b.size,
              height: b.size,
              background: `radial-gradient(circle at 32% 30%, #ffffffcc, ${b.color})`,
              boxShadow: `0 0 ${b.isMe ? 26 : 16}px ${b.color}aa${b.isMe ? `, 0 0 50px ${b.color}44` : ''}`,
              fontSize: b.size * 0.42,
            }}
          >
            {b.name.charAt(0)}
          </span>
          <span
            className={`mt-1.5 text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full bg-[#0a0b14]/85 border border-white/10 transition-opacity ${hover === b.handle ? 'opacity-100' : 'opacity-0'}`}
          >
            <b className="text-[#ece9e0]">{b.name}</b>{' '}
            <span className="text-[#9698a8]">
              {b.sun} ☉ · {b.moon} ☾{b.rising ? ` · ${b.rising} ↑` : ''}
            </span>
          </span>
          {!hover && (
            <span className="mt-1 text-[9px] text-[#5b5e72] group-hover:opacity-0">{b.isMe ? 'you' : b.name.split(' ')[0]}</span>
          )}
        </Link>
      ))}

      <Link
        href="/"
        className="absolute bottom-2.5 right-3 text-[10px] uppercase tracking-[0.16em] text-[#b6abec] bg-[#0a0b14]/80 border border-[#9a8fe0]/30 rounded-full px-3 py-1 hover:bg-[#9a8fe0]/15 transition z-20"
      >
        weave in the constellation →
      </Link>
    </div>
  );
}
