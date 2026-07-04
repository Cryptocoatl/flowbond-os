// FlowStudio wordmark — an aperture/play "flow" glyph + type.
// Placeholder mark; swaps cleanly for Steph's logo when it lands.

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="fs-g" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#5eead4" />
          <stop offset="0.55" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" stroke="url(#fs-g)" strokeWidth="2" />
      <path d="M13 11.2v9.6a1 1 0 0 0 1.5.87l8-4.8a1 1 0 0 0 0-1.74l-8-4.8a1 1 0 0 0-1.5.87Z" fill="url(#fs-g)" />
    </svg>
  );
}

export function Wordmark({ size = 28, sub }: { size?: number; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={size} />
      <div className="leading-none">
        <span className="display text-[1.05rem] tracking-tight">
          Flow<span className="text-teal-bright">Studio</span>
        </span>
        {sub && (
          <span className="ml-2 text-[0.6rem] uppercase tracking-[0.2em] text-ink-faint align-middle">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
