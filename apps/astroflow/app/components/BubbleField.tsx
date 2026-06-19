'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useT } from '../../lib/i18n/provider';

export interface Bubble {
  handle: string;          // real profiles; '' for ghosts
  name: string;
  color: string;
  sun: string;
  moon: string;
  rising: string | null;
  isMe?: boolean;
  ghost?: boolean;         // a connection you made who hasn't activated their FBID yet
  claimCode?: string;      // ghost activation link code
}

// deterministic pseudo-random (stable layout per person, no Math.random → SSR-safe)
const rng = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// The living bubble constellation: everyone in your flow drifts and glows.
// Real stars open their chart; ghost stars are people you've charted who
// haven't activated their FBID yet — tap one to send their activation link
// and watch their avatar light up for real.
export default function BubbleField({ people }: { people: Bubble[] }) {
  const t = useT();
  const [hover, setHover] = useState<string | null>(null);
  const [copied, setCopied] = useState('');

  const bubbles = useMemo(
    () =>
      people.map((p, i) => ({
        ...p,
        id: p.ghost ? `g:${p.claimCode}` : p.handle,
        left: 6 + rng(i, 1) * 84,            // %
        top: 12 + rng(i, 2) * 64,             // %
        size: p.isMe ? 58 : 40 + rng(i, 3) * 18,
        dur: 7 + rng(i, 4) * 8,                // drift seconds
        delay: -rng(i, 5) * 10,
      })),
    [people],
  );

  function inviteGhost(code: string) {
    navigator.clipboard.writeText(`${window.location.origin}/claim/${code}`);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  }

  if (people.length === 0)
    return (
      <div className="rounded-2xl border border-[#242a3b] bg-[#0e1020] p-6 text-center text-sm text-[#5b5e72]">
        {t('Your sky is quiet — invite friends or open someone’s claim link and the bubbles appear here.')}
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

      {bubbles.map((b) => {
        const star = (
          <>
            <span
              className="rounded-full flex items-center justify-center font-serif text-[#0a0b12] transition-transform group-hover:scale-110"
              style={{
                width: b.size,
                height: b.size,
                background: b.ghost
                  ? `radial-gradient(circle at 32% 30%, #ffffff44, ${b.color}55)`
                  : `radial-gradient(circle at 32% 30%, #ffffffcc, ${b.color})`,
                boxShadow: b.ghost
                  ? `0 0 10px ${b.color}55`
                  : `0 0 ${b.isMe ? 26 : 16}px ${b.color}aa${b.isMe ? `, 0 0 50px ${b.color}44` : ''}`,
                border: b.ghost ? `1px dashed ${b.color}aa` : undefined,
                color: b.ghost ? '#ffffffcc' : '#0a0b12',
                fontSize: b.size * 0.42,
                opacity: b.ghost ? 0.85 : 1,
              }}
            >
              {b.name.charAt(0)}
            </span>
            <span
              className={`mt-1.5 text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full bg-[#0a0b14]/85 border border-white/10 transition-opacity ${hover === b.id ? 'opacity-100' : 'opacity-0'}`}
            >
              <b className="text-[#ece9e0]">{b.name}</b>{' '}
              {b.ghost ? (
                <span className="text-[#8fb8e0]">{copied === b.claimCode ? t('link copied ✓') : t('tap to invite ✦')}</span>
              ) : (
                <span className="text-[#9698a8]">
                  {b.sun} ☉ · {b.moon} ☾{b.rising ? ` · ${b.rising} ↑` : ''}
                </span>
              )}
            </span>
            {hover !== b.id && (
              <span className="mt-1 text-[9px] text-[#5b5e72] group-hover:opacity-0">
                {b.isMe ? t('you') : b.ghost ? t('✦ invite') : b.name.split(' ')[0]}
              </span>
            )}
          </>
        );
        const common = {
          onMouseEnter: () => setHover(b.id),
          onMouseLeave: () => setHover(null),
          className: 'absolute flex flex-col items-center group',
          style: {
            left: `${b.left}%`,
            top: `${b.top}%`,
            animation: `af-drift ${b.dur}s ease-in-out ${b.delay}s infinite`,
            zIndex: hover === b.id ? 30 : 10,
          } as React.CSSProperties,
        };
        return b.ghost ? (
          <button key={b.id} {...common} onClick={() => inviteGhost(b.claimCode!)}>
            {star}
          </button>
        ) : (
          <Link key={b.id} href={`/chart/${b.handle}`} {...common}>
            {star}
          </Link>
        );
      })}

      <Link
        href="/"
        className="absolute bottom-2.5 right-3 text-[10px] uppercase tracking-[0.16em] text-[#b6abec] bg-[#0a0b14]/80 border border-[#9a8fe0]/30 rounded-full px-3 py-1 hover:bg-[#9a8fe0]/15 transition z-20"
      >
        {t('weave in the constellation →')}
      </Link>
    </div>
  );
}
