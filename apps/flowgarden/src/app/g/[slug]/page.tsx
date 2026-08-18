import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { PublicGardenMap } from '@/components/garden/PublicGardenMap'
import { plural } from '@/lib/format'

export const dynamic = 'force-dynamic'

// ── What a stranger is allowed to see ────────────────────────────────────
//
// This route is public, so it renders with the service-role client and an
// EXPLICIT column list rather than `select('*')`. The house rule is that a
// public surface is a view without PII; here the server route's column list is
// that view. Never add user_id, invite_code, emails, or member names here.
//
// Location follows the garden's existing map_visibility ladder rather than a
// second one: private/city → city label only; exact/live → the precise place.
// Publishing a page never upgrades how precisely a garden is located.

interface PublicGarden {
  id: string
  name: string
  public_bio: string | null
  description: string | null
  location_label: string | null
  city_label: string | null
  country: string | null
  climate_zone: string | null
  garden_type: string | null
  map_visibility: string
  live_url: string | null
  created_at: string | null
}

async function loadGarden(slug: string) {
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: garden } = await (admin as any)
    .from('flowgarden_gardens')
    .select('id, name, public_bio, description, location_label, city_label, country, climate_zone, garden_type, map_visibility, live_url, created_at')
    .eq('public_slug', slug.toLowerCase())
    .eq('is_public', true)
    .maybeSingle()

  if (!garden) return null
  const g = garden as PublicGarden

  const [zonesRes, plantsRes, eventsRes, productsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_zones')
      .select('id, name, zone_type, sun_exposure, description, map_x, map_y')
      .eq('garden_id', g.id).order('name'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_plant_groups')
      .select('id, name, species, variety, quantity, status, health_status, zone_id')
      .eq('garden_id', g.id).order('name').limit(120),
    // The story, without whoever wrote it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_events')
      .select('id, event_type, title, structured_summary, occurred_at')
      .eq('garden_id', g.id).order('occurred_at', { ascending: false }).limit(8),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('flowgarden_tianguis_products')
      .select('id, name, price_cents, currency, unit, photo_url, category')
      .eq('garden_id', g.id).eq('status', 'available').limit(12),
  ])

  return {
    garden: g,
    zones: zonesRes.data ?? [],
    plants: plantsRes.data ?? [],
    events: eventsRes.data ?? [],
    products: productsRes.data ?? [],
  }
}

/** City-level unless the owner opted into exact placement. */
function publicPlace(g: PublicGarden): string | null {
  if (g.map_visibility === 'exact' || g.map_visibility === 'live') {
    return g.location_label ?? g.city_label ?? g.country ?? null
  }
  return g.city_label ?? g.country ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const data = await loadGarden(slug)
  if (!data) return { title: 'Garden not found · FlowGarden' }
  const { garden, plants } = data
  const place = publicPlace(garden)
  const desc = garden.public_bio
    ?? garden.description
    ?? `A living garden${place ? ` in ${place}` : ''} — ${plural(plants.length, 'plant group')} growing.`
  return {
    title: `${garden.name} · FlowGarden`,
    description: desc.slice(0, 200),
    openGraph: {
      title: `${garden.name} · FlowGarden`,
      description: desc.slice(0, 200),
      type: 'profile',
    },
    // A garden page is meant to be found.
    robots: { index: true, follow: true },
  }
}

const HEALTH_TONE: Record<string, string> = {
  excellent: 'var(--fg-success)', good: 'var(--fg-success)',
  stressed: 'var(--fg-warn)', critical: 'var(--fg-danger)', unknown: 'var(--fg-text-dim)',
}

