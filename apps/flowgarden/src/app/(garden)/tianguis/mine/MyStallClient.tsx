'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { EditModal } from '@/components/garden/EditModal'
import {
  CATEGORIES, UNITS, categoryMeta, formatMoney,
  DELIVERY_STATUS_LABELS, type TianguisProduct, type TianguisOrder,
} from '@/lib/tianguis'

type Order = TianguisOrder & { product_name: string }

interface Props {
  products: TianguisProduct[]
  received: Order[]
  bought: Order[]
  gardenName: string
  gardenLocation: string
}

type Tab = 'listings' | 'received' | 'bought'

const emptyForm = {
  name: '', category: 'vegetables', description: '',
  quantity: 1, unit: 'kg', price: '', photo_url: '',
  pickup_label: '', harvest_date: '', available_until: '', status: 'active',
}

const ORDER_STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'Pending',   bg: 'rgba(245,158,11,0.14)', color: '#b45309' },
  confirmed: { label: 'Confirmed', bg: 'var(--fg-green-muted)',  color: 'var(--fg-green)' },
  fulfilled: { label: 'Fulfilled', bg: 'var(--fg-green-muted)',  color: 'var(--fg-green)' },
  canceled:  { label: 'Canceled',  bg: 'rgba(220,106,91,0.12)',  color: '#dc6a5b' },
}

