'use client'

import { useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'

const DONE_KEY = 'fg-tour-done'
const START_EVENT = 'fg-start-tour'

// Fire this from anywhere ("Take a tour" button) to (re)launch the tour.
export function startTour() {
  window.dispatchEvent(new Event(START_EVENT))
}

interface Step {
  selector: string | null // null = centered card (no spotlight)
  emoji: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    selector: null,
    emoji: '🌱',
    title: 'Welcome to FlowGarden',
    body: 'A calm home for your garden — plants, missions, journal and your own AI helper. Here’s a 30-second tour.',
  },
  {
    selector: '[data-tour="pulse"]',
    emoji: '💚',
    title: 'Your garden pulse',
    body: 'A one-glance read on how things are going — the ring shows how many of your plants are healthy.',
  },
  {
    selector: '[data-tour="stats"]',
    emoji: '📊',
    title: 'The essentials',
    body: 'Zones, plants, today’s missions and your team. Tap any tile to jump straight in.',
  },
  {
    selector: '[data-tour="garden-switcher"]',
    emoji: '🪴',
    title: 'Your gardens',
    body: 'Switch between gardens or create a brand-new one anytime — each keeps its own plants, missions and team.',
  },
  {
    selector: '[data-tour="chat-cta"]',
    emoji: '🤖',
    title: 'Meet FlowMe',
    body: 'Just say what’s happening — “planted 6 tomatoes”, “what should I do today?” — or snap a photo. FlowMe logs it all for you.',
  },
  {
    selector: '[data-tour="chat-fab"]',
    emoji: '✨',
    title: 'Always one tap away',
    body: 'Tap this button on any screen to chat with FlowMe. You can replay this tour anytime from “Take a tour” in the menu.',
  },
]

// First visible element matching the selector. Hidden sidebar/header copies
// (display:none on the other breakpoint) report a 0×0 rect and are skipped.
// NOTE: we must NOT use offsetParent — it is null for position:fixed elements
// (e.g. the floating chat button), which would wrongly skip them.
function findVisible(selector: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector))
  return (
    els.find(el => {
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return false
      const s = getComputedStyle(el)
      return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'
    }) ?? null
  )
}

export function TourGuide() {
  const pathname = usePathname()
  const [steps, setSteps] = useState<Step[]>([])
  const [index, setIndex] = useState(0)
  const [active, setActive] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const finish = useCallback(() => {
    setActive(false)
    setRect(null)
    try { localStorage.setItem(DONE_KEY, '1') } catch { /* ignore */ }
  }, [])

  const begin = useCallback(() => {
    // Resolve which steps actually have a visible target right now.
    const usable = STEPS.filter(s => s.selector === null || findVisible(s.selector))
    setSteps(usable.length ? usable : STEPS)
    setIndex(0)
    setActive(true)
  }, [])

  // Re-launch on demand.
  useEffect(() => {
    const handler = () => begin()
    window.addEventListener(START_EVENT, handler)
    return () => window.removeEventListener(START_EVENT, handler)
  }, [begin])

  // Auto-run once for first-time users, on the dashboard (anchors live there).
  useEffect(() => {
    if (pathname !== '/flowgarden') return
    let done = false
    try { done = localStorage.getItem(DONE_KEY) === '1' } catch { /* ignore */ }
    if (done) return
    const t = setTimeout(() => begin(), 1200)
    return () => clearTimeout(t)
  }, [pathname, begin])

  // Measure the current step's target (after scrolling it into view).
  useLayoutEffect(() => {
    if (!active || !steps.length) return
    const step = steps[index]
    if (!step?.selector) { setRect(null); return }

    const el = findVisible(step.selector)
    if (!el) { setRect(null); return }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const measure = () => setRect(el.getBoundingClientRect())
    const t = setTimeout(measure, 320)

    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [active, index, steps])

  // Keyboard: Esc closes, arrows navigate.
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight') setIndex(i => Math.min(i + 1, steps.length - 1))
      else if (e.key === 'ArrowLeft') setIndex(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, steps.length, finish])

  if (!active || !steps.length) return null

  const step = steps[index]
  const isLast = index === steps.length - 1
  const pad = 8

  // Tooltip placement. On phones we pin the card as a full-width sheet to the
  // top or bottom band — whichever is clear of the highlighted element — so the
  // text can never be clipped by the viewport edge. On wider screens we anchor
  // it near the element.
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400
  const isMobile = vw < 640
  const TIP_W = 320

  let tipStyle: React.CSSProperties
  if (isMobile) {
    // Element in the top half → sheet sits at the bottom, and vice-versa.
    const elementCenter = rect ? rect.top + rect.height / 2 : 0
    const sheetAtBottom = !rect || elementCenter < vh / 2
    tipStyle = sheetAtBottom
      ? { left: 12, right: 12, bottom: 'max(16px, env(safe-area-inset-bottom))' }
      : { left: 12, right: 12, top: 16 }
  } else if (!rect) {
    tipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: TIP_W }
  } else {
    const placeBelow = rect.bottom + 220 < vh
    const left = Math.min(Math.max(rect.left + rect.width / 2 - TIP_W / 2, 12), Math.max(vw - TIP_W - 12, 12))
    tipStyle = placeBelow
      ? { top: rect.bottom + pad + 12, left, width: TIP_W }
      : { bottom: vh - rect.top + pad + 12, left, width: TIP_W }
  }

  return (
    <div className="fixed inset-0 z-[80]" aria-live="polite">
      {/* Click-blocker (transparent) so the page can't be used mid-tour */}
      <div className="absolute inset-0" style={{ cursor: 'default' }} />

      {/* Dim + spotlight */}
      {rect ? (
        <div
          className="absolute pointer-events-none"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            borderRadius: 16,
            boxShadow: '0 0 0 9999px rgba(7,16,9,0.74)',
            border: '2px solid var(--fg-gold)',
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: 'rgba(7,16,9,0.74)' }} />
      )}

      {/* Tooltip */}
      <div
        className="absolute card-accent"
        style={{
          ...tipStyle,
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          animation: 'fg-fade-up 0.2s ease both',
          boxShadow: 'var(--fg-shadow-lg)',
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none shrink-0">{step.emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-fg">{step.title}</p>
            <p className="text-xs text-fg-secondary leading-snug mt-1">{step.body}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === index ? 16 : 6,
                  height: 6,
                  backgroundColor: i === index ? 'var(--fg-gold)' : 'var(--fg-border-accent)',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {!isLast && (
              <button
                type="button"
                onClick={finish}
                className="text-xs text-fg-muted hover:text-fg transition-colors"
              >
                Skip
              </button>
            )}
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex(i => Math.max(i - 1, 0))}
                className="text-xs text-fg-muted hover:text-fg transition-colors"
              >
                Back
              </button>
            )}
            {isLast ? (
              <button type="button" onClick={finish} className="btn-gold text-xs px-3 py-1.5">
                Start growing 🌿
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex(i => Math.min(i + 1, steps.length - 1))}
                className="btn-primary text-xs px-3 py-1.5"
              >
                Next
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
