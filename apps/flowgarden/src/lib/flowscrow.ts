// SERVER-ONLY — bridge from FlowGarden's Tianguis to the FlowScrow escrow service.
//
// FlowScrow is an independent, source-agnostic escrow/deal service (its own app +
// deploy). The Tianguis uses it to HOLD a buyer's payment when an order is placed
// and RELEASE it to the producer once the order is fulfilled (delivery/handoff
// confirmed) — or VOID it back to the buyer on cancellation. We talk to it over
// HTTP only, exactly like the RefiRides delivery bridge: no shared imports, no
// shared DB coupling.
//
// Dormant by default: if FLOWSCROW_API_URL is unset the integration is a no-op —
// orders are placed normally with no hold. Set the env var (once FlowScrow is
// deployed and exposes /api/escrow/*) to activate it. Every call is non-fatal and
// short-timeout so a slow or down escrow service never blocks an order.

const FLOWSCROW_API = process.env.FLOWSCROW_API_URL?.replace(/\/$/, '') || null

/** True when an escrow backend is configured. Callers can skip work when false. */
export function escrowEnabled(): boolean {
  return FLOWSCROW_API !== null
}

export interface EscrowParty {
  /** FlowBond identity (auth.uid in the canonical model). */
  fbid?: string | null
  name?: string | null
}

export interface EscrowHold {
  /** FlowScrow's escrow/deal id. */
  id: string
  status: string
}

interface OpenInput {
  /** Stable reference for idempotency — the Tianguis order id. */
  reference: string
  amount_cents: number
  currency: string
  payer: EscrowParty // buyer
  payee: EscrowParty // producer
  description?: string
  /** What the escrow releases on, for the FlowScrow side to record. */
  release_on?: 'fulfilled' | 'delivery_confirmed' | 'pickup_confirmed'
}

async function call(path: string, body: unknown, timeoutMs: number): Promise<EscrowHold | null> {
  if (!FLOWSCROW_API) return null
  try {
    const res = await fetch(`${FLOWSCROW_API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'flowgarden', ...(body as object) }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const d = await res.json()
    if (!d?.ok || !d?.id) return null
    return { id: d.id, status: d.status ?? 'held' }
  } catch {
    return null
  }
}

/** Open an escrow hold for an order. Returns the hold, or null if disabled/unreachable. */
export function openEscrow(input: OpenInput): Promise<EscrowHold | null> {
  return call('/api/escrow/open', { ...input, idempotency_key: input.reference }, 10000)
}

/** Release a held escrow to the producer (order fulfilled). Non-fatal. */
export function releaseEscrow(input: { reference: string; escrow_id?: string | null; reason?: string }): Promise<EscrowHold | null> {
  return call('/api/escrow/release', input, 8000)
}

/** Void a held escrow back to the buyer (order canceled). Non-fatal. */
export function voidEscrow(input: { reference: string; escrow_id?: string | null; reason?: string }): Promise<EscrowHold | null> {
  return call('/api/escrow/void', input, 8000)
}
