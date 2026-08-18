'use client'

import { useEffect, useId, useRef } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
  /** Tightens the sheet for short confirm dialogs. */
  size?: 'md' | 'sm'
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function EditModal({ title, onClose, children, size = 'md' }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Close on Escape, and keep Tab inside the dialog. Without the trap, tabbing
  // walked straight out into the page behind the overlay.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(el => el.offsetParent !== null || el === document.activeElement)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)

    // Lock the page behind the sheet — on mobile it used to scroll underneath.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus whatever wants it (autoFocus), else the panel itself.
    const t = setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      if (panel.contains(document.activeElement)) return
      const first = panel.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel).focus()
    }, 0)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      clearTimeout(t)
      // Hand focus back to whatever opened the dialog.
      opener?.focus?.()
    }
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(7,16,9,0.55)', backdropFilter: 'blur(2px)' }}
      onMouseDown={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full ${size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-md'} rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col outline-none`}
        style={{
          backgroundColor: 'var(--fg-surface)',
          border: '1px solid var(--fg-border-accent)',
          boxShadow: 'var(--fg-shadow-lg)',
          maxHeight: 'min(90vh, 100dvh - 1rem)',
          animation: 'fg-fade-up 0.22s ease both',
        }}
      >
        {/* Grab handle — reads as a bottom sheet on phones */}
        <div className="flex justify-center pt-2.5 sm:hidden shrink-0">
          <span className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--fg-border)' }} />
        </div>

        <div
          className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0"
          style={{ borderBottom: '1px solid var(--fg-border)' }}
        >
          <h2 id={titleId} className="font-display text-lg font-bold" style={{ color: 'var(--fg-text)' }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 -mr-2 rounded-lg flex items-center justify-center transition-colors shrink-0"
            style={{ color: 'var(--fg-text-muted)' }}
            aria-label="Close"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div
          className="p-5 overflow-y-auto overscroll-contain"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
