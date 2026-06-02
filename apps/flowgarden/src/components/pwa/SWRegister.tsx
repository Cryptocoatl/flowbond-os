'use client'

import { useEffect } from 'react'

// Registers the FlowGarden service worker so the app is installable + offline-capable.
export function SWRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return
    // Escape hatch: visit any page with ?nosw to skip (useful when debugging).
    if (new URLSearchParams(window.location.search).has('nosw')) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration failures are non-fatal — app still works online */
      })
    }
    // Register after load so it never competes with first paint.
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return null
}
