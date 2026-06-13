import React from 'react';

/**
 * AstralFlow logomark — the master vector from the brand pack, inlined.
 * Four elements in one mark: the ambient glow, the tilted orbit + orb, the
 * synchronicity wave (the flow), and the four-point star (the self).
 *
 *   size?         px, default 40
 *   animated?     orbit slowly rotates + star gently sparks (respects reduced-motion)
 *   withWordmark? render "AstralFlow" beside the mark
 *
 * Pure presentational; safe in server or client components.
 */
export function Logo({
  size = 40,
  animated = false,
  withWordmark = false,
  className = '',
}: {
  size?: number;
  animated?: boolean;
  withWordmark?: boolean;
  className?: string;
}) {
  const mark = (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="AstralFlow" className="shrink-0 block">
      <defs>
        <linearGradient id="afmGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7FE9F6" />
          <stop offset="0.5" stopColor="#9FB6FF" />
          <stop offset="1" stopColor="#8F7CFF" />
        </linearGradient>
        <radialGradient id="afmGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#8F7CFF" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#7FE9F6" stopOpacity="0.18" />
          <stop offset="1" stopColor="#8F7CFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="afmStar" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#EAF6FF" />
          <stop offset="0.45" stopColor="#7FE9F6" />
          <stop offset="1" stopColor="#8F7CFF" />
        </linearGradient>
      </defs>

      {/* ambient glow */}
      <circle cx="60" cy="60" r="40" fill="url(#afmGlow)" />

      {/* orbit + orb (tilted for celestial perspective) */}
      <g className={animated ? 'af-logo-orbit' : undefined}>
        <g transform="rotate(-22 60 60)">
          <ellipse cx="60" cy="60" rx="45" ry="45" fill="none" stroke="url(#afmGrad)" strokeWidth="1.5" opacity="0.85" />
          <circle cx="60" cy="15" r="4.4" fill="#8F7CFF" />
          <circle cx="60" cy="15" r="8" fill="url(#afmGlow)" />
        </g>
      </g>

      {/* the flow: a synchronicity wave threading the system */}
      <path d="M12 80 C 34 66, 48 90, 70 75 S 102 62, 108 68" fill="none" stroke="url(#afmGrad)" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />

      {/* the star: consciousness / the self */}
      <g className={animated ? 'af-logo-star' : undefined}>
        <path d="M60 22 Q60 60 98 60 Q60 60 60 98 Q60 60 22 60 Q60 60 60 22 Z" fill="url(#afmStar)" />
        <path d="M60 40 Q60 60 80 60 Q60 60 60 80 Q60 60 40 60 Q60 60 60 40 Z" fill="#FFFFFF" opacity="0.25" />
      </g>
    </svg>
  );

  if (!withWordmark) return mark;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {mark}
      <span className="font-serif tracking-wide text-[#ece9e0]" style={{ fontSize: Math.round(size * 0.46) }}>
        AstralFlow
      </span>
    </span>
  );
}
