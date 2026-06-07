'use client'

import { useState, useEffect } from 'react'
import { AgentChat } from '@/components/garden/AgentChat'

// Always-available "Ask FlowMe" launcher. A floating button on every garden
// page opens a slide-up drawer (mobile) / anchored panel (desktop) with the
// garden intelligence chat.
export function ChatLauncher({ gardenId }: { gardenId: string }) {
  const [open, setOpen] = useState(false)

  // Lock body scroll while the drawer is open on mobile.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Let other components (e.g. the tour) open the chat programmatically.
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('fg-open-chat', handler)
    return () => window.removeEventListener('fg-open-chat', handler)
  }, [])

  return (
    <>
      {/* Floating action button */}
      {!open && (
        <button
          type="button"
          data-tour="chat-fab"
          onClick={() => setOpen(true)}
          className="fixed z-[55] bottom-20 right-4 md:bottom-6 md:right-6 flex items-center gap-2 rounded-full shadow-lg transition-transform active:scale-95"
          style={{
            background: 'linear-gradient(135deg, var(--fg-green) 0%, #14502f 100%)',
            color: '#fff',
            padding: '0.7rem 0.95rem',
            boxShadow: '0 8px 24px rgba(26,92,53,0.45), 0 0 0 1px rgba(201,169,97,0.25)',
          }}
          aria-label="Ask FlowMe"
        >
          <span className="text-lg leading-none">🌱</span>
          <span className="hidden md:inline text-sm font-semibold pr-1">Ask FlowMe</span>
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div
          className="fixed inset-0 z-[65] flex items-end md:items-end md:justify-end"
          style={{ background: 'rgba(7,16,9,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full md:w-[420px] md:m-6 rounded-t-3xl md:rounded-2xl flex flex-col overflow-hidden"
            style={{
              backgroundColor: 'var(--fg-surface)',
              border: '1px solid var(--fg-border-accent)',
              boxShadow: 'var(--fg-shadow-lg)',
              maxHeight: '85vh',
              animation: 'fg-fade-up 0.28s ease both',
            }}
          >
            {/* Drawer header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: '1px solid var(--fg-border)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🌱</span>
                <div>
                  <p className="text-sm font-semibold text-fg leading-tight">FlowMe</p>
                  <p className="text-[11px] text-fg-muted leading-tight">Your garden intelligence</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-lg text-fg-muted hover:text-fg transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Chat body */}
            <div className="flex-1 overflow-y-auto p-2 safe-area-bottom">
              <AgentChat gardenId={gardenId} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
