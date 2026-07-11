'use client';

import { useEffect, useState } from 'react';

/**
 * Film-paced line reveal: lines appear one by one with a shimmer.
 * Reduced motion → simple quick fades (CSS handles the swap).
 */
export default function TypeLines({
  lines,
  className = 'of-typed',
  lineMs = 1500,
  startDelayMs = 400,
  onDone,
}: {
  lines: string[];
  className?: string;
  lineMs?: number;
  startDelayMs?: number;
  onDone?: () => void;
}) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = reduced ? 350 : lineMs;
    const start = reduced ? 100 : startDelayMs;
    let n = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      n += 1;
      setShown(n);
      if (n < lines.length) timer = setTimeout(tick, step);
      else onDone?.();
    };
    timer = setTimeout(tick, start);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length]);

  return (
    <div className={className} aria-live="polite">
      {lines.map((l, i) => (
        <span key={i} className={`of-line${i < shown ? ' on' : ''}`} style={{ visibility: i < shown ? 'visible' : 'hidden' }}>
          {l}
        </span>
      ))}
    </div>
  );
}
