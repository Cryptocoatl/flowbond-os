// SERVER-ONLY — bridge from FlowGarden's Tianguis to the RefiRides delivery network.
// RefiRides exposes a public dispatch API (quote + create) backed by its own
// `refirides` schema in the same canonical Supabase project, so we simply call it
// over HTTP and store the returned job id on the order. Failures are non-fatal:
// the order is still placed and delivery is marked "pending" for manual dispatch.

const REFIRIDES_API = (process.env.REFIRIDES_API_URL || 'https://refirides-sigma.vercel.app').replace(/\/$/, '')

export interface GeoPoint {
  lat?: number
  lng?: number
  address?: string
  name?: string
  phone?: string
}

export interface DeliveryQuote {
  provider: string
  fee_cents: number
  currency: string
  eta_minutes: number
  distance_m: number
}

export interface DeliveryJob {
  /** Supabase refirides.deliveries.id */
  id: string
  provider: string
  external_id: string | null
  status: string
  tracking_url: string | null
  quote: DeliveryQuote | null
}

interface Manifest {
  description?: string
  value_cents?: number
  weight_g?: number
}

/** Ask RefiRides for a price + ETA between two points. Returns null on any failure. */
export async function quoteDelivery(input: {
  pickup: GeoPoint
  dropoff: GeoPoint
  manifest?: Manifest
  provider?: string
}): Promise<{ quote: DeliveryQuote; points: { pickup: GeoPoint; dropoff: GeoPoint }; provider: string } | null> {
  try {
    const res = await fetch(`${REFIRIDES_API}/api/delivery/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      // never block the FlowGarden request for more than a few seconds
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const d = await res.json()
    if (!d?.ok || !d?.quote) return null
    return { quote: d.quote, points: d.points, provider: d.provider }
  } catch {
    return null
  }
}

/** Dispatch a delivery job on RefiRides. Returns the job (incl. Supabase id) or null. */
export async function createDelivery(input: {
  fbid?: string | null
  provider?: string
  pickup: GeoPoint
  dropoff: GeoPoint
  quote?: DeliveryQuote
  manifest?: Manifest
  reference?: string
  payment?: { id?: string; provider?: string }
}): Promise<DeliveryJob | null> {
  try {
    const res = await fetch(`${REFIRIDES_API}/api/delivery/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const d = await res.json()
    if (!d?.ok || !d?.id) return null
    return {
      id: d.id,
      provider: d.job?.provider ?? input.provider ?? 'self_dispatch',
      external_id: d.job?.external_id ?? null,
      status: d.job?.status ?? 'requested',
      tracking_url: d.job?.tracking_url ?? null,
      quote: d.job?.quote ?? input.quote ?? null,
    }
  } catch {
    return null
  }
}
