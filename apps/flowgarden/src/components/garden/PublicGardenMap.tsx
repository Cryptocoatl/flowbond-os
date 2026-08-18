// Read-only render of the garden layout the gardener arranged by hand.
// Server component — no drag handlers, no client JS. The interactive version
// lives in GardenMapSketch and is only used while reviewing a survey.

const ZONE_EMOJI: Record<string, string> = {
  raised_bed: '🛏', grounded_bed: '🌾', container: '🪴', greenhouse: '🏠',
  nursery: '🌱', lawn: '🟩', compost: '🍂', herb_garden: '🌿',
  orchard: '🌳', other: '📍',
}

interface Zone {
  id: string
  name: string
  zone_type: string | null
  map_x: number | null
  map_y: number | null
}

export function PublicGardenMap({ zones }: { zones: Zone[] }) {
  const placed = zones.filter(z => z.map_x !== null && z.map_y !== null)
  if (placed.length === 0) return null

  return (
    <>
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          aspectRatio: '4 / 3',
          background: 'linear-gradient(135deg, var(--fg-green-muted) 0%, var(--fg-gold-bg) 100%)',
          border: '1px solid var(--fg-border-accent)',
        }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
          <defs>
            <pattern id="fg-pub-grid" width="10%" height="10%" patternUnits="userSpaceOnUse">
              <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="var(--fg-border)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fg-pub-grid)" />
        </svg>

        {placed.map(z => (
          <div
            key={z.id}
            className="absolute rounded-xl px-2.5 py-1.5 flex items-center gap-1.5"
            style={{
              left: `${z.map_x}%`,
              top: `${z.map_y}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'var(--fg-surface)',
              border: '1px solid var(--fg-border-accent)',
              boxShadow: 'var(--fg-shadow)',
              maxWidth: '46%',
            }}
          >
            <span className="text-sm leading-none shrink-0" aria-hidden>
              {ZONE_EMOJI[z.zone_type ?? 'other'] ?? '📍'}
            </span>
            <span className="text-xs font-semibold truncate" style={{ color: 'var(--fg-text)' }}>
              {z.name}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--fg-text-dim)' }}>
        Arranged by hand by the gardener — a sketch of the space, not a survey measurement.
      </p>
    </>
  )
}