export default async function PublicGardenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await loadGarden(slug)
  if (!data) notFound()

  const { garden, zones, plants, events, products } = data
  const place = publicPlace(garden)
  const totalPlants = plants.reduce((s: number, p: { quantity?: number }) => s + (p.quantity ?? 1), 0)
  const zoneName = new Map(zones.map((z: { id: string; name: string }) => [z.id, z.name]))
  const since = garden.created_at
    ? new Date(garden.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null

  return (
    <main className="min-h-screen bg-fg-bg">
      <div className="page-narrow space-y-8">

        {/* ── Hero ── */}
        <header className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative shrink-0" style={{ width: 26, height: 26 }}>
              <Image src="/logos/mark/flowgarden-mark-gold-1024.png" alt="" fill className="object-contain" />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--fg-gold)' }}>
              FlowGarden
            </span>
          </div>

          <h1 className="page-title">{garden.name}</h1>
          <p className="page-sub">
            {[place, since ? `growing since ${since}` : null].filter(Boolean).join(' · ')}
          </p>

          {(garden.public_bio || garden.description) && (
            <p className="text-base mt-4 leading-relaxed" style={{ color: 'var(--fg-text-secondary)' }}>
              {garden.public_bio || garden.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-4 flex-wrap text-xs">
            {totalPlants > 0 && <span className="badge-green">🌿 {plural(totalPlants, 'plant')}</span>}
            {zones.length > 0 && <span className="badge-green">🗺 {plural(zones.length, 'zone')}</span>}
            {garden.climate_zone && <span className="badge-gold">{garden.climate_zone}</span>}
            {garden.live_url && (
              <a href={garden.live_url} target="_blank" rel="noopener noreferrer" className="badge-gold hover:underline">
                🔴 Live view
              </a>
            )}
          </div>
        </header>

        {/* ── The map ── */}
        {zones.some((z: { map_x: number | null }) => z.map_x !== null) && (
          <section>
            <h2 className="section-label">The garden</h2>
            <PublicGardenMap zones={zones} />
          </section>
        )}

        {/* ── What's growing ── */}
        {plants.length > 0 && (
          <section>
            <h2 className="section-label">What&rsquo;s growing</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {plants.map((p: {
                id: string; name: string; species: string | null; variety: string | null
                quantity: number; status: string; health_status: string; zone_id: string | null
              }) => (
                <div key={p.id} className="card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--fg-text)' }}>
                        {p.quantity > 1 ? `${p.quantity}× ` : ''}{p.name}
                        {p.variety ? <span style={{ color: 'var(--fg-text-muted)' }}> · {p.variety}</span> : null}
                      </p>
                      {p.species && (
                        <p className="text-xs italic mt-0.5" style={{ color: 'var(--fg-text-muted)' }}>{p.species}</p>
                      )}
                    </div>
                    <span
                      className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                      style={{ backgroundColor: HEALTH_TONE[p.health_status] ?? 'var(--fg-text-dim)' }}
                      title={p.health_status}
                      aria-label={`Health: ${p.health_status}`}
                    />
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--fg-text-muted)' }}>
                    {[p.status.replace(/_/g, ' '), p.zone_id ? zoneName.get(p.zone_id) : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── From the stall ── */}
        {products.length > 0 && (
          <section>
            <h2 className="section-label">From this garden</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map((pr: {
                id: string; name: string; price_cents: number; currency: string; unit: string; photo_url: string | null
              }) => (
                <div key={pr.id} className="card flex flex-col gap-2">
                  <div
                    className="relative w-full rounded-xl overflow-hidden flex items-center justify-center"
                    style={{ aspectRatio: '4 / 3', background: 'linear-gradient(135deg, var(--fg-green-muted), var(--fg-gold-bg))' }}
                  >
                    {pr.photo_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={pr.photo_url} alt={pr.name} className="absolute inset-0 w-full h-full object-cover" />
                      : <span className="text-3xl" aria-hidden>🧺</span>}
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg-text)' }}>{pr.name}</p>
                  <p className="text-xs" style={{ color: 'var(--fg-gold)' }}>
                    {(pr.price_cents / 100).toLocaleString(undefined, { style: 'currency', currency: pr.currency || 'MXN' })}
                    <span style={{ color: 'var(--fg-text-muted)' }}> / {pr.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── The story ── */}
        {events.length > 0 && (
          <section>
            <h2 className="section-label">Recent history</h2>
            <div className="card divide-y p-0" style={{ borderColor: 'var(--fg-border)' }}>
              {events.map((e: { id: string; title: string; structured_summary: string | null; occurred_at: string }) => (
                <div key={e.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium" style={{ color: 'var(--fg-text)' }}>{e.title}</p>
                    <time
                      dateTime={e.occurred_at}
                      className="text-xs shrink-0"
                      style={{ color: 'var(--fg-text-dim)' }}
                    >
                      {new Date(e.occurred_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </time>
                  </div>
                  {e.structured_summary && (
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--fg-text-secondary)' }}>
                      {e.structured_summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Growth loop ── */}
        <footer className="pb-4">
          <div className="card-accent text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--fg-text)' }}>
              This garden is kept with FlowGarden
            </p>
            <p className="text-xs mt-1 mb-4 max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--fg-text-muted)' }}>
              Photograph your own garden and it maps itself — beds, plants, and what they need this week.
            </p>
            <Link href="/welcome" className="btn-primary">Start your garden</Link>
          </div>
        </footer>
      </div>
    </main>
  )
}