export function MyStallClient({ products, received, bought, gardenName, gardenLocation }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'listings')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<TianguisProduct | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Deep-link: ?new=1 opens the create modal once.
  useEffect(() => {
    if (params.get('new') === '1') { openAdd(); router.replace('/tianguis/mine') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const f = (field: keyof typeof form, val: string | number) => setForm(prev => ({ ...prev, [field]: val }))

  function openAdd() {
    setForm({ ...emptyForm, pickup_label: gardenLocation })
    setEditing(null); setError(null); setModal('add')
  }
  function openEdit(p: TianguisProduct) {
    setForm({
      name: p.name, category: p.category, description: p.description ?? '',
      quantity: p.quantity, unit: p.unit, price: String((p.price_cents ?? 0) / 100),
      photo_url: p.photo_url ?? '', pickup_label: p.pickup_label ?? '',
      harvest_date: p.harvest_date ?? '', available_until: p.available_until ?? '', status: p.status,
    })
    setEditing(p); setError(null); setModal('edit')
  }
  function closeModal() { setModal(null); setEditing(null); setError(null) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    startTransition(async () => {
      const url = editing ? `/api/flowgarden/tianguis/products/${editing.id}` : '/api/flowgarden/tianguis/products'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, category: form.category, description: form.description,
          quantity: Number(form.quantity), unit: form.unit,
          price_cents: Math.round((parseFloat(form.price) || 0) * 100),
          photo_url: form.photo_url, pickup_label: form.pickup_label,
          harvest_date: form.harvest_date || null, available_until: form.available_until || null,
          status: form.status,
        }),
      })
      if (!res.ok) { const j = await res.json(); setError(j.error ?? 'Something went wrong'); return }
      closeModal(); router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await fetch(`/api/flowgarden/tianguis/products/${id}`, { method: 'DELETE' })
      setConfirmDelete(null); router.refresh()
    })
  }

  function setOrderStatus(id: string, status: string) {
    startTransition(async () => {
      await fetch(`/api/flowgarden/tianguis/orders/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    })
  }

  const tabs = useMemo(() => ([
    ['listings', `My listings (${products.length})`],
    ['received', `Orders received (${received.length})`],
    ['bought', `My orders (${bought.length})`],
  ] as [Tab, string][]), [products.length, received.length, bought.length])

  return (
    <div className="p-5 md:p-8 max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/tianguis" className="text-xs text-fg-muted hover:text-fg-gold">← Market</Link>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-fg mt-1">My stall</h1>
          <p className="text-sm text-fg-muted mt-1">🌿 {gardenName}</p>
        </div>
        <button onClick={openAdd} className="btn-primary shrink-0">
          <span className="text-base leading-none">＋</span> Sell something
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map(([key, label]) => {
          const on = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
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

      {/* LISTINGS */}
      {tab === 'listings' && (
        products.length === 0 ? (
          <EmptyState emoji="🧺" title="No listings yet" body="List your first product so buyers can find it in the tianguis." cta={<button onClick={openAdd} className="btn-primary">List a product</button>} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p => {
              const meta = categoryMeta(p.category)
              return (
                <div key={p.id} className="card flex flex-col gap-2">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg, var(--fg-green-muted), var(--fg-gold-bg))' }}>
                      {meta.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-fg leading-tight truncate">{p.name}</h3>
                      <p className="text-xs text-fg-muted">{formatMoney(p.price_cents, p.currency)} / {p.unit}</p>
                    </div>
                    <span className="badge shrink-0" style={{
                      backgroundColor: p.status === 'active' ? 'var(--fg-green-muted)' : 'var(--fg-panel)',
                      color: p.status === 'active' ? 'var(--fg-green)' : 'var(--fg-text-secondary)',
                    }}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-auto pt-1">
                    <button onClick={() => openEdit(p)} className="text-xs font-medium text-fg-gold hover:underline">Edit</button>
                    <Link href={`/tianguis/${p.id}`} className="text-xs font-medium text-fg-muted hover:text-fg-gold">View</Link>
                    <button onClick={() => setConfirmDelete(p.id)} className="text-xs font-medium text-fg-muted hover:text-red-500 transition-colors">Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ORDERS RECEIVED (producer) */}
      {tab === 'received' && (
        received.length === 0 ? (
          <EmptyState emoji="📥" title="No orders yet" body="When someone buys from your stall, their orders show up here." />
        ) : (
          <div className="space-y-3">
            {received.map(o => <OrderCard key={o.id} order={o} role="producer" onStatus={setOrderStatus} pending={isPending} />)}
          </div>
        )
      )}

      {/* MY ORDERS (buyer) */}
      {tab === 'bought' && (
        bought.length === 0 ? (
          <EmptyState emoji="🛒" title="No orders placed" body="Browse the market and place your first order." cta={<Link href="/tianguis" className="btn-primary">Go to market</Link>} />
        ) : (
          <div className="space-y-3">
            {bought.map(o => <OrderCard key={o.id} order={o} role="buyer" onStatus={setOrderStatus} pending={isPending} />)}
          </div>
        )
      )}

      {/* Add / Edit listing modal */}
      {modal && (
        <EditModal title={modal === 'add' ? 'Sell something' : 'Edit listing'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Product name *</label>
              <input className="input-field-light" value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Cherry tomatoes" required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-fg-secondary mb-1">Category</label>
                <select className="input-field-light" value={form.category} onChange={e => f('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-fg-secondary mb-1">Status</label>
                <select className="input-field-light" value={form.status} onChange={e => f('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="sold_out">Sold out</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-fg-secondary mb-1">Price (MXN)</label>
                <input type="number" min={0} step="0.01" className="input-field-light" value={form.price} onChange={e => f('price', e.target.value)} placeholder="45.00" />
              </div>
              <div>
                <label className="block text-xs text-fg-secondary mb-1">Per</label>
                <select className="input-field-light" value={form.unit} onChange={e => f('unit', e.target.value)}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-fg-secondary mb-1">Available</label>
                <input type="number" min={0} step="0.01" className="input-field-light" value={form.quantity} onChange={e => f('quantity', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Pickup location</label>
              <input className="input-field-light" value={form.pickup_label} onChange={e => f('pickup_label', e.target.value)} placeholder="Where riders/buyers collect" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-fg-secondary mb-1">Harvest date</label>
                <input type="date" className="input-field-light" value={form.harvest_date} onChange={e => f('harvest_date', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-fg-secondary mb-1">Available until</label>
                <input type="date" className="input-field-light" value={form.available_until} onChange={e => f('available_until', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Photo URL (optional)</label>
              <input className="input-field-light" value={form.photo_url} onChange={e => f('photo_url', e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Description</label>
              <textarea className="input-field resize-none" rows={3} value={form.description} onChange={e => f('description', e.target.value)} placeholder="Tell buyers about it…" />
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={closeModal} className="flex-1 btn-secondary justify-center">Cancel</button>
              <button type="submit" disabled={isPending} className="flex-1 btn-primary justify-center">
                {isPending ? 'Saving…' : modal === 'add' ? 'List it' : 'Save changes'}
              </button>
            </div>
          </form>
        </EditModal>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <EditModal title="Delete listing?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-fg-secondary mb-4">This permanently removes the listing. Existing orders are kept.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 btn-secondary justify-center">Cancel</button>
            <button onClick={() => handleDelete(confirmDelete)} disabled={isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors">
              {isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </EditModal>
      )}
    </div>
  )
}

function EmptyState({ emoji, title, body, cta }: { emoji: string; title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="card-accent text-center py-16">
      <p className="text-4xl mb-3">{emoji}</p>
      <p className="text-fg font-semibold">{title}</p>
      <p className="text-fg-muted text-sm mt-1 mb-5 max-w-xs mx-auto">{body}</p>
      {cta}
    </div>
  )
}

function OrderCard({
  order, role, onStatus, pending,
}: {
  order: Order
  role: 'producer' | 'buyer'
  onStatus: (id: string, status: string) => void
  pending: boolean
}) {
  const st = ORDER_STATUS_STYLE[order.status] ?? ORDER_STATUS_STYLE.pending
  const isDelivery = order.fulfillment === 'delivery'
  const delLabel = order.delivery_status ? (DELIVERY_STATUS_LABELS[order.delivery_status] ?? order.delivery_status) : null

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-fg leading-tight truncate">{order.product_name}</h3>
          <p className="text-xs text-fg-muted">
            {order.quantity} {order.unit} · {formatMoney(order.total_cents, order.currency)} · {isDelivery ? '🛵 Delivery' : '🧺 Pickup'}
          </p>
        </div>
        <span className="badge shrink-0" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
      </div>

      {/* Contact / address */}
      <div className="text-xs text-fg-secondary space-y-0.5">
        {role === 'producer' && (order.buyer_name || order.buyer_phone) && (
          <p>👤 {order.buyer_name || 'Buyer'}{order.buyer_phone ? ` · ${order.buyer_phone}` : ''}</p>
        )}
        {isDelivery && order.dropoff_label && <p>📍 {order.dropoff_label}</p>}
        {isDelivery && delLabel && (
          <p>
            🛵 {delLabel}
            {order.delivery_tracking_url && (
              <> · <a href={order.delivery_tracking_url} target="_blank" rel="noreferrer" className="text-fg-gold hover:underline">track</a></>
            )}
          </p>
        )}
        {order.notes && <p className="italic">“{order.notes}”</p>}
        <p className="text-fg-muted">💵 Pay cash on handoff</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap mt-1 pt-1" style={{ borderTop: '1px solid var(--fg-border)' }}>
        {role === 'producer' && order.status === 'pending' && (
          <button onClick={() => onStatus(order.id, 'confirmed')} disabled={pending} className="text-xs font-medium text-fg-gold hover:underline">Confirm</button>
        )}
        {role === 'producer' && (order.status === 'pending' || order.status === 'confirmed') && (
          <button onClick={() => onStatus(order.id, 'fulfilled')} disabled={pending} className="text-xs font-medium text-fg-gold hover:underline">Mark fulfilled</button>
        )}
        {order.status !== 'canceled' && order.status !== 'fulfilled' && (
          <button onClick={() => onStatus(order.id, 'canceled')} disabled={pending} className="text-xs font-medium text-fg-muted hover:text-red-500 transition-colors">Cancel</button>
        )}
      </div>
    </div>
  )
}
