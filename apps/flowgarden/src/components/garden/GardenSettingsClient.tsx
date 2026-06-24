'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

type Visibility = 'private' | 'city' | 'exact' | 'live'

interface Props {
  ownsGarden: boolean
  initial: {
    name: string
    location_label: string
    map_visibility: Visibility
    live_url: string
    city_label: string | null
    has_coords: boolean
  }
  passwordSet: boolean
}

const TIERS: { value: Visibility; title: string; blurb: string; icon: string }[] = [
  { value: 'private', title: 'Private', blurb: 'Hidden from the map entirely. Nobody sees your location. (Default)', icon: '🔒' },
  { value: 'city',    title: 'City / area only', blurb: 'Shown as a fuzzy area (~city level). Your exact spot never leaves our server.', icon: '🏙️' },
  { value: 'exact',   title: 'Exact location', blurb: 'A precise pin on your garden. Anyone signed in can see exactly where it is.', icon: '📍' },
  { value: 'live',    title: 'Live broadcast', blurb: 'Exact pin plus a live/3D link others can open from any browser.', icon: '🔴' },
]

export function GardenSettingsClient({ ownsGarden, initial, passwordSet }: Props) {
  const [name, setName] = useState(initial.name)
  const [location, setLocation] = useState(initial.location_label)
  const [visibility, setVisibility] = useState<Visibility>(initial.map_visibility)
  const [liveUrl, setLiveUrl] = useState(initial.live_url)
  const [cityLabel, setCityLabel] = useState(initial.city_label)
  const [hasCoords, setHasCoords] = useState(initial.has_coords)

  const [geoPreview, setGeoPreview] = useState<string | null>(null)
  const [geoChecking, setGeoChecking] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function previewLocation() {
    if (!location.trim()) return
    setGeoChecking(true); setGeoPreview(null)
    try {
      const res = await fetch(`/api/flowgarden/geocode?q=${encodeURIComponent(location.trim())}`)
      const data = await res.json()
      if (data.found) {
        setGeoPreview(data.display_name)
        setCityLabel(data.city_label)
        setHasCoords(true)
      } else {
        setGeoPreview('Couldn’t find that place — try a city + country.')
      }
    } catch {
      setGeoPreview('Location lookup failed.')
    } finally {
      setGeoChecking(false)
    }
  }

  function save() {
    setError(null); setSaved(false)
    startTransition(async () => {
      const res = await fetch('/api/flowgarden/garden-location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          location_label: location,
          map_visibility: visibility,
          live_url: liveUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
      if (data.garden) {
        setHasCoords(data.garden.latitude != null)
        setCityLabel(data.garden.city_label ?? null)
      }
      if (data.geocode_failed) {
        setError('Saved, but we couldn’t find that location on the map. Try a clearer “City, Country”.')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Sign-in & security ── */}
      <div className="card">
        <h2 className="font-semibold text-fg mb-1">Sign-in & security</h2>
        <p className="text-xs text-fg-muted mb-4">
          You can always sign in with a magic link. Add a password to skip the email step next time.
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-fg">{passwordSet ? 'Password is set' : 'No password yet'}</p>
            <p className="text-xs text-fg-muted">
              {passwordSet ? 'Sign in with email + password, magic link, or a connected account.' : 'Set one to sign in instantly without waiting for an email.'}
            </p>
          </div>
          <Link
            href="/auth/set-password?next=/settings"
            className="text-xs font-semibold rounded-lg px-4 py-2 transition-colors shrink-0"
            style={{ backgroundColor: '#1A5C35', color: '#EFE8D8' }}
          >
            {passwordSet ? 'Change password' : 'Set a password'}
          </Link>
        </div>
      </div>

      {/* ── Location & map privacy ── */}
      {ownsGarden ? (
        <div className="card">
          <h2 className="font-semibold text-fg mb-1">Location & map privacy</h2>
          <p className="text-xs text-fg-muted mb-5">
            Privacy first: your garden stays <strong>private</strong> until you choose otherwise. You can change this anytime.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-fg-muted mb-1.5">Garden name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="My garden" />
            </div>

            <div>
              <label className="block text-xs text-fg-muted mb-1.5">Location (city, country)</label>
              <div className="flex gap-2">
                <input
                  value={location}
                  onChange={e => { setLocation(e.target.value); setGeoPreview(null) }}
                  className="input-field flex-1"
                  placeholder="New Orleans, USA"
                />
                <button
                  type="button" onClick={previewLocation} disabled={geoChecking || !location.trim()}
                  className="text-xs font-medium rounded-lg px-3 shrink-0 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--fg-panel)', color: 'var(--fg-text-secondary)', border: '1px solid var(--fg-border)' }}
                >
                  {geoChecking ? 'Checking…' : 'Check'}
                </button>
              </div>
              {geoPreview && <p className="text-xs mt-1.5 text-fg-muted">📍 {geoPreview}</p>}
              {!geoPreview && hasCoords && cityLabel && <p className="text-xs mt-1.5 text-fg-muted">On the map as: ~ {cityLabel}</p>}
              {!hasCoords && location.trim() && <p className="text-xs mt-1.5" style={{ color: '#C9A961' }}>Tap “Check” to place this on the map.</p>}
            </div>

            <div>
              <label className="block text-xs text-fg-muted mb-2">Who can see your garden on the world map?</label>
              <div className="space-y-2">
                {TIERS.map(t => {
                  const active = visibility === t.value
                  return (
                    <button
                      key={t.value} type="button" onClick={() => setVisibility(t.value)}
                      className="w-full text-left rounded-xl px-4 py-3 transition-all flex items-start gap-3"
                      style={{
                        backgroundColor: active ? 'var(--fg-gold-bg)' : 'var(--fg-panel)',
                        border: active ? '1px solid var(--fg-border-accent)' : '1px solid var(--fg-border)',
                      }}
                    >
                      <span className="text-base leading-none mt-0.5">{t.icon}</span>
                      <span className="flex-1">
                        <span className="text-sm font-medium text-fg flex items-center gap-2">
                          {t.title}
                          {t.value === 'private' && <span className="text-[10px] uppercase tracking-wide text-fg-muted">default</span>}
                        </span>
                        <span className="block text-xs text-fg-muted mt-0.5">{t.blurb}</span>
                      </span>
                      <span
                        className="w-4 h-4 rounded-full shrink-0 mt-0.5"
                        style={{ border: active ? '5px solid var(--fg-gold)' : '2px solid var(--fg-border)' }}
                      />
                    </button>
                  )
                })}
              </div>
            </div>

            {visibility === 'live' && (
              <div>
                <label className="block text-xs text-fg-muted mb-1.5">Live broadcast / 3D link</label>
                <input
                  value={liveUrl} onChange={e => setLiveUrl(e.target.value)} className="input-field"
                  placeholder="https://… (YouTube live, stream, 3D tour)"
                />
              </div>
            )}

            {error && <p className="text-red-400 text-xs bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button" onClick={save} disabled={isPending}
                className="text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors disabled:opacity-60"
                style={{ backgroundColor: '#1A5C35', color: '#EFE8D8' }}
              >
                {isPending ? 'Saving…' : 'Save changes'}
              </button>
              {saved && <span className="text-xs" style={{ color: '#C9A961' }}>✓ Saved</span>}
              <Link href="/world" className="text-xs text-fg-gold hover:underline ml-auto">View on map →</Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2 className="font-semibold text-fg mb-1">Location & map privacy</h2>
          <p className="text-xs text-fg-muted">
            Map location is managed by the garden owner. Create your own garden to control its place on the world map.
          </p>
        </div>
      )}
    </div>
  )
}
