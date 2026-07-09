// The BAÑOSECO tótem — caca de oro con un brote de vida. Ported from the
// prototype header SVG; ids are suffixed so multiple totems can coexist.
export function Totem({
  className = 'totem',
  uid = 'h',
  title,
}: {
  className?: string;
  uid?: string;
  title?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 120 140" role="img" aria-label={title ?? 'BAÑOSECO'}>
      <defs>
        <radialGradient id={`bs-g-${uid}`} cx="38%" cy="28%" r="80%">
          <stop offset="0" stopColor="#FFE39A" />
          <stop offset=".45" stopColor="#F4C24A" />
          <stop offset="1" stopColor="#A9761E" />
        </radialGradient>
        <linearGradient id={`bs-j-${uid}`} x1="0" y1="1" x2=".3" y2="0">
          <stop offset="0" stopColor="#12716A" />
          <stop offset="1" stopColor="#8DE36A" />
        </linearGradient>
      </defs>
      <g stroke="#7A5414" strokeWidth="2.5">
        <ellipse cx="60" cy="118" rx="44" ry="15" fill={`url(#bs-g-${uid})`} />
        <ellipse cx="60" cy="98" rx="35" ry="14" fill={`url(#bs-g-${uid})`} />
        <ellipse cx="60" cy="80" rx="25" ry="12" fill={`url(#bs-g-${uid})`} />
        <ellipse cx="60" cy="65" rx="14" ry="9" fill={`url(#bs-g-${uid})`} />
      </g>
      <path d="M60 64 C60 52 60 44 60 34" fill="none" stroke={`url(#bs-j-${uid})`} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M60 46 C49 43 42 34 44 24 C55 26 62 36 60 46Z" fill={`url(#bs-j-${uid})`} />
      <path d="M60 40 C71 38 79 30 79 20 C68 20 60 30 60 40Z" fill={`url(#bs-j-${uid})`} />
    </svg>
  );
}
