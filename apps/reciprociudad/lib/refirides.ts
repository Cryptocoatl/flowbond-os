/**
 * RefiRides delivery client — routes Sani Templo cubeta (full-bucket) pickups
 * through the RefiRides logistics network (self-dispatch by default, no creds).
 *
 * Flow: quote (geocodes addresses → points + price) then create (persists the
 * job). Server-only; called from app/api/sani/pickup.
 */
const BASE =
  process.env.REFIRIDES_URL ||
  process.env.NEXT_PUBLIC_REFIRIDES_URL ||
  'https://refirides-sigma.vercel.app';

export interface GeoPoint {
  address?: string;
  lat?: number;
  lng?: number;
}

export interface QuoteResult {
  ok: boolean;
  provider?: string;
  quote?: unknown;
  points?: { pickup: GeoPoint; dropoff: GeoPoint };
}

export interface CreateResult {
  ok: boolean;
  id?: string | null;
  job?: { external_id?: string; [k: string]: unknown };
}

export async function refiridesQuote(pickup: GeoPoint, dropoff: GeoPoint): Promise<QuoteResult> {
  const r = await fetch(`${BASE}/api/delivery/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pickup, dropoff }),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`refirides quote ${r.status}`);
  return r.json();
}

export async function refiridesCreate(args: {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  quote?: unknown;
  provider?: string;
  manifest?: Record<string, unknown>;
  fbid?: string | null;
}): Promise<CreateResult> {
  const r = await fetch(`${BASE}/api/delivery/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`refirides create ${r.status}`);
  return r.json();
}
