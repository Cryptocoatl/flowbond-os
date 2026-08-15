// Shared loading shapes. Every garden page is force-dynamic and none of them
// had a loading.tsx, so a navigation just froze on the previous screen until
// the queries came back. These give the app an immediate response instead.

export function SkeletonHeader({ action = true }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-32" />
      </div>
      {action && <div className="skeleton h-10 w-32 rounded-lg" />}
    </div>
  )
}

export function SkeletonCards({ count = 6, className = 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4' }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3">
          <div className="flex items-center gap-3">
            <div className="skeleton w-11 h-11 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
          <div className="skeleton h-1 w-full" />
          <div className="skeleton h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex gap-4">
          <div className="skeleton w-4 h-4 rounded-full shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4" style={{ width: `${55 + ((i * 13) % 35)}%` }} />
            <div className="skeleton h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonHero() {
  return (
    <div className="hero-band">
      <div className="skeleton rounded-full shrink-0" style={{ width: 88, height: 88 }} />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  )
}
