'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { categoryMeta, formatMoney, type TianguisProduct } from '@/lib/tianguis'

type Product = TianguisProduct & { garden_name: string }

interface Quote {
  fee_cents: number
  currency: string
  eta_minutes: number
  distance_m: number
}

export function ProductOrderClient({
  product,
  isOwner,
  buyerEmail,
}: {
  product: Product
  isOwner: boolean
  buyerEmail: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [qty, setQty] = useState(1)
  const [mode, setMode] = useState<'pickup' | 'delivery'>('pickup')
  const [dropoff, setDropoff] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [quoteErr, setQuoteErr] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [placed, setPlaced] = useState<{ id: string; warning: string | null } | null>(null)

  const meta = categoryMeta(product.category)
  const itemCents = product.price_cents * qty
  const feeCents = mode === 'delivery' ? quote?.fee_cents ?? 0 : 0
  const totalCents = itemCents + feeCents

  async function getQuote() {
    setQuoteErr(null)
    setQuote(null)
    if (!dropoff.trim()) { setQuoteErr('Enter a drop-off address first.'); return }
    setQuoting(true)
    try {
      const res = await fetch('/api/flowgarden/tianguis/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, dropoff_label: dropoff }),
      })
      const json = await res.json()
      if (!res.ok) { setQuoteErr(json.error ?? 'Could not get a quote.'); return }
      setQuote(json.quote)
    } catch {
      setQuoteErr('Could not reach the delivery network.')
    } finally {
      setQuoting(false)
    }
  }

  function placeOrder() {
    setError(null)
    if (mode === 'delivery' && !dropoff.trim()) { setError('Drop-off address is required for delivery.'); return }
    startTransition(async () => {
      const res = await fetch('/api/flowgarden/tianguis/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          quantity: qty,
          fulfillment: mode,
          dropoff_label: mode === 'delivery' ? dropoff : null,
          buyer_name: buyerName,
          buyer_phone: buyerPhone,
          notes,
          delivery_fee_cents: quote?.fee_cents,
          delivery_eta_minutes: quote?.eta_minutes,
          delivery_distance_m: quote?.distance_m,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Something went wrong.'); return }
      setPlaced({ id: json.data.id, warning: json.delivery_warning })
    })
  }

  if (placed) {
    return (
      <div className="p-5 md:p-8 max-w-xl mx-auto">
        <div className="card-accent text-center py-12">
          <p className="text-4xl mb-3">✅</p>
          <h1 className="font-display text-2xl font-bold text-fg">Order placed</h1>
          <p className="text-fg-muted text-sm mt-2 max-w-sm mx-auto">
            {mode === 'delivery'
              ? 'A RefiRides rider has been requested for pickup & delivery. Pay cash on handoff.'
              : 'Arrange pickup with the producer. Pay cash on handoff.'}
          </p>
          {placed.warning && (
            <p className="text-xs mt-3 mx-auto max-w-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(245,158,11,0.14)', color: '#b45309' }}>
              {placed.warning}
            </p>
          )}
          <div className="flex gap-2 justify-center mt-6">
            <Link href="/tianguis/mine?tab=bought" className="btn-primary">Track my order</Link>
            <Link href="/tianguis" className="btn-secondary">Back to market</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-5">
      <Link href="/tianguis" className="text-xs text-fg-muted hover:text-fg-gold">← Back to market</Link>

      {/* Product header */}
      <div className="card space-y-4">
        <div
          className="relative w-full rounded-xl overflow-hidden flex items-center justify-center"
          style={{ aspectRatio: '16 / 9', background: 'linear-gradient(135deg, var(--fg-green-muted), var(--fg-gold-bg))' }}
        >
          {product.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.photo_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <span className="text-6xl">{meta.emoji}</span>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="badge-green mb-1">{meta.emoji} {meta.label}</span>
            <h1 className="font-display text-2xl font-bold text-fg leading-tight">{product.name}</h1>
            <p className="text-sm text-fg-muted mt-1">🌿 {product.garden_name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-display text-2xl font-bold text-fg-gold">{formatMoney(product.price_cents, product.currency)}</p>
            <p className="text-xs text-fg-muted">per {product.unit}</p>
          </div>
        </div>

        {product.description && <p className="text-sm text-fg-secondary leading-relaxed">{product.description}</p>}

        <div className="flex flex-wrap gap-4 text-xs text-fg-muted">
          {product.quantity != null && <span>📦 {product.quantity} {product.unit} available</span>}
          {product.harvest_date && <span>🌾 Harvested {product.harvest_date}</span>}
          {product.available_until && <span>⏳ Until {product.available_until}</span>}
          {product.pickup_label && <span>📍 {product.pickup_label}</span>}
        </div>
      </div>

      {isOwner ? (
        <div className="card text-center py-8">
          <p className="text-sm text-fg-muted">This is your listing.</p>
          <Link href="/tianguis/mine" className="btn-secondary mt-3 inline-flex">Manage in My stall</Link>
        </div>
      ) : (
        /* Order panel */
        <div className="card space-y-4">
          <h2 className="font-display text-lg font-bold text-fg">Order</h2>

          {/* Quantity */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-fg-secondary">Quantity ({product.unit})</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} className="btn-secondary px-3">−</button>
              <input
                type="number" min={1} value={qty}
                onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-field-light w-16 text-center"
              />
              <button type="button" onClick={() => setQty(q => q + 1)} className="btn-secondary px-3">＋</button>
            </div>
          </div>

          {/* Fulfillment */}
          <div className="space-y-2">
            <label className="text-sm text-fg-secondary">How do you want it?</label>
            <div className="grid grid-cols-2 gap-2">
              {([['pickup', '🧺 Pickup'], ['delivery', '🛵 Delivery']] as [typeof mode, string][]).map(([m, label]) => {
                const on = mode === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className="py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: on ? 'var(--fg-green)' : 'var(--fg-panel)',
                      color: on ? '#fff' : 'var(--fg-text-secondary)',
                      border: `1px solid ${on ? 'var(--fg-green)' : 'var(--fg-border)'}`,
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-fg-muted">
              {mode === 'pickup'
                ? 'Collect from the producer’s garden. Arrange a time after ordering.'
                : 'A RefiRides rider picks up from the garden and delivers to you.'}
            </p>
          </div>

          {/* Delivery address + quote */}
          {mode === 'delivery' && (
            <div className="space-y-2 rounded-xl p-3" style={{ backgroundColor: 'var(--fg-panel)', border: '1px solid var(--fg-border)' }}>
              <label className="block text-xs text-fg-secondary">Drop-off address</label>
              <div className="flex gap-2">
                <input
                  className="input-field-light flex-1"
                  value={dropoff}
                  onChange={e => { setDropoff(e.target.value); setQuote(null) }}
                  placeholder="Street, number, neighborhood, city"
                />
                <button type="button" onClick={getQuote} disabled={quoting} className="btn-secondary whitespace-nowrap">
                  {quoting ? '…' : 'Get quote'}
                </button>
              </div>
              {quoteErr && <p className="text-xs text-red-600">{quoteErr}</p>}
              {quote && (
                <div className="flex items-center justify-between text-sm pt-1">
                  <span className="text-fg-secondary">🛵 Rider quote</span>
                  <span className="font-semibold text-fg">
                    {formatMoney(quote.fee_cents, quote.currency)} · ~{quote.eta_minutes} min · {(quote.distance_m / 1000).toFixed(1)} km
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Buyer contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Your name</label>
              <input className="input-field-light" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Name for the producer" />
            </div>
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Phone</label>
              <input className="input-field-light" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="For pickup / rider" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-fg-secondary mb-1">Notes (optional)</label>
            <textarea className="input-field resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything the producer should know…" />
          </div>

          {/* Totals */}
          <div className="space-y-1 pt-2" style={{ borderTop: '1px solid var(--fg-border)' }}>
            <div className="flex justify-between text-sm text-fg-secondary">
              <span>Subtotal ({qty} {product.unit})</span><span>{formatMoney(itemCents, product.currency)}</span>
            </div>
            {mode === 'delivery' && (
              <div className="flex justify-between text-sm text-fg-secondary">
                <span>Delivery {quote ? '' : '(quote to see)'}</span>
                <span>{quote ? formatMoney(feeCents, product.currency) : '—'}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-fg pt-1">
              <span>Total</span><span>{formatMoney(totalCents, product.currency)}</span>
            </div>
            <p className="text-[11px] text-fg-muted">💵 Pay cash on handoff · buyer: {buyerEmail}</p>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button onClick={placeOrder} disabled={isPending} className="btn-primary w-full justify-center">
            {isPending ? 'Placing…' : `Place order · ${formatMoney(totalCents, product.currency)}`}
          </button>
        </div>
      )}
    </div>
  )
}
