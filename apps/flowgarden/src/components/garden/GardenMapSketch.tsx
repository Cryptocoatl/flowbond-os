'use client'

import { useRef, useState } from 'react'
import type { SurveyZone } from '@/lib/survey'

// The AI's placement is a first guess read off shadows, adjacency and framing —
// it is not a measurement, and pretending otherwise would be the whole problem
// with "AI mapped your garden". So the sketch is draggable: the model proposes
// an arrangement, the gardener drags it into the truth, and THAT becomes the
// map. Precision comes from the human, speed from the model.

const ZONE_EMOJI: Record<string, string> = {
  raised_bed: '🛏', grounded_bed: '🌾', container: '🪴', greenhouse: '🏠',
  nursery: '🌱', lawn: '🟩', compost: '🍂', herb_garden: '🌿',
  orchard: '🌳', other: '📍',
}

export function GardenMapSketch({
  zones,
  layout,
  onMove,
}: {
  zones: SurveyZone[]
  layout: Record<string, { x: number; y: number }>
  onMove: (key: string, x: number, y: number) => void
}) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)

  function pointFromEvent(e: React.PointerEvent) {
    const board = boardRef.current
    if (!board) return null
    const r = board.getBoundingClientRect()
    return {
      x: Math.max(4, Math.min(96, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(6, Math.min(94, ((e.clientY - r.top) / r.height) * 100)),
    }
  }

  function handleMove(e: React.PointerEvent, key: string) {
    if (dragging !== key) return
    const p = pointFromEvent(e)
    if (p) onMove(key, Math.round(p.x), Math.round(p.y))
  }

  // Keyboard nudging, so the layout isn't drag-only.
  function handleKey(e: React.KeyboardEvent, key: string) {
    const cur = layout[key] ?? { x: 50, y: 50 }
    const step = e.shiftKey ? 10 : 2
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
    }
    const m = moves[e.key]
    if (!m) return
    e.preventDefault()
    onMove(key, Math.max(4, Math.min(96, cur.x + m[0])), Math.max(6, Math.min(94, cur.y + m[1])))
  }

  if (zones.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-emoji">🗺</span>
        <p className="empty-title">No zones to place</p>
        <p className="empty-body">Tick at least one zone above to sketch the layout.</p>
      </div>
    )
  }

  return (
    <>
      <div
        ref={boardRef}
        className="relative w-full rounded-2xl overflow-hidden touch-none select-none"
        style={{
          aspectRatio: '4 / 3',
          background: 'linear-gradient(135deg, var(--fg-green-muted) 0%, var(--fg-gold-bg) 100%)',
          border: '1px solid var(--fg-border-accent)',
        }}
      >
        {/* Faint grid, so dragging has some reference */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
          <defs>
            <pattern id="fg-grid" width="10%" height="10%" patternUnits="userSpaceOnUse">
              <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="var(--fg-border)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fg-grid)" />
        </svg>

        <span
          className="absolute top-2 left-3 text-[10px] uppercase tracking-widest font-semibold pointer-events-none"
          style={{ color: 'var(--fg-text-dim)' }}
        >
          back of garden
        </span>
        <span
          className="absolute bottom-2 left-3 text-[10px] uppercase tracking-widest font-semibold pointer-events-none"
          style={{ color: 'var(--fg-text-dim)' }}
        >
          where you stand
        </span>

        {zones.map(z => {
          const pos = layout[z.key] ?? { x: z.x, y: z.y }
          const isDragging = dragging === z.key
          return (
            <button
              key={z.key}
              type="button"
              onPointerDown={e => { (e.target as HTMLElement).setPointerCapture(e.pointerId); setDragging(z.key) }}
              onPointerMove={e => handleMove(e, z.key)}
              onPointerUp={() => setDragging(null)}
              onPointerCancel={() => setDragging(null)}
              onKeyDown={e => handleKey(e, z.key)}
              aria-label={`${z.name} — drag or use arrow keys to position`}
              className="absolute rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 cursor-grab active:cursor-grabbing"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'var(--fg-surface)',
                border: `1px solid ${isDragging ? 'var(--fg-gold)' : 'var(--fg-border-accent)'}`,
                boxShadow: isDragging ? 'var(--fg-shadow-lg)' : 'var(--fg-shadow)',
                zIndex: isDragging ? 10 : 1,
                maxWidth: '46%',
              }}
            >
              <span className="text-sm leading-none shrink-0" aria-hidden>
                {ZONE_EMOJI[z.zone_type ?? 'other'] ?? '📍'}
              </span>
              <span className="text-xs font-semibold truncate" style={{ color: 'var(--fg-text)' }}>
                {z.name}
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--fg-text-muted)' }}>
        FlowMe guessed this arrangement from your photos. Drag each bed to where it really is — that&rsquo;s what gets saved.
      </p>
    </>
  )
}
