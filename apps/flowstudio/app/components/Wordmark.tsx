/* FlowStudio mark — a film aperture (octagon iris) with a flow play. */
export function Mark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="fsg" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0" stopColor="#f5c451" />
          <stop offset=".4" stopColor="#f43f5e" />
          <stop offset=".72" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#25d4e8" />
        </linearGradient>
      </defs>
      <path d="M16 4h16l12 12v16L32 44H16L4 32V16z" stroke="url(#fsg)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M20 17.5 32 24l-12 6.5z" fill="url(#fsg)" />
    </svg>
  );
}

export function Wordmark({ size = 'text-lg' }: { size?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Mark className="h-7 w-7" />
      <span className={`display font-bold tracking-tight ${size}`}>
        Flow<span className="text-grad">Studio</span>
      </span>
    </span>
  );
}
