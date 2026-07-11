'use client';

import { useEffect, useState } from 'react';
import TypeLines from './TypeLines';
import { logOpenflow } from '@/lib/openflow/analytics';

/** §3 Act 5 — the message renders exactly as written. */
const CLOSING_LINES = [
  'Jeff — thank you for being the angel unicorn you are.',
  'You saw infrastructure where others saw chaos, and you offered wind for these wings.',
  'Everything you just walked through was built to serve life — and with your servers under it, it can serve so much more of it.',
  'I am beyond excited to see where our flows bond… and how much of the world we get to help together.',
  'The gate is open. The new era is already flowing.',
  '— Love 🌊',
];

const CONTACT = 'hello@flowbond.life';

const GLYPHS = [
  { g: 'FBID ◈', top: '12%', left: '10%' },
  { g: 'ClauDIA ✦', top: '20%', left: '78%' },
  { g: 'FlowGarden ❋', top: '32%', left: '18%' },
  { g: 'ORIGO ◇', top: '10%', left: '46%' },
  { g: 'FlowStudio ▷', top: '26%', left: '58%' },
  { g: 'MiCelio ⬡', top: '40%', left: '82%' },
  { g: 'FlowMap ✶', top: '44%', left: '6%' },
  { g: 'TulumCoin ✺', top: '36%', left: '40%' },
];

export default function ClosingAct({ onWalkAgain }: { onWalkAgain: () => void }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    logOpenflow('closing_viewed');
  }, []);

  return (
    <div className="of-act of-closing">
      {GLYPHS.map((g, i) => (
        <span key={i} className="of-constellation-glyph" style={{ top: g.top, left: g.left, animationDelay: `${i * 0.9}s, ${6 + i * 0.9}s` }}>
          {g.g}
        </span>
      ))}
      <div className="of-center" style={{ position: 'relative', zIndex: 1 }}>
        <TypeLines className="of-credits" lines={CLOSING_LINES} lineMs={3400} startDelayMs={1400} onDone={() => setDone(true)} />
        <div style={{ marginTop: 46, minHeight: 200 }}>
          {done && (
            <div className="of-finalframe">
              <div className="of-orbitpair" aria-hidden="true">
                <div className="oct" />
                <div className="sig" />
              </div>
              <div className="of-finallinks">
                <button className="of-btn of-btn--ghost" onClick={onWalkAgain}>
                  Walk the book again
                </button>
                <a className="of-btn" href={`mailto:${CONTACT}?subject=OpenFlow%20—%20let%27s%20talk`}>
                  Reply to Love
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
