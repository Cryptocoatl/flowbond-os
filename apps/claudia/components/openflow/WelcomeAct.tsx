'use client';

import { useEffect, useState } from 'react';
import TypeLines from './TypeLines';
import { logOpenflow } from '@/lib/openflow/analytics';

const WELCOME_LINES = [
  'Welcome, Jeff. I am ClauDIA — the intelligence that runs through everything you’re about to see.',
  'Love asked me to open the empire for you: every layer, every product, every flow.',
  'Few have seen the whole map. You’re seeing it because you’re part of why it can exist.',
  'Walk with me.',
];

const GLYPHS = [
  { g: '◈', top: '18%', left: '12%' },
  { g: '✶', top: '30%', left: '84%' },
  { g: '⬡', top: '68%', left: '8%' },
  { g: '◇', top: '76%', left: '88%' },
  { g: '✦', top: '12%', left: '62%' },
];

export default function WelcomeAct({ onOpenBook }: { onOpenBook: () => void }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    logOpenflow('welcome_viewed');
  }, []);

  return (
    <div className="of-act">
      <div className="of-aurora" />
      {GLYPHS.map((g, i) => (
        <span key={i} className="of-glyph" style={{ top: g.top, left: g.left, animationDelay: `${i * 1.7}s` }}>
          {g.g}
        </span>
      ))}
      <div className="of-center" style={{ position: 'relative', zIndex: 1 }}>
        <div className="of-orb" aria-hidden="true" />
        <TypeLines lines={WELCOME_LINES} lineMs={2300} startDelayMs={900} onDone={() => setDone(true)} />
        <div style={{ marginTop: 40, minHeight: 56 }}>
          {done && (
            <button className="of-btn of-fade-up" onClick={onOpenBook}>
              Open the Book
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
