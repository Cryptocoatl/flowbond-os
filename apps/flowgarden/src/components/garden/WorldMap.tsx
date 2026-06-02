'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import 'leaflet/dist/leaflet.css'
import type { MapGarden } from '@/app/api/flowgarden/map/route'

/**
 * Community world map.
 *
 * Uses Leaflet + OpenStreetMap raster tiles on purpose:
 *  - plain <img> tiles (no WebGL) → works on every browser, even locked-down ones
 *  - OSM is reachable from every country and behind VPNs (no Google Maps geo-blocks)
 *  - no API key shipped to the client
 *
 * Privacy is already applied server-side (see /api/flowgarden/map): private
 * gardens are absent, city-tier gardens arrive pre-fuzzed. This component only
 * draws what it is given and never sees an exact city-tier coordinate.
 */
export function WorldMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  const [gardens, setGardens] = useState<MapGarden[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch the privacy-filtered garden list.
  useEffect(() => {
    let alive = true
    fetch('/api/flowgarden/map')
      .then(r => r.json())
      .then(d => { if (alive) setGardens(d.gardens ?? []) })
      .catch(() => { if (alive) setError('Could not load the map') })
    return () => { alive = false }
  }, [])

  // Build the map once we have data and the container.
  useEffect(() => {
    if (!gardens || !containerRef.current || mapRef.current) return

    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        center: [20, 0],
        zoom: 2,
        worldCopyJump: true,
        scrollWheelZoom: true,
      })
      mapRef.current = map

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      const bounds: [number, number][] = []

      for (const g of gardens) {
        bounds.push([g.latitude, g.longitude])

        const isLive = g.visibility === 'live'
        const isCity = g.visibility === 'city'
        const color = isLive ? '#e0533d' : isCity ? '#C9A961' : '#1A5C35'

        // City tier → show the approximate AREA (a soft circle), never a sharp pin.
        if (isCity) {
          L.circle([g.latitude, g.longitude], {
            radius: 6000,
            color,
            weight: 1,
            fillColor: color,
            fillOpacity: 0.12,
          }).addTo(map)
        }

        const marker = L.circleMarker([g.latitude, g.longitude], {
          radius: isLive ? 9 : 7,
          color: '#ffffff',
          weight: 2,
          fillColor: color,
          fillOpacity: 0.95,
        }).addTo(map)

        const areaLine = isCity && g.city_label
          ? `<div style="font-size:11px;color:#8a8a7a;margin-top:2px">~ ${escapeHtml(g.city_label)}</div>`
          : ''
        const tierLabel = isLive ? '🔴 Live now' : isCity ? 'Approximate area' : 'Exact location'
        const liveBtn = isLive && g.live_url
          ? `<a href="${escapeHtml(g.live_url)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;background:#e0533d;color:#fff;font-size:11px;font-weight:600;padding:5px 10px;border-radius:8px;text-decoration:none">Watch live →</a>`
          : ''
        const mine = g.is_mine ? ' <span style="color:#1A5C35;font-weight:600">(yours)</span>' : ''

        marker.bindPopup(
          `<div style="font-family:system-ui;min-width:150px">
             <div style="font-weight:700;font-size:13px;color:#1a1a1a">${escapeHtml(g.name)}${mine}</div>
             ${areaLine}
             <div style="font-size:11px;color:#8a8a7a;margin-top:4px">${tierLabel} · ${g.member_count} ${g.member_count === 1 ? 'gardener' : 'gardeners'}</div>
             ${liveBtn}
           </div>`,
        )
      }

      if (bounds.length === 1) {
        map.setView(bounds[0], 9)
      } else if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
      }

      // Tiles can render before the container has its final size.
      setTimeout(() => map.invalidateSize(), 200)
    })()

    return () => { cancelled = true }
  }, [gardens])

  // Clean up the map on unmount.
  useEffect(() => () => {
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
  }, [])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" style={{ background: '#0c1a0e' }} />

      {/* Legend */}
      <div
        className="absolute z-[1000] bottom-4 left-4 rounded-xl px-4 py-3 text-xs space-y-2"
        style={{ backgroundColor: 'rgba(12,26,14,0.92)', border: '1px solid rgba(201,169,97,0.2)', color: '#EFE8D8', backdropFilter: 'blur(8px)' }}
      >
        <p className="font-semibold tracking-wide" style={{ color: '#C9A961' }}>Garden map</p>
        <LegendDot color="#1A5C35" label="Exact location" />
        <LegendDot color="#C9A961" label="Approximate area" ring />
        <LegendDot color="#e0533d" label="Live broadcast" />
        <p style={{ color: 'rgba(239,232,216,0.4)', maxWidth: 170, lineHeight: 1.4 }}>
          Private gardens never appear here. You choose your level in Settings.
        </p>
      </div>

      {gardens && gardens.length === 0 && !error && (
        <div className="absolute z-[1000] inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="rounded-2xl px-6 py-5 text-center max-w-xs pointer-events-auto"
            style={{ backgroundColor: 'rgba(12,26,14,0.92)', border: '1px solid rgba(201,169,97,0.2)', color: '#EFE8D8' }}
          >
            <p className="font-semibold mb-1" style={{ color: '#C9A961' }}>No gardens shared yet</p>
            <p className="text-xs mb-3" style={{ color: 'rgba(239,232,216,0.55)' }}>
              Every garden starts private. Be the first to put your garden on the map.
            </p>
            <Link href="/flowgarden/settings" className="text-xs font-semibold underline" style={{ color: '#C9A961' }}>
              Open Settings →
            </Link>
          </div>
        </div>
      )}

      {!gardens && !error && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'rgba(239,232,216,0.5)' }}>
          Loading map…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: '#e0533d' }}>
          {error}
        </div>
      )}
    </div>
  )
}

function LegendDot({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block rounded-full shrink-0"
        style={{
          width: 12, height: 12, backgroundColor: ring ? 'transparent' : color,
          border: ring ? `2px solid ${color}` : '2px solid #fff',
          boxShadow: ring ? 'none' : '0 0 0 1px rgba(0,0,0,0.2)',
        }}
      />
      <span>{label}</span>
    </div>
  )
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ))
}
