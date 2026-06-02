'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

// Chrome's non-standard event — typed locally.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DONE_KEY = 'fg-install-done'      // installed or user confirmed — never show again
const SNOOZE_KEY = 'fg-install-snoozed' // dismissed for this browser session only

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIos() {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const iDevice = /iphone|ipad|ipod/i.test(ua)
  // iPadOS 13+ reports as Mac — detect by touch.
  const iPadOs = /macintosh/i.test(ua) && 'ontouchend' in document
  return iDevice || iPadOs
}

function installDone() {
  try {
    return localStorage.getItem(DONE_KEY) === '1'
  } catch {
    return false
  }
}

function snoozedThisSession() {
  try {
    return sessionStorage.getItem(SNOOZE_KEY) === '1'
  } catch {
    return false
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [iosSheet, setIosSheet] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (isStandalone() || installDone() || snoozedThisSession()) return

    // Android / desktop Chrome: capture the install event.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    const onInstalled = () => {
      try { localStorage.setItem(DONE_KEY, '1') } catch { /* ignore */ }
      setVisible(false)
      setDeferred(null)
    }
    window.addEventListener('appinstalled', onInstalled)

    // iOS never fires beforeinstallprompt → show our guided card after a beat.
    let iosTimer: ReturnType<typeof setTimeout> | undefined
    if (isIos()) {
      iosTimer = setTimeout(() => setVisible(true), 2500)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      if (iosTimer) clearTimeout(iosTimer)
    }
  }, [])

  // "Not now" — hide for this session only; the prompt returns on the next visit.
  function snooze() {
    try {
      sessionStorage.setItem(SNOOZE_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
    setIosSheet(false)
  }

  // "I already added it" / installed — never show again on this device.
  function markDone() {
    try {
      localStorage.setItem(DONE_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
    setIosSheet(false)
  }

  async function install() {
    if (isIos()) {
      setIosSheet(true)
      return
    }
    if (!deferred) return
    setInstalling(true)
    try {
      await deferred.prompt()
      await deferred.userChoice
    } finally {
      setInstalling(false)
      setDeferred(null)
      setVisible(false)
    }
  }

  if (!visible) return null

  return (
    <>
      {/* iOS step-by-step sheet */}
      {iosSheet && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center p-4"
          style={{ background: 'rgba(7,16,9,0.55)', backdropFilter: 'blur(2px)' }}
          onClick={snooze}
        >
          <div
            className="card-accent w-full max-w-sm"
            style={{ animation: 'fg-fade-up 0.25s ease both' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <AppMark />
              <div>
                <p className="text-sm font-bold text-fg">Add FlowGarden to your Home Screen</p>
                <p className="text-xs text-fg-muted">Two taps — no App Store, no storage hit.</p>
              </div>
            </div>
            <ol className="space-y-3">
              <Step n={1}>
                Tap the <ShareGlyph /> <b>Share</b> button in Safari’s toolbar.
              </Step>
              <Step n={2}>
                Scroll down and tap <b>“Add to Home Screen”</b> <PlusGlyph />.
              </Step>
              <Step n={3}>
                Tap <b>Add</b> — FlowGarden lands on your home screen like a native app. 🌱
              </Step>
            </ol>
            <button type="button" onClick={markDone} className="btn-gold w-full justify-center mt-5">
              I’ve added it ✓
            </button>
            <button
              type="button"
              onClick={snooze}
              className="w-full text-center text-xs text-fg-muted mt-3 hover:text-fg transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Bottom install banner (sits above mobile nav) */}
      {!iosSheet && (
        <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-[55] px-4 pb-3 md:p-6 pointer-events-none">
          <div
            className="card-accent mx-auto max-w-md flex items-center gap-3 pointer-events-auto"
            style={{ animation: 'fg-fade-up 0.3s ease both', boxShadow: 'var(--fg-shadow-lg)' }}
          >
            <AppMark />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-fg leading-tight">Install FlowGarden</p>
              <p className="text-xs text-fg-muted leading-snug mt-0.5">
                Get the full app on your home screen — instant, offline-ready, zero storage.
              </p>
              <button
                type="button"
                onClick={markDone}
                className="text-[11px] text-fg-gold hover:underline mt-1"
              >
                I already added it
              </button>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={install}
                disabled={installing}
                className="btn-gold text-xs px-3 py-1.5 disabled:opacity-60"
              >
                {installing ? 'Installing…' : isIos() ? 'How' : 'Install'}
              </button>
              <button
                type="button"
                onClick={snooze}
                aria-label="Not now"
                className="p-1.5 rounded-lg text-fg-muted hover:text-fg transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function AppMark() {
  return (
    <div
      className="relative shrink-0 rounded-xl overflow-hidden"
      style={{ width: 44, height: 44, background: '#0A1A0C', border: '1px solid var(--fg-border-accent)' }}
    >
      <Image src="/icons/maskable-192.png" alt="FlowGarden" fill className="object-contain p-1" />
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ backgroundColor: 'var(--fg-gold-bg)', color: 'var(--fg-gold)', border: '1px solid var(--fg-border-accent)' }}
      >
        {n}
      </span>
      <span className="text-sm text-fg-secondary leading-snug pt-0.5">{children}</span>
    </li>
  )
}

function ShareGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="inline w-4 h-4 -mt-0.5" style={{ color: 'var(--fg-gold)' }}>
      <path d="M10 2.5v9M10 2.5L7 5.5M10 2.5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 8.5H4a1.5 1.5 0 00-1.5 1.5v6A1.5 1.5 0 004 17.5h12a1.5 1.5 0 001.5-1.5v-6A1.5 1.5 0 0016 8.5h-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function PlusGlyph() {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded -mt-0.5 align-middle"
      style={{ border: '1.5px solid var(--fg-gold)', color: 'var(--fg-gold)' }}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
        <path d="M9 4a1 1 0 112 0v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4z" />
      </svg>
    </span>
  )
}
