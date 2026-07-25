'use client';
// =============================================================================
// VideoSlot — a cinematic background video that autoplays muted, loops, and
// falls back to its poster (and a gradient) if the file is missing or can't
// play. Reusable anywhere a living backdrop is wanted (hero, world card, …).
// Drop /public/videos/<name>.mp4 (+ optional <name>.jpg poster).
// =============================================================================
import { useRef, useState } from 'react';

export function VideoSlot({
  src,
  poster,
  className = '',
  overlay = 'linear-gradient(180deg, rgba(8,11,10,0.15) 0%, rgba(8,11,10,0.55) 55%, rgba(8,11,10,0.94) 100%)',
  seed = 'kai',
}: {
  src: string;
  poster?: string;
  className?: string;
  /** foreground scrim for legibility; set '' for none */
  overlay?: string;
  seed?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ok, setOk] = useState(true);
  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ background: 'linear-gradient(160deg, #121a17, #0a0f0d)' }}
    >
      {ok && (
        <video
          ref={ref}
          className="absolute inset-0 h-full w-full object-cover"
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setOk(false)}
        />
      )}
      {overlay && <div className="absolute inset-0" style={{ background: overlay }} />}
    </div>
  );
}
